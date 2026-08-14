import Goal from "../models/Goal.js";
import {
  logActivity,
  computeOverallScore,
  computeWeakStrongTopics,
  computeRecommendedTopics,
  computeStreak,
  getRecentActivity,
  ensureAllSkillsExist,
} from "../services/scoringService.js";
import { askAIJSON } from "../services/aiService.js";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function weekKey() {
  const d = new Date();
  const firstJan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - firstJan) / 86400000 + firstJan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

// GET /api/dashboard
async function getDashboard(req, res) {
  try {
    const userId = req.user.id;

    const skills = await ensureAllSkillsExist(userId);
    const overallScore = computeOverallScore(skills);
    const { weak, strong } = computeWeakStrongTopics(skills);
    const recommendedTopics = computeRecommendedTopics(skills);
    const streak = await computeStreak(userId);
    const recentActivity = await getRecentActivity(userId, 10);

    const goals = await Goal.find({
      userId,
      $or: [
        { type: "daily", periodKey: todayKey() },
        { type: "weekly", periodKey: weekKey() },
      ],
    }).sort({ createdAt: -1 });

    let aiInsights = { summary: "Keep practicing to unlock personalized insights.", recommendations: [] };
    try {
      aiInsights = await askAIJSON({
        prompt: `Analyze this user's skill data and give a short, encouraging, specific summary plus 2-4 concrete recommendations.

Skills: ${JSON.stringify(skills.map((s) => ({ name: s.name, score: s.score, previousScore: s.previousScore })))}
Weak topics: ${JSON.stringify(weak)}
Strong topics: ${JSON.stringify(strong)}
Current streak: ${streak} day(s)
Recent activity count: ${recentActivity.length}`,
        system:
          "You are a supportive coding/career coach analyzing a learner's skill dashboard. Be specific and reference actual topic/skill names given to you. Never invent scores or topics not present in the data. If there isn't enough data yet, say so plainly and suggest getting started.",
        jsonInstruction:
          'Respond with JSON: { "summary": string (2-3 sentences), "recommendations": string[] (2-4 short actionable items) }',
        maxTokens: 500,
      });
    } catch (err) {
      // AI insight is supplementary — never fail the whole dashboard because of it.
      console.error("AI insight generation failed:", err.message);
    }

    res.json({
      overallScore,
      skills: skills.map((s) => ({
        name: s.name,
        score: s.score,
        previousScore: s.previousScore,
        topicScores: s.topicScores,
      })),
      weakTopics: weak,
      strongTopics: strong,
      recommendedTopics,
      streak,
      goals,
      recentActivity,
      aiInsights,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard", details: err.message });
  }
}

// POST /api/dashboard/activity — generic log endpoint; used directly for testing now,
// and internally by Study/Coding Lab/Interview systems from Phase 3 onward.
async function postActivity(req, res) {
  try {
    const userId = req.user.id;
    const { skill, topic, source, activityType, difficulty, correct } = req.body;

    if (!skill || !topic || typeof correct !== "boolean") {
      return res.status(400).json({ error: "skill, topic, and correct (boolean) are required" });
    }

    const updatedSkill = await logActivity(userId, {
      skill,
      topic,
      source,
      activityType,
      difficulty,
      correct,
    });

    res.status(201).json({ skill: updatedSkill });
  } catch (err) {
    console.error("Log activity error:", err);
    res.status(400).json({ error: "Failed to log activity", details: err.message });
  }
}

// POST /api/dashboard/goals
async function createGoal(req, res) {
  try {
    const userId = req.user.id;
    const { type, description, skill } = req.body;

    if (!type || !["daily", "weekly"].includes(type) || !description) {
      return res.status(400).json({ error: "type (daily|weekly) and description are required" });
    }

    const goal = await Goal.create({
      userId,
      type,
      description,
      skill: skill || null,
      periodKey: type === "daily" ? todayKey() : weekKey(),
    });

    res.status(201).json({ goal });
  } catch (err) {
    console.error("Create goal error:", err);
    res.status(500).json({ error: "Failed to create goal", details: err.message });
  }
}

// PATCH /api/dashboard/goals/:id/toggle
async function toggleGoal(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const goal = await Goal.findOne({ _id: id, userId });
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    goal.completed = !goal.completed;
    await goal.save();

    res.json({ goal });
  } catch (err) {
    console.error("Toggle goal error:", err);
    res.status(500).json({ error: "Failed to update goal", details: err.message });
  }
}

export { getDashboard, postActivity, createGoal, toggleGoal };