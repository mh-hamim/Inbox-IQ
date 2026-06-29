import { useState, useEffect } from "react";
import "./App.css";

// Maps each priority to its dot color + pill style class.
const PRIORITY_STYLES = {
  High: "priority-high",
  Medium: "priority-medium",
  Low: "priority-low",
};

function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [editedReply, setEditedReply] = useState(""); // the editable draft
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // When a new result arrives, seed the editable reply box with the AI draft.
  // useEffect runs after render whenever `result` changes.
  useEffect(() => {
    if (result) {
      setEditedReply(result.draft_reply);
    }
  }, [result]);

  async function handleSubmit() {
    setLoading(true);
    setResult(null);
    setError("");
    setCopied(false);

    try {
      const res = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Something went wrong on the server.");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Could not reach the backend. Is the server running?");
    }

    setLoading(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(editedReply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Couldn't copy to clipboard.");
    }
  }

  const priorityClass = result
    ? PRIORITY_STYLES[result.priority] || "priority-medium"
    : "";

  return (
    <div className="page">
      <main className="container">
        <header className="head">
          <h1>InboxIQ</h1>
          <p className="subtitle">
            Paste a customer support message and get an instant triage:
            category, priority, the key facts, and a ready-to-send reply.
          </p>
        </header>

        <section className="input-block">
          <label htmlFor="ticket" className="label">
            Support message
          </label>
          <textarea
            id="ticket"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. I was charged twice this month and need this fixed today..."
            rows={6}
          />
          <button
            className="analyze-btn"
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
          >
            {loading ? "Analyzing..." : "Analyze ticket"}
          </button>
        </section>

        {error && <p className="error">{error}</p>}

        {result && (
          <section className="card">
            <div className="badges">
              <span className={`badge priority ${priorityClass}`}>
                <span className="dot" />
                {result.priority} priority
              </span>
              <span className="badge category">{result.category}</span>
            </div>

            <div className="details">
              <p className="label">Key details</p>
              <ul>
                {result.key_details.map((detail, i) => (
                  <li key={i}>{detail}</li>
                ))}
              </ul>
            </div>

            <div className="reply-block">
              <div className="reply-head">
                <p className="label">Suggested reply</p>
                <button className="copy-btn" onClick={handleCopy}>
                  {copied ? "Copied" : "Copy reply"}
                </button>
              </div>
              <textarea
                className="reply-edit"
                value={editedReply}
                onChange={(e) => setEditedReply(e.target.value)}
                rows={10}
              />
              <p className="hint">Edit the reply before sending.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;