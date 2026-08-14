import "./Projects.css";
import { useEffect, useState } from "react";
import api from "../services/api.js";
import Card from "../components/Card.jsx";
import ProgressBar from "../components/ProgressBar.jsx";

const COMPONENT_STATUSES = ["complete", "in_progress", "pending"];
const QUICK_QUESTIONS = [
  "What should I build next?",
  "How should I improve my architecture?",
  "What am I missing?",
  "How can I make this project interview-ready?",
  "How should I deploy this?",
  "How can I improve this project's resume description?",
];

function ProjectList({ projects, onSelect, onNew }) {
  return (
    <Card title="Your Projects">
      {projects.length === 0 ? (
        <p className="empty-state">No projects yet. Create one to get started.</p>
      ) : (
        <ul className="project-list">
          {projects.map((p) => (
            <li key={p._id} onClick={() => onSelect(p._id)} className="project-list-item">
              <div>
                <strong>{p.name}</strong>
                <p className="project-stack">{p.techStack.join(", ")}</p>
              </div>
              <span className="project-progress-badge">{p.progressPercentage}%</span>
            </li>
          ))}
        </ul>
      )}
      <button className="primary-btn" onClick={onNew}>+ New Project</button>
    </Card>
  );
}

function commaListToArray(str) {
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

function NewProjectForm({ onCreated, onCancel }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [goals, setGoals] = useState("");
  const [features, setFeatures] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/projects", {
        name, description,
        techStack: commaListToArray(techStack),
        goals: commaListToArray(goals),
        features: commaListToArray(features),
      });
      onCreated(res.data.project);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="New Project">
      <div className="project-form">
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Description<textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <label>Tech Stack (comma-separated)<input value={techStack} onChange={(e) => setTechStack(e.target.value)} placeholder="React, Node.js, MongoDB" /></label>
        <label>Goals (comma-separated)<input value={goals} onChange={(e) => setGoals(e.target.value)} /></label>
        <label>Features (comma-separated)<input value={features} onChange={(e) => setFeatures(e.target.value)} /></label>
        {error && <p className="project-error">{error}</p>}
        <div className="project-form-actions">
          <button className="primary-btn" onClick={submit} disabled={loading}>{loading ? "Creating..." : "Create Project"}</button>
          <button className="secondary-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </Card>
  );
}

