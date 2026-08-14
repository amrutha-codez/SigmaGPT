import "./Interview.css";
import { useState } from "react";
import api from "../services/api.js";
import Card from "../components/Card.jsx";

const CATEGORIES = ["Java", "DSA", "Full Stack", "DBMS", "OOP", "HR"];

function Interview() {
  const [step, setStep] = useState("setup"); // setup | active | completed
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(5);

  const [interviewId, setInterviewId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [progress, setProgress] = useState(null);
  const [answer, setAnswer] = useState("");
  const [lastEvaluation, setLastEvaluation] = useState(null);
  const [finalReport, setFinalReport] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startInterview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/interview/start", { category, difficulty, numQuestions });
      setInterviewId(res.data.interviewId);
      setCurrentQuestion(res.data.currentQuestion);
      setProgress(res.data.progress);
      setLastEvaluation(null);
      setStep("active");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to start interview.");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) {
      setError("Please write an answer.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/interview/${interviewId}/answer`, { answer });
      setLastEvaluation(res.data.evaluation);
      setAnswer("");
      if (res.data.status === "completed") {
        setFinalReport(res.data.finalReport);
        setStep("completed");
      } else {
        setCurrentQuestion(res.data.nextQuestion);
        setProgress(res.data.progress);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit answer.");
    } finally {
      setLoading(false);
    }
  };

  const endInterview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/interview/${interviewId}/end`);
      setFinalReport(res.data.finalReport);
      setStep("completed");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to end interview.");
    } finally {
      setLoading(false);
    }
  };

  const startOver = () => {
    setStep("setup");
    setInterviewId(null);
    setCurrentQuestion(null);
    setProgress(null);
    setAnswer("");
    setLastEvaluation(null);
    setFinalReport(null);
  };

  return (
    <div className="interview">
      <h1>🎤 AI Interview System</h1>
      {error && <p className="iv-error">{error}</p>}

      {step === "setup" && (
        <Card title="Start a Mock Interview">
          <div className="iv-form">
            <label>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              Difficulty
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label>
              Number of Questions
              <input type="number" min={3} max={10} value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} />
            </label>
            <button className="primary-btn" onClick={startInterview} disabled={loading}>
              {loading ? "Starting..." : "Start Interview"}
            </button>
          </div>
        </Card>
      )}

      {step === "active" && currentQuestion && (
        <>
          {progress && (
            <p className="iv-progress">
              Question {progress.primaryAsked} of {progress.numQuestions}
              {currentQuestion.isFollowUp ? " (follow-up)" : ""}
            </p>
          )}

          {lastEvaluation && (
            <Card title="Feedback on Previous Answer" className="iv-feedback-card">
              <p>{lastEvaluation.feedback}</p>
              <div className="iv-score-row">
                <span>Technical: {lastEvaluation.technicalKnowledge}%</span>
                <span>Problem Solving: {lastEvaluation.problemSolving}%</span>
                <span>Answer Quality: {lastEvaluation.answerQuality}%</span>
                <span>Communication: {lastEvaluation.communication}%</span>
              </div>
            </Card>
          )}

          <Card title={`${category} — ${currentQuestion.topic}`}>
            <p className="iv-question">{currentQuestion.question}</p>
            <textarea className="iv-answer-input" rows={6} placeholder="Type your answer..." value={answer} onChange={(e) => setAnswer(e.target.value)} />
            <div className="iv-actions">
              <button className="primary-btn" onClick={submitAnswer} disabled={loading}>
                {loading ? "Evaluating..." : "Submit Answer"}
              </button>
              <button className="secondary-btn" onClick={endInterview} disabled={loading}>
                End Interview Now
              </button>
            </div>
          </Card>
        </>
      )}

      {step === "completed" && finalReport && (
        <>
          <Card title="Overall Score" className="score-highlight">
            <p className="big-score">{finalReport.overallScore}%</p>
          </Card>

          <Card title="Breakdown">
            <div className="iv-score-row">
              <span>Technical Knowledge: {finalReport.technicalKnowledge}%</span>
              <span>Problem Solving: {finalReport.problemSolving}%</span>
              <span>Answer Quality: {finalReport.answerQuality}%</span>
              <span>Communication: {finalReport.communication}%</span>
            </div>
          </Card>

          <Card title="🤖 Summary">
            <p>{finalReport.aiSummary}</p>
          </Card>

          <div className="iv-two-col">
            <Card title="⚠️ Weak Topics">
              {finalReport.weakTopics.length === 0 ? (
                <p className="empty-state">No data.</p>
              ) : (
                <ul>{finalReport.weakTopics.map((t, i) => <li key={i}>{t.topic} ({t.avgScore}%)</li>)}</ul>
              )}
            </Card>
            <Card title="💪 Strong Topics">
              {finalReport.strongTopics.length === 0 ? (
                <p className="empty-state">No data.</p>
              ) : (
                <ul>{finalReport.strongTopics.map((t, i) => <li key={i}>{t.topic} ({t.avgScore}%)</li>)}</ul>
              )}
            </Card>
          </div>

          <Card title="📌 Recommended Practice">
            {finalReport.recommendedPractice.length === 0 ? (
              <p className="empty-state">Nothing to recommend.</p>
            ) : (
              <ul>{finalReport.recommendedPractice.map((t, i) => <li key={i}>{t}</li>)}</ul>
            )}
          </Card>

          <button className="primary-btn" onClick={startOver}>Start Another Interview</button>
        </>
      )}
    </div>
  );
}

export default Interview;