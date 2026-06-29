import { useState } from "react";
import "./App.css";

function App() {
  // --- State: data React watches; changing it re-renders the screen ---
  const [text, setText] = useState("");        // the ticket the user pastes
  const [result, setResult] = useState(null);  // the parsed analysis object
  const [error, setError] = useState("");       // any error message to show
  const [loading, setLoading] = useState(false);

  // Runs when the Analyze button is clicked.
  async function handleSubmit() {
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text }),
      });

      const data = await res.json();

      // If the backend returned an error code (400, 502, etc.),
      // FastAPI puts the message in data.detail. Show it instead of crashing.
      if (!res.ok) {
        setError(data.detail || "Something went wrong on the server.");
      } else {
        setResult(data);
      }
    } catch (err) {
      // This fires only if the backend is unreachable (server not running).
      setError("Could not reach the backend. Is uvicorn running?");
    }

    setLoading(false);
  }

  return (
    <div className="container">
      <h1>InboxIQ</h1>
      <p className="subtitle">Paste a customer support message to triage it.</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a support ticket here..."
        rows={6}
      />

      <button onClick={handleSubmit} disabled={loading || !text.trim()}>
        {loading ? "Analyzing..." : "Analyze Ticket"}
      </button>

      {/* Error message, only shown if there is one */}
      {error && <p className="error">{error}</p>}

      {/* Result card, only drawn once we have a result */}
      {result && (
        <div className="card">
          <p><strong>Category:</strong> {result.category}</p>
          <p><strong>Priority:</strong> {result.priority}</p>

          <strong>Key details:</strong>
          <ul>
            {result.key_details.map((detail, i) => (
              <li key={i}>{detail}</li>
            ))}
          </ul>

          <strong>Suggested reply:</strong>
          <p className="reply">{result.draft_reply}</p>
        </div>
      )}
    </div>
  );
}

export default App;