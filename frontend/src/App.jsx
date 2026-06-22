import { useState } from "react";
import "./App.css";

function App() {
  // "state" = data React watches. When it changes, the screen updates.
  const [text, setText] = useState("");        // what the user types
  const [response, setResponse] = useState(""); // what the backend sends back
  const [loading, setLoading] = useState(false);

  // This function runs when the button is clicked.
  async function handleSubmit() {
    setLoading(true);
    setResponse("");
    try {
      const res = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text }),
      });
      const data = await res.json();
      setResponse(data.message + " You sent: " + data.received);
    } catch (err) {
      setResponse("Could not reach the backend. Is it running?");
    }
    setLoading(false);
  }

  return (
    <div className="container">
      <h1>InboxIQ — Connection Test</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type anything here..."
        rows={5}
      />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Sending..." : "Send to Backend"}
      </button>
      {response && <p className="result">{response}</p>}
    </div>
  );
}

export default App;