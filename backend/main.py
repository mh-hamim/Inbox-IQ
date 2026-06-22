from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# This lets your React app (running on a different port) talk to this backend.
# Without it, the browser blocks the request for security reasons.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # the React dev server address
    allow_methods=["*"],
    allow_headers=["*"],
)


# Defines the shape of incoming data: we expect a JSON object with a "text" field.
class TicketInput(BaseModel):
    text: str


@app.get("/")
def health_check():
    # A simple endpoint to confirm the server is alive.
    return {"status": "ok"}


@app.post("/analyze")
def analyze(ticket: TicketInput):
    # For Phase 0, we just echo the text back so we can test the connection.
    # In Phase 1, this is where the AI logic goes.
    return {
        "received": ticket.text,
        "message": "Backend connected successfully.",
    }