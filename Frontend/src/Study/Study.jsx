import "./Study.css";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api.js";
import Card from "../components/Card.jsx";
import { SKILL_NAMES } from "../constants/skills.js";

function Study() {
  const [searchParams] = useSearchParams();
  const resumeSessionId = searchParams.get("resume");

  const [step, setStep] = useState("setup");
  const [subject, setSubject] = useState(SKILL_NAMES[0]);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");

  const [session, setSession] = useState(null);
  const [mcqAnswers, setMcqAnswers] = useState([]);
  const [miniTestAnswers, setMiniTestAnswers] = useState([]);
  const [codingSubmission, setCodingSubmission] = useState("");

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!resumeSessionId) return;
    const loadResumeSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/study/${resumeSessionId}`);
        setSession(res.data);
        setMcqAnswers(new Array(res.data.mcqs.length).fill(-1));
        setMiniTestAnswers(new Array(res.data.miniTest.length).fill(-1));
        setStep("content");
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load revision session.");
      } finally {
        setLoading(false);
      }
    };
    loadResumeSession();
  }, [resumeSessionId]);

  const startSession = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/study/start", { subject, topic, difficulty });
      setSession(res.data);
      setMcqAnswers(new Array(res.data.mcqs.length).fill(-1));
      setMiniTestAnswers(new Array(res.data.miniTest.length).fill(-1));
      setStep("content");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate study content.");
    } finally {
      setLoading(false);
    }
  };

  const submitSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/study/${session.sessionId}/submit`, { mcqAnswers, miniTestAnswers, codingSubmission });
      setResults(res.data);
      setStep("results");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit session.");
    } finally {
      setLoading(false);
    }
  };

  const startOver = () => {
    setStep("setup");
    setSession(null);
    setResults(null);
    setTopic("");
    setCodingSubmission("");
  };

  return (
    <div className="study">
      <h1>📚 AI Study System</h1>
      {error && <p className="study-error">{error}</p>}

      {step === "setup" && (
        <Card title="Start a Study Session">
          <div className="study-form">
            <label>
              Subject
              <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                {SKILL_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>
              Topic
              <input type="text" placeholder="e.g. Collections" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </label>
            <label>
              Difficulty
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <button className="primary-btn" onClick={startSession} disabled={loading}>
              {loading ? "Generating..." : "Start Studying"}
            </button>
          </div>
        </Card>
      )}

      {step === "content" && session && (
        <>
          <Card title={`${session.subject} → ${session.topic} (${session.difficulty})`}>
            <h4>Concept</h4><p>{session.conceptExplanation}</p>
            <h4>Simple Example</h4><p>{session.simpleExample}</p>
            <h4>Real-World Example</h4><p>{session.realWorldExample}</p>
            <h4>Important Points</h4>
            <ul>{session.importantPoints.map((pt, idx) => <li key={idx}>{pt}</li>)}</ul>
          </Card>

          <Card title="MCQs">
            {session.mcqs.map((q, qIdx) => (
              <div key={qIdx} className="question-block">
                <p>{q.question}</p>
                {q.options.map((opt, optIdx) => (
                  <label key={optIdx} className="option-row">
                    <input
                      type="radio"
                      name={`mcq-${qIdx}`}
                      checked={mcqAnswers[qIdx] === optIdx}
                      onChange={() => {
                        const next = [...mcqAnswers];
                        next[qIdx] = optIdx;
                        setMcqAnswers(next);
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ))}
          </Card>

          <Card title="Practice Questions">
            {session.practiceQuestions.map((q, idx) => <p key={idx}>• {q.question}</p>)}
          </Card>

          <Card title={session.codingProblem?.title || "Coding Problem"}>
            <p>{session.codingProblem?.description}</p>
            {session.codingProblem?.constraints && <p><em>Constraints: {session.codingProblem.constraints}</em></p>}
            <textarea
              className="code-input"
              placeholder="Write your solution here (optional)..."
              value={codingSubmission}
              onChange={(e) => setCodingSubmission(e.target.value)}
              rows={8}
            />
          </Card>

          <Card title="Mini Test">
            {session.miniTest.map((q, qIdx) => (
              <div key={qIdx} className="question-block">
                <p>{q.question}</p>
                {q.options.map((opt, optIdx) => (
                  <label key={optIdx} className="option-row">
                    <input
                      type="radio"
                      name={`minitest-${qIdx}`}
                      checked={miniTestAnswers[qIdx] === optIdx}
                      onChange={() => {
                        const next = [...miniTestAnswers];
                        next[qIdx] = optIdx;
                        setMiniTestAnswers(next);
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ))}
          </Card>

          <button className="primary-btn" onClick={submitSession} disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </button>
        </>
      )}

      {step === "results" && results && (
        <>
          <Card title="Study Score" className="score-highlight">
            <p className="big-score">{results.score}%</p>
            <p>{results.totalCorrect}/{results.totalQuestions} correct</p>
          </Card>

          <Card title="🤖 Feedback">
            <p>{results.aiFeedback}</p>
          </Card>

          <div className="study-two-col">
            <Card title="⚠️ Weak Topics">
              {results.weakTopics.length === 0 ? <p className="empty-state">Not enough data yet.</p> : <ul>{results.weakTopics.map((t, idx) => <li key={idx}>{t.topic} ({t.accuracy}%)</li>)}</ul>}
            </Card>
            <Card title="💪 Strong Topics">
              {results.strongTopics.length === 0 ? <p className="empty-state">Not enough data yet.</p> : <ul>{results.strongTopics.map((t, idx) => <li key={idx}>{t.topic} ({t.accuracy}%)</li>)}</ul>}
            </Card>
          </div>

          <Card title="📌 Recommended Revision">
            {results.recommendedRevision.length === 0 ? <p className="empty-state">Nothing to recommend yet.</p> : <ul>{results.recommendedRevision.map((r, idx) => <li key={idx}>{r.topic}</li>)}</ul>}
          </Card>

          <button className="primary-btn" onClick={startOver}>Study Another Topic</button>
        </>
      )}
    </div>
  );
}

export default Study;