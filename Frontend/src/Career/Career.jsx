import "./Career.css";
import { useState, useEffect } from "react";
import api from "../services/api.js";
import Card from "../components/Card.jsx";
import ProgressBar from "../components/ProgressBar.jsx";

const TABS = [
  { id: "resume", label: "📄 Resume Analyzer" },
  { id: "jobmatch", label: "🎯 Job Match" },
  { id: "readiness", label: "🏆 Readiness Score" },
];

function ResumePanel() {
  const [resumeText, setResumeText] = useState("");
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/career/resume").then((res) => setResume(res.data.resume)).catch(() => {});
  }, []);

  const submit = async () => {
    if (resumeText.trim().length < 50) {
      setError("Please paste your full resume text (at least 50 characters).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/career/resume", { resumeText });
      setResume(res.data.resume);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to analyze resume.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card title="Paste Your Resume">
        <textarea className="career-textarea" rows={12} placeholder="Paste your full resume text here..." value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
        {error && <p className="career-error">{error}</p>}
        <button className="primary-btn" onClick={submit} disabled={loading}>
          {loading ? "Analyzing..." : resume ? "Re-Analyze Resume" : "Analyze Resume"}
        </button>
      </Card>

      {resume && (
        <>
          <Card title={`Resume Score: ${resume.analysis.score}%`} className="score-highlight">
            <p className="big-score">{resume.analysis.score}%</p>
          </Card>

          <div className="career-two-col">
            <Card title="✅ Strengths">
              <ul>{resume.analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </Card>
            <Card title="⚠️ Weaknesses">
              <ul>{resume.analysis.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </Card>
          </div>

          <Card title="💡 Suggestions">
            <ul>{resume.analysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </Card>

          <Card title="🧩 Missing Skills">
            {resume.analysis.missingSkills.length === 0 ? <p className="empty-state">None identified.</p> : <ul>{resume.analysis.missingSkills.map((s, i) => <li key={i}>{s}</li>)}</ul>}
          </Card>

          <Card title="Details">
            <h4>ATS Friendliness</h4><p>{resume.analysis.atsFriendliness}</p>
            <h4>Project Impact</h4><p>{resume.analysis.projectImpactAssessment}</p>
            <h4>Overall Quality</h4><p>{resume.analysis.overallQuality}</p>
            {resume.analysis.weakSections.length > 0 && (<><h4>Weak Sections</h4><ul>{resume.analysis.weakSections.map((s, i) => <li key={i}>{s}</li>)}</ul></>)}
            {resume.analysis.missingInformation.length > 0 && (<><h4>Missing Information</h4><ul>{resume.analysis.missingInformation.map((s, i) => <li key={i}>{s}</li>)}</ul></>)}
          </Card>
        </>
      )}
    </div>
  );
}

function JobMatchPanel() {
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (jobDescription.trim().length < 30) {
      setError("Please paste the full job description (at least 30 characters).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/career/job-match", { jobDescription });
      setResult(res.data.jobMatch);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to analyze job match.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card title="Paste a Job Description">
        <textarea className="career-textarea" rows={10} placeholder="Paste the job description here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
        {error && <p className="career-error">{error}</p>}
        <button className="primary-btn" onClick={submit} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze Match"}
        </button>
        <p className="career-hint">Uses the resume you analyzed in the Resume Analyzer tab.</p>
      </Card>

      {result && (
        <>
          <Card title={`Job Match: ${result.matchPercentage}%`} className="score-highlight">
            <p className="big-score">{result.matchPercentage}%</p>
            <p>{result.applicationReadiness}</p>
          </Card>

          <div className="career-two-col">
            <Card title="✅ Matched Skills">
              {result.matchedSkills.length === 0 ? <p className="empty-state">No matches found.</p> : <ul>{result.matchedSkills.map((s, i) => <li key={i}>{s}</li>)}</ul>}
            </Card>
            <Card title="❌ Missing Skills">
              {result.missingSkills.length === 0 ? <p className="empty-state">None — great fit!</p> : <ul>{result.missingSkills.map((s, i) => <li key={i}>{s}</li>)}</ul>}
            </Card>
          </div>

          <Card title="📌 Relevant Projects">
            {result.relevantProjects.length === 0 ? <p className="empty-state">None identified.</p> : <ul>{result.relevantProjects.map((s, i) => <li key={i}>{s}</li>)}</ul>}
          </Card>

          <Card title="⚠️ Weak Areas">
            {result.weakAreas.length === 0 ? <p className="empty-state">None identified.</p> : <ul>{result.weakAreas.map((s, i) => <li key={i}>{s}</li>)}</ul>}
          </Card>

          <Card title="📚 Recommended Learning Topics">
            {result.recommendedLearningTopics.length === 0 ? <p className="empty-state">None identified.</p> : <ul>{result.recommendedLearningTopics.map((s, i) => <li key={i}>{s}</li>)}</ul>}
          </Card>

          <Card title="🤖 Summary">
            <p>{result.narrativeSummary}</p>
          </Card>
        </>
      )}
    </div>
  );
}

function ReadinessPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/career-score");
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load career readiness.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="career-status">Calculating your career readiness...</p>;
  if (error) return <p className="career-error">{error}</p>;
  if (!data) return null;

  return (
    <div>
      <Card title="Overall Career Readiness" className="score-highlight">
        <p className="big-score">{data.overallScore}%</p>
        <p className="career-hint">{data.categoriesWithData} of {data.totalCategories} categories have data</p>
        <button className="secondary-btn" onClick={load}>Recalculate</button>
      </Card>

      <Card title="Category Breakdown">
        <div className="readiness-grid">
          {Object.entries(data.categories).map(([name, score]) => (
            <div key={name} className="readiness-item">
              <ProgressBar label={name} value={score ?? 0} />
              {score === null && <span className="no-data-tag">No data yet</span>}
            </div>
          ))}
        </div>
      </Card>

      <Card title="🤖 AI Insights">
        <p>{data.aiInsights.summary}</p>
        {data.aiInsights.strongestArea && <p><strong>Strongest:</strong> {data.aiInsights.strongestArea}</p>}
        {data.aiInsights.weakestArea && <p><strong>Focus Area:</strong> {data.aiInsights.weakestArea}</p>}
        {data.aiInsights.recommendations.length > 0 && (
          <ul>{data.aiInsights.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
        )}
      </Card>
    </div>
  );
}

function Career() {
  const [activeTab, setActiveTab] = useState("resume");

  return (
    <div className="career">
      <h1>💼 Career Tools</h1>
      <div className="career-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`career-tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "resume" && <ResumePanel />}
      {activeTab === "jobmatch" && <JobMatchPanel />}
      {activeTab === "readiness" && <ReadinessPanel />}
    </div>
  );
}

export default Career;