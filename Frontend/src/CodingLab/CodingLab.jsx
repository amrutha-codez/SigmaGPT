import "./CodingLab.css";
import { useState } from "react";
import api from "../services/api.js";
import Card from "../components/Card.jsx";
import { SKILL_NAMES } from "../constants/skills.js";

const TABS = [
  { id: "review", label: "🔍 Code Reviewer" },
  { id: "debug", label: "🐞 Debugger" },
  { id: "hint", label: "💡 Hint Mode" },
];

function MetaSelectors({ skill, setSkill, topic, setTopic, difficulty, setDifficulty }) {
  return (
    <div className="cl-meta-row">
      <label>
        Skill
        <select value={skill} onChange={(e) => setSkill(e.target.value)}>
          {SKILL_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label>
        Topic
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Recursion" />
      </label>
      <label>
        Difficulty
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </label>
    </div>
  );
}

function CodeReviewerPanel() {
  const [skill, setSkill] = useState(SKILL_NAMES[0]);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!topic.trim() || !code.trim()) {
      setError("Topic and code are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/coding-lab/review", { code, language, skill, topic, difficulty });
      setResult(res.data.reviewResult);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to review code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card title="Submit Code for Review">
        <MetaSelectors {...{ skill, setSkill, topic, setTopic, difficulty, setDifficulty }} />
        <label className="cl-lang-label">
          Language
          <input value={language} onChange={(e) => setLanguage(e.target.value)} />
        </label>
        <textarea className="cl-code-input" placeholder="Paste your code here..." rows={12} value={code} onChange={(e) => setCode(e.target.value)} />
        {error && <p className="cl-error">{error}</p>}
        <button className="primary-btn" onClick={submit} disabled={loading}>
          {loading ? "Reviewing..." : "Review Code"}
        </button>
      </Card>

      {result && (
        <Card title={`Review Result — Score: ${result.overallScore}%`}>
          <h4>Correctness</h4><p>{result.correctness}</p>
          {result.bugs.length > 0 && (<><h4>Bugs</h4><ul>{result.bugs.map((b, i) => <li key={i}>{b}</li>)}</ul></>)}
          <h4>Code Quality</h4><p>{result.codeQuality}</p>
          <h4>Readability</h4><p>{result.readability}</p>
          <h4>Time Complexity</h4><p>{result.timeComplexity}</p>
          <h4>Space Complexity</h4><p>{result.spaceComplexity}</p>
          {result.optimizationOpportunities.length > 0 && (<><h4>Optimization Opportunities</h4><ul>{result.optimizationOpportunities.map((o, i) => <li key={i}>{o}</li>)}</ul></>)}
          {result.bestPractices.length > 0 && (<><h4>Best Practices</h4><ul>{result.bestPractices.map((b, i) => <li key={i}>{b}</li>)}</ul></>)}
          <h4>Interview Suitability</h4><p>{result.interviewSuitability}</p>
        </Card>
      )}
    </div>
  );
}

function DebuggerPanel() {
  const [skill, setSkill] = useState(SKILL_NAMES[0]);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!topic.trim() || !code.trim() || !errorMessage.trim()) {
      setError("Topic, code, and error message are all required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/coding-lab/debug", { code, language, errorMessage, skill, topic, difficulty });
      setResult(res.data.debugResult);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to debug code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card title="Debug Your Code">
        <MetaSelectors {...{ skill, setSkill, topic, setTopic, difficulty, setDifficulty }} />
        <label className="cl-lang-label">
          Language
          <input value={language} onChange={(e) => setLanguage(e.target.value)} />
        </label>
        <textarea className="cl-code-input" placeholder="Paste your code here..." rows={10} value={code} onChange={(e) => setCode(e.target.value)} />
        <textarea className="cl-code-input" placeholder="Paste the error message here..." rows={4} value={errorMessage} onChange={(e) => setErrorMessage(e.target.value)} />
        {error && <p className="cl-error">{error}</p>}
        <button className="primary-btn" onClick={submit} disabled={loading}>
          {loading ? "Debugging..." : "Debug Code"}
        </button>
      </Card>

      {result && (
        <Card title="Debug Result">
          <h4>Error Identification</h4><p>{result.errorIdentification}</p>
          <h4>Explanation</h4><p>{result.explanation}</p>
          <h4>Root Cause</h4><p>{result.rootCause}</p>
          <h4>Corrected Code</h4><pre className="cl-code-block">{result.correctedCode}</pre>
          <h4>Fix Explanation</h4><p>{result.fixExplanation}</p>
          <h4>Similar Practice Problem</h4><p>{result.similarPracticeProblem}</p>
        </Card>
      )}
    </div>
  );
}

