import Project from "../models/Project.js";
import { askMentor } from "../services/projectMentorService.js";

const VALID_COMPONENT_STATUSES = ["complete", "in_progress", "pending"];

// Deterministic — no AI involved.
function computeProgress(project) {
  const componentWeight = project.components.length > 0
    ? project.components.filter((c) => c.status === "complete").length / project.components.length
    : null;
  const taskTotal = project.completedTasks.length + project.pendingTasks.length;
  const taskWeight = taskTotal > 0 ? project.completedTasks.length / taskTotal : null;

  const weights = [componentWeight, taskWeight].filter((w) => w !== null);
  if (weights.length === 0) return 0;
  const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
  return Math.round(avgWeight * 100);
}

function validateComponents(components) {
  if (!Array.isArray(components)) return "components must be an array";
  for (const c of components) {
    if (!c.name || typeof c.name !== "string") return "each component needs a name";
    if (!VALID_COMPONENT_STATUSES.includes(c.status)) {
      return `component status must be one of: ${VALID_COMPONENT_STATUSES.join(", ")}`;
    }
  }
  return null;
}

// POST /api/projects
async function createProject(req, res) {
  try {
    const userId = req.user.id;
    const {
      name, description = "", techStack = [], goals = [], features = [],
      components = [], completedTasks = [], pendingTasks = [], problemsEncountered = [],
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    const componentError = validateComponents(components);
    if (componentError) return res.status(400).json({ error: componentError });

    const project = new Project({
      userId, name, description, techStack, goals, features,
      components, completedTasks, pendingTasks, problemsEncountered,
    });
    project.progressPercentage = computeProgress(project);
    await project.save();

    res.status(201).json({ project });
  } catch (err) {
    console.error("Create project error:", err);
    res.status(500).json({ error: "Failed to create project", details: err.message });
  }
}

// GET /api/projects
async function listProjects(req, res) {
  try {
    const projects = await Project.find({ userId: req.user.id })
      .select("name progressPercentage techStack updatedAt")
      .sort({ updatedAt: -1 });
    res.json({ projects });
  } catch (err) {
    console.error("List projects error:", err);
    res.status(500).json({ error: "Failed to fetch projects", details: err.message });
  }
}

// GET /api/projects/:id
async function getProject(req, res) {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user.id });
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json({ project });
  } catch (err) {
    console.error("Get project error:", err);
    res.status(500).json({ error: "Failed to fetch project", details: err.message });
  }
}

// PUT /api/projects/:id
async function updateProject(req, res) {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user.id });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const {
      name, description, techStack, goals, features,
      components, completedTasks, pendingTasks, problemsEncountered,
    } = req.body;

    if (components !== undefined) {
      const componentError = validateComponents(components);
      if (componentError) return res.status(400).json({ error: componentError });
      project.components = components;
    }
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (techStack !== undefined) project.techStack = techStack;
    if (goals !== undefined) project.goals = goals;
    if (features !== undefined) project.features = features;
    if (completedTasks !== undefined) project.completedTasks = completedTasks;
    if (pendingTasks !== undefined) project.pendingTasks = pendingTasks;
    if (problemsEncountered !== undefined) project.problemsEncountered = problemsEncountered;

    project.progressPercentage = computeProgress(project);
    await project.save();

    res.json({ project });
  } catch (err) {
    console.error("Update project error:", err);
    res.status(500).json({ error: "Failed to update project", details: err.message });
  }
}

// DELETE /api/projects/:id
async function deleteProject(req, res) {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete project error:", err);
    res.status(500).json({ error: "Failed to delete project", details: err.message });
  }
}

// POST /api/projects/:id/ask
async function askProjectMentor(req, res) {
  try {
    const { question } = req.body;
    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "question is required" });
    }

    const project = await Project.findOne({ _id: req.params.id, userId: req.user.id });
    if (!project) return res.status(404).json({ error: "Project not found" });

    let answer;
    try {
      answer = await askMentor({ project, question });
    } catch (err) {
      console.error("Project mentor failed:", err.message);
      return res.status(502).json({ error: "Failed to get mentor response", details: err.message });
    }

    project.mentorHistory.push({ question, answer, askedAt: new Date() });
    // Keep history bounded so the document and prompt context don't grow unbounded.
    if (project.mentorHistory.length > 30) {
      project.mentorHistory = project.mentorHistory.slice(-30);
    }
    await project.save();

    res.json({ answer, mentorHistory: project.mentorHistory });
  } catch (err) {
    console.error("Ask project mentor error:", err);
    res.status(500).json({ error: "Failed to ask project mentor", details: err.message });
  }
}

export { createProject, listProjects, getProject, updateProject, deleteProject, askProjectMentor };