function ProjectDetail({ projectId, onBack }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newComponentName, setNewComponentName] = useState("");
  const [newComponentStatus, setNewComponentStatus] = useState("pending");
  const [newTask, setNewTask] = useState("");
  const [newProblem, setNewProblem] = useState("");

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/projects/${projectId}`);
      setProject(res.data.project);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load project.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const updateProject = async (patch) => {
    try {
      const res = await api.put(`/projects/${projectId}`, patch);
      setProject(res.data.project);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update project.");
    }
  };

  const addComponent = () => {
    if (!newComponentName.trim()) return;
    updateProject({ components: [...project.components, { name: newComponentName, status: newComponentStatus }] });
    setNewComponentName("");
    setNewComponentStatus("pending");
  };

  const changeComponentStatus = (idx, status) => {
    const components = project.components.map((c, i) => (i === idx ? { ...c, status } : c));
    updateProject({ components });
  };

  const addPendingTask = () => {
    if (!newTask.trim()) return;
    updateProject({ pendingTasks: [...project.pendingTasks, newTask] });
    setNewTask("");
  };

  const completeTask = (task) => {
    updateProject({
      pendingTasks: project.pendingTasks.filter((t) => t !== task),
      completedTasks: [...project.completedTasks, task],
    });
  };

  const addProblem = () => {
    if (!newProblem.trim()) return;
    updateProject({ problemsEncountered: [...project.problemsEncountered, newProblem] });
    setNewProblem("");
  };

  const askMentor = async (q) => {
    const finalQuestion = q ?? question;
    if (!finalQuestion.trim()) return;
    setAsking(true);
    setError(null);
    try {
      const res = await api.post(`/projects/${projectId}/ask`, { question: finalQuestion });
      setProject((prev) => ({ ...prev, mentorHistory: res.data.mentorHistory }));
      setQuestion("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to ask mentor.");
    } finally {
      setAsking(false);
    }
  };

  if (loading) return <p className="project-status">Loading project...</p>;
  if (!project) return <p className="project-status error">{error || "Project not found."}</p>;

  return (
    <div>
      <button className="secondary-btn back-btn" onClick={onBack}>← Back to Projects</button>

      <Card title={project.name}>
        <p>{project.description}</p>
        <ProgressBar label="Overall Progress" value={project.progressPercentage} />
      </Card>

      <Card title="Components">
        {project.components.map((c, idx) => (
          <div key={idx} className="component-row">
            <span>{c.name}</span>
            <select value={c.status} onChange={(e) => changeComponentStatus(idx, e.target.value)}>
              {COMPONENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ))}
        <div className="inline-add-row">
          <input placeholder="Component name (e.g. Frontend)" value={newComponentName} onChange={(e) => setNewComponentName(e.target.value)} />
          <select value={newComponentStatus} onChange={(e) => setNewComponentStatus(e.target.value)}>
            {COMPONENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="secondary-btn" onClick={addComponent}>Add</button>
        </div>
      </Card>

      <div className="project-two-col">
        <Card title="✅ Completed Tasks">
          <ul>{project.completedTasks.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </Card>
        <Card title="⏳ Pending Tasks">
          <ul>
            {project.pendingTasks.map((t, i) => (
              <li key={i} className="clickable-task" onClick={() => completeTask(t)}>{t} ✓</li>
            ))}
          </ul>
          <div className="inline-add-row">
            <input placeholder="New task" value={newTask} onChange={(e) => setNewTask(e.target.value)} />
            <button className="secondary-btn" onClick={addPendingTask}>Add</button>
          </div>
        </Card>
      </div>

      <Card title="⚠️ Problems Encountered">
        <ul>{project.problemsEncountered.map((p, i) => <li key={i}>{p}</li>)}</ul>
        <div className="inline-add-row">
          <input placeholder="Describe a problem" value={newProblem} onChange={(e) => setNewProblem(e.target.value)} />
          <button className="secondary-btn" onClick={addProblem}>Add</button>
        </div>
      </Card>

      <Card title="🧑‍💻 AI Project Mentor">
        <div className="quick-questions">
          {QUICK_QUESTIONS.map((q) => (
            <button key={q} className="quick-question-btn" onClick={() => askMentor(q)} disabled={asking}>{q}</button>
          ))}
        </div>

        <div className="mentor-history">
          {project.mentorHistory.map((h, i) => (
            <div key={i} className="mentor-exchange">
              <p className="mentor-question">🙋 {h.question}</p>
              <p className="mentor-answer">🧑‍💻 {h.answer}</p>
            </div>
          ))}
        </div>

        {error && <p className="project-error">{error}</p>}

        <div className="mentor-ask-row">
          <input
            placeholder="Ask your mentor anything about this project..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askMentor()}
          />
          <button className="primary-btn" onClick={() => askMentor()} disabled={asking}>
            {asking ? "Thinking..." : "Ask"}
          </button>
        </div>
      </Card>
    </div>
  );
}

function Projects() {
  const [projects, setProjects] = useState([]);
  const [view, setView] = useState("list"); // list | create | detail
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get("/projects");
      setProjects(res.data.projects);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleSelect = (id) => {
    setSelectedId(id);
    setView("detail");
  };

  const handleCreated = (project) => {
    setView("detail");
    setSelectedId(project._id);
    loadProjects();
  };

  const handleBack = () => {
    setView("list");
    setSelectedId(null);
    loadProjects();
  };

  return (
    <div className="projects">
      <h1>🚀 AI Project Mentor</h1>
      {loading && view === "list" && <p className="project-status">Loading projects...</p>}
      {view === "list" && !loading && <ProjectList projects={projects} onSelect={handleSelect} onNew={() => setView("create")} />}
      {view === "create" && <NewProjectForm onCreated={handleCreated} onCancel={() => setView("list")} />}
      {view === "detail" && <ProjectDetail projectId={selectedId} onBack={handleBack} />}
    </div>
  );
}

export default Projects;