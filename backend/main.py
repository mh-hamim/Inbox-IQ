import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI, OpenAIError
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

# Load OPENAI_API_KEY from backend/.env into the environment.
load_dotenv()

# Fail loudly at startup if the key is missing, instead of on first request.
if not os.getenv("OPENAI_API_KEY"):
    raise RuntimeError("OPENAI_API_KEY not found. Check backend/.env")

# The SDK automatically reads OPENAI_API_KEY from the environment.
client = OpenAI()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Locked Phase 1 decisions (change here if you disagree)
# ---------------------------------------------------------------------------

CATEGORIES = ["Billing", "Technical", "Account", "Complaint", "General"]
PRIORITIES = ["High", "Medium", "Low"]
REPLY_TONE = "warm but professional"

# Cheap, fast, reliable for structured JSON. ~$0.15 / 1M input tokens.
MODEL = "gpt-4o-mini"

# ---------------------------------------------------------------------------
# Data shapes
# ---------------------------------------------------------------------------


class TicketInput(BaseModel):
    text: str


class TicketAnalysis(BaseModel):
    category: str
    priority: str
    key_details: list[str]
    draft_reply: str


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = f"""You are a support ticket triage assistant. You read a raw \
customer support message and return a structured analysis.

Rules:
- category MUST be exactly one of: {", ".join(CATEGORIES)}
- priority MUST be exactly one of: {", ".join(PRIORITIES)}
  - High: customer is blocked, angry, losing money, or a deadline is at risk
  - Medium: a real problem but the customer can still function
  - Low: questions, minor requests, or general feedback
- key_details: 2 to 4 short bullet strings capturing the facts that matter \
(account info, error messages, what they tried, what they want). No fluff.
- draft_reply: a ready-to-send reply in a {REPLY_TONE} tone. Address their \
specific issue, acknowledge any frustration, and state a clear next step. \
Do not invent facts (refund amounts, timelines) you were not given.

Respond with ONLY a valid JSON object in this exact shape:
{{"category": "...", "priority": "...", "key_details": ["...", "..."], \
"draft_reply": "..."}}"""


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.post("/analyze", response_model=TicketAnalysis)
def analyze(ticket: TicketInput):
    if not ticket.text.strip():
        raise HTTPException(status_code=400, detail="Ticket text is empty.")

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            # JSON mode: the model is guaranteed to return valid JSON.
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": ticket.text},
            ],
        )
    except OpenAIError as e:
        # Bad key, rate limit, no credit, etc. Surface a clean error.
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {e}")

    raw = completion.choices[0].message.content

    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(
            status_code=502,
            detail="Model returned invalid JSON.",
        )

    # Guard against the model drifting outside the allowed sets.
    if data.get("category") not in CATEGORIES:
        data["category"] = "General"
    if data.get("priority") not in PRIORITIES:
        data["priority"] = "Medium"

    return data