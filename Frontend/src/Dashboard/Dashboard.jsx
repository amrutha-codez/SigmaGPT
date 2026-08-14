import "./Dashboard.css";
import { useEffect, useState } from "react";
import api from "../services/api.js";
import Card from "../components/Card.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import ScoreCard from "../components/ScoreCard.jsx";

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/dashboard");
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to load dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="dashboard">
        <p className="dashboard-status">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <p className="dashboard-status error">{error}</p>
        <button className="retry-btn" onClick={loadDashboard}>
          Retry
        </button>
      </div>
    );
  }

  const {
    overallScore,
    skills,
    weakTopics,
    strongTopics,
    recommendedTopics,
    streak,
    goals,
    recentActivity,
    aiInsights,
  } = data;

  return (
    <div className="dashboard">
      <h1>📊 Skill Progress Dashboard</h1>

      <div className="dashboard-top-row">
        <ScoreCard label="Overall Score" score={overallScore} />
        <div className="ui-score-card">
          <div className="ui-score-value">
            {streak} day{streak === 1 ? "" : "s"}
          </div>
          <div className="ui-score-label">🔥 Streak</div>
        </div>
        <div className="ui-score-card">
          <div className="ui-score-value">
            {goals.filter((g) => g.completed).length}/{goals.length}
          </div>
          <div className="ui-score-label">🎯 Goals Completed</div>
        </div>
      </div>

      <Card title="Skill Scores">
        <div className="skills-grid">
          {skills.map((skill) => (
            <div key={skill.name} className="skill-item">
              <ProgressBar label={skill.name} value={skill.score} />
              {skill.previousScore !== skill.score && (
                <span className={`skill-delta ${skill.score > skill.previousScore ? "up" : "down"}`}>
                  {skill.score > skill.previousScore ? "▲" : "▼"}{" "}
                  {Math.abs(skill.score - skill.previousScore)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {aiInsights?.summary && (
        <Card title="🤖 AI Insights" className="ai-insights-card">
          <p>{aiInsights.summary}</p>
          {aiInsights.recommendations?.length > 0 && (
            <ul>
              {aiInsights.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className="dashboard-two-col">
        <Card title="⚠️ Weak Areas">
          {weakTopics.length === 0 ? (
            <p className="empty-state">No data yet — start practicing to see weak areas.</p>
          ) : (
            <ul>
              {weakTopics.map((t, idx) => (
                <li key={idx}>
                  {t.skill} → {t.topic} ({t.accuracy}%)
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="💪 Strong Areas">
          {strongTopics.length === 0 ? (
            <p className="empty-state">No data yet — start practicing to see strong areas.</p>
          ) : (
            <ul>
              {strongTopics.map((t, idx) => (
                <li key={idx}>
                  {t.skill} → {t.topic} ({t.accuracy}%)
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="📌 Recommended Next Topics">
        {recommendedTopics.length === 0 ? (
          <p className="empty-state">Nothing to recommend yet.</p>
        ) : (
          <ul>
            {recommendedTopics.map((r, idx) => (
              <li key={idx}>
                {r.skill} → {r.topic} <span className="reason">({r.reason})</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="🕓 Recent Activity">
        {recentActivity.length === 0 ? (
          <p className="empty-state">No activity yet.</p>
        ) : (
          <ul className="activity-list">
            {recentActivity.map((a) => (
              <li key={a._id}>
                <span className={a.correct ? "correct" : "incorrect"}>{a.correct ? "✔" : "✘"}</span>{" "}
                {a.skill} — {a.topic} ({a.difficulty})
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default Dashboard;