import Skill from "../models/Skill.js";
import CodeSubmission from "../models/CodeSubmission.js";
import Interview from "../models/Interview.js";
import Resume from "../models/Resume.js";
import Project from "../models/Project.js";

const CATEGORIES = ["DSA", "Java", "Full Stack", "Coding", "Projects", "Interview", "Resume", "Problem Solving"];

// Returns null (not 0) when there's no underlying activity yet — a category
// the user hasn't touched should not be scored as a failure.

async function getSkillScore(userId, skillName) {
  const skill = await Skill.findOne({ userId, name: skillName });
  if (!skill || skill.topicScores.length === 0) return null;
  return skill.score;
}

async function getCodingScore(userId) {
  const submissions = await CodeSubmission.find({ userId, correct: { $ne: null } }).select("correct");
  if (submissions.length === 0) return null;
  const correctCount = submissions.filter((s) => s.correct).length;
  return Math.round((correctCount / submissions.length) * 100);
}

async function getProjectsScore(userId) {
  const projects = await Project.find({ userId }).select("progressPercentage");
  if (projects.length === 0) return null;
  const avg = projects.reduce((sum, p) => sum + p.progressPercentage, 0) / projects.length;
  return Math.round(avg);
}

async function getInterviewScore(userId) {
  const interviews = await Interview.find({ userId, status: "completed" }).select("finalReport.overallScore");
  if (interviews.length === 0) return null;
  const avg = interviews.reduce((sum, iv) => sum + iv.finalReport.overallScore, 0) / interviews.length;
  return Math.round(avg);
}

async function getResumeScore(userId) {
  const resume = await Resume.findOne({ userId }).select("analysis.score");
  if (!resume) return null;
  return resume.analysis.score;
}

async function computeCareerReadiness(userId) {
  const [dsa, java, fullStack, coding, projects, interview, resume, problemSolving] = await Promise.all([
    getSkillScore(userId, "DSA"),
    getSkillScore(userId, "Java"),
    getSkillScore(userId, "Full Stack"),
    getCodingScore(userId),
    getProjectsScore(userId),
    getInterviewScore(userId),
    getResumeScore(userId),
    getSkillScore(userId, "Problem Solving"),
  ]);

  const categories = {
    DSA: dsa,
    Java: java,
    "Full Stack": fullStack,
    Coding: coding,
    Projects: projects,
    Interview: interview,
    Resume: resume,
    "Problem Solving": problemSolving,
  };

  const available = Object.values(categories).filter((v) => v !== null);
  const overallScore = available.length > 0 ? Math.round(available.reduce((a, b) => a + b, 0) / available.length) : 0;

  return { categories, overallScore, categoriesWithData: available.length, totalCategories: CATEGORIES.length };
}

export { computeCareerReadiness, CATEGORIES };