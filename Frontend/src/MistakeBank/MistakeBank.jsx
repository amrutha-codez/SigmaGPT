import "./MistakeBank.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api.js";
import Card from "../components/Card.jsx";

const STATUS_LABELS = {
  needs_revision: "⚠️ Needs Revision",
  in_progress: "📖 Revision In Progress",
  resolved: "✅ Resolved",
};

function MistakeBank() {
  const navigate = useNavigate();
  const [mistakes, setMistakes] = useState([]);
  const [repeated, setRepeated] = useState([]);
  const [aiInsight, setAiInsight] = useState("");
  const [statusFilter, setStatusFilter] = useState("needs_revision");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revisingId, setRevisingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mistakesRes, repeatedRes] = await Promise.all([
        api.get("/mistakes", { params: statusFilter ? { status: statusFilter } : {} }),
        api.get("/mistakes/repeated"),
      ]);
      setMistakes(mistakesRes.data.mistakes);
      setRepeated(repeatedRes.data.mistakes);
      setAiInsight(repeatedRes.data.aiInsight);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load mistake bank.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const startRevision = async (mistakeId) => {
    setRevisingId(mistakeId);
    setError(null);
    try {
      const res = await api.post(`/mistakes/${mistakeId}/revise`);
      navigate(`/study?resume=${res.data.sessionId}`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to start revision.");
      setRevisingId(null);
    }
  };

  const dismissMistake = async (mistakeId) => {
    try {
      await api.post(`/mistakes/${mistakeId}/resolve`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to dismiss mistake.");
    }
  };

  return (
    <div className="mistake-bank">
      <h1>🧠 Mistake Bank</h1>
      {error && <p className="mb-error">{error}</p>}

      {repeated.length > 0 && (
        <Card title="🔁 Repeated Struggles" className="mb-repeated-card">
          <p>{aiInsight}</p>
          <ul>
            {repeated.map((m) => (
              <li key={m._id}>
                {m.skill} → {m.topic} ({m.attempts} attempts)
                <button className="mb-revise-btn" onClick={() => startRevision(m._id)} disabled={revisingId === m._id}>
                  {revisingId === m._id ? "Preparing..." : "Start Revision"}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="All Mistakes">
        <div className="mb-filter-row">
          {["needs_revision", "in_progress", "resolved", ""].map((s) => (
            <button key={s || "all"} className={`mb-filter-btn ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
              {s ? STATUS_LABELS[s] : "All"}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="empty-state">Loading...</p>
        ) : mistakes.length === 0 ? (
          <p className="empty-state">No mistakes here — nice work.</p>
        ) : (
          <ul className="mb-mistake-list">
            {mistakes.map((m) => (
              <li key={m._id} className="mb-mistake-item">
                <div className="mb-mistake-header">
                  <strong>{m.skill} → {m.topic}</strong>
                  <span className="mb-status-tag">{STATUS_LABELS[m.status]}</span>
                </div>
                <p className="mb-question">{m.questionOrProblem}</p>
                {m.explanation && <p className="mb-explanation">💡 {m.explanation}</p>}
                <div className="mb-mistake-footer">
                  <span>Attempts: {m.attempts}</span>
                  <span>{m.mistakeType}</span>
                  {m.status !== "resolved" && (
                    <>
                      <button className="mb-revise-btn" onClick={() => startRevision(m._id)} disabled={revisingId === m._id}>
                        {revisingId === m._id ? "Preparing..." : "Start Revision"}
                      </button>
                      <button className="mb-dismiss-btn" onClick={() => dismissMistake(m._id)}>Dismiss</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default MistakeBank;