function HintModePanel() {
  const [skill, setSkill] = useState(SKILL_NAMES[0]);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [language, setLanguage] = useState("javascript");
  const [problemStatement, setProblemStatement] = useState("");
  const [session, setSession] = useState(null);
  const [revealedHints, setRevealedHints] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [finished, setFinished] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startSession = async () => {
    if (!topic.trim() || !problemStatement.trim()) {
      setError("Topic and problem statement are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/coding-lab/hint/start", { problemStatement, language, skill, topic, difficulty });
      setSession(res.data);
      setRevealedHints([]);
      setCurrentLevel(0);
      setFinished(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to start hint session.");
    } finally {
      setLoading(false);
    }
  };

  const revealNextLevel = async () => {
    const nextLevel = currentLevel + 1;
    if (nextLevel > 5) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/coding-lab/hint/${session.submissionId}/reveal`, { level: nextLevel });
      setRevealedHints(res.data.hints);
      setCurrentLevel(res.data.maxLevelRevealed);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reveal hint.");
    } finally {
      setLoading(false);
    }
  };

  const finish = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/coding-lab/hint/${session.submissionId}/finish`);
      setFinished(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to finish session.");
    } finally {
      setLoading(false);
    }
  };

  const startOver = () => {
    setSession(null);
    setProblemStatement("");
    setRevealedHints([]);
    setCurrentLevel(0);
    setFinished(null);
  };

  const levelLabels = ["Small Hint", "Stronger Hint", "Approach", "Pseudocode", "Full Solution"];

  return (
    <div>
      {!session && (
        <Card title="Start a Guided Problem">
          <MetaSelectors {...{ skill, setSkill, topic, setTopic, difficulty, setDifficulty }} />
          <label className="cl-lang-label">
            Language
            <input value={language} onChange={(e) => setLanguage(e.target.value)} />
          </label>
          <textarea className="cl-code-input" placeholder="Describe the problem you're solving..." rows={6} value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} />
          {error && <p className="cl-error">{error}</p>}
          <button className="primary-btn" onClick={startSession} disabled={loading}>
            {loading ? "Preparing hints..." : "Start"}
          </button>
        </Card>
      )}

      {session && !finished && (
        <Card title={`Guided Problem — Level ${currentLevel}/5`}>
          <p className="cl-problem-statement">{problemStatement}</p>
          {revealedHints.map((h) => (
            <div key={h.level} className="cl-hint-block">
              <strong>Level {h.level}: {levelLabels[h.level - 1]}</strong>
              <p>{h.hint}</p>
            </div>
          ))}
          {error && <p className="cl-error">{error}</p>}
          <div className="cl-hint-actions">
            {currentLevel < 5 && (
              <button className="primary-btn" onClick={revealNextLevel} disabled={loading}>
                {loading ? "Loading..." : `Reveal Level ${currentLevel + 1} Hint`}
              </button>
            )}
            <button className="secondary-btn" onClick={finish} disabled={loading}>I'm Done</button>
          </div>
        </Card>
      )}

      {finished && (
        <Card title={finished.solvedWithoutFullSolution ? "✅ Solved!" : "📖 Full Solution Used"}>
          <p>
            {finished.solvedWithoutFullSolution
              ? "Nice work — you solved this without needing the full solution."
              : "You reached the full solution. That's OK — try a similar problem with fewer hints next time."}
          </p>
          <button className="primary-btn" onClick={startOver}>Try Another Problem</button>
        </Card>
      )}
    </div>
  );
}

function CodingLab() {
  const [activeTab, setActiveTab] = useState("review");

  return (
    <div className="coding-lab">
      <h1>🧪 Coding Lab</h1>
      <div className="cl-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`cl-tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "review" && <CodeReviewerPanel />}
      {activeTab === "debug" && <DebuggerPanel />}
      {activeTab === "hint" && <HintModePanel />}
    </div>
  );
}

export default CodingLab;