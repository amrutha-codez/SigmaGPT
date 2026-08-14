import ActivityLog from "../models/ActivityLog.js";
import Skill, { SKILL_NAMES } from "../models/Skill.js";
import SKILL_TOPICS from "../utils/skillTopics.js";

const DIFFICULTY_WEIGHT = { easy: 1, medium: 2, hard: 3 };
const MIN_TOPIC_ATTEMPTS_FOR_SIGNAL = 2;

// Recalculates one skill's score + topic breakdown for a user from their activity log.
// Deterministic: weighted accuracy across attempts, weighted by difficulty.
async function recalculateSkill(userId, skillName) {
  const logs = await ActivityLog.find({ userId, skill: skillName }).sort({ createdAt: 1 });

  let skill = await Skill.findOne({ userId, name: skillName });
  if (!skill) {
    skill = new Skill({ userId, name: skillName, score: 0, previousScore: 0, topicScores: [] });
  }

  if (logs.length === 0) {
    skill.topicScores = [];
    skill.lastActivityAt = null;
    await skill.save();
    return skill;
  }

  let weightedCorrect = 0;
  let weightedTotal = 0;
  const topicMap = new Map();

  for (const log of logs) {
    const weight = DIFFICULTY_WEIGHT[log.difficulty] || 1;
    weightedTotal += weight;
    if (log.correct) weightedCorrect += weight;

    const t = topicMap.get(log.topic) || { correct: 0, total: 0 };
    t.total += 1;
    if (log.correct) t.correct += 1;
    topicMap.set(log.topic, t);
  }

  const newScore = weightedTotal > 0 ? Math.round((weightedCorrect / weightedTotal) * 100) : 0;

  // Only shift previousScore when the score actually changes, so it reflects the
  // last score before this recalculation (powers "improved by X%" messaging).
  if (newScore !== skill.score) {
    skill.previousScore = skill.score;
  }
  skill.score = newScore;
  skill.topicScores = Array.from(topicMap.entries()).map(([topic, v]) => ({
    topic,
    correct: v.correct,
    total: v.total,
  }));
  skill.lastActivityAt = logs[logs.length - 1].createdAt;

  await skill.save();
  return skill;
}

// Logs one activity event and recalculates the affected skill's score.
// This is the single entry point every future feature (Study, Coding Lab,
// Interview) will call when a user completes something.
async function logActivity(
  userId,
  { skill, topic, source = "manual", activityType = "other", difficulty = "medium", correct }
) {
  if (!SKILL_NAMES.includes(skill)) {
    throw new Error(`Unknown skill "${skill}". Must be one of: ${SKILL_NAMES.join(", ")}`);
  }
  if (typeof correct !== "boolean") {
    throw new Error("correct must be a boolean");
  }

  await ActivityLog.create({ userId, skill, topic, source, activityType, difficulty, correct });
  return recalculateSkill(userId, skill);
}

function computeOverallScore(skills) {
  if (skills.length === 0) return 0;
  const total = skills.reduce((sum, s) => sum + s.score, 0);
  return Math.round(total / skills.length);
}

// Weak/strong topics across all skills, only counting topics with enough
// attempts to be a meaningful signal (avoids "0% weak area" from one lucky/unlucky try).
function computeWeakStrongTopics(skills) {
  const topics = [];
  for (const skill of skills) {
    for (const t of skill.topicScores) {
      if (t.total < MIN_TOPIC_ATTEMPTS_FOR_SIGNAL) continue;
      topics.push({
        skill: skill.name,
        topic: t.topic,
        accuracy: Math.round((t.correct / t.total) * 100),
      });
    }
  }
  topics.sort((a, b) => a.accuracy - b.accuracy);
  return {
    weak: topics.slice(0, 3),
    strong: topics.slice(-3).reverse(),
  };
}

// Recommends the next topic per skill: an untried one from the catalog first,
// falling back to the lowest-accuracy attempted topic.
function computeRecommendedTopics(skills) {
  const recommendations = [];
  for (const skill of skills) {
    const catalog = SKILL_TOPICS[skill.name] || [];
    const attempted = new Set(skill.topicScores.map((t) => t.topic));
    const untried = catalog.filter((t) => !attempted.has(t));

    if (untried.length > 0) {
      recommendations.push({ skill: skill.name, topic: untried[0], reason: "not yet practiced" });
      continue;
    }

    const weakest = [...skill.topicScores].sort((a, b) => a.correct / a.total - b.correct / b.total)[0];
    if (weakest) {
      recommendations.push({ skill: skill.name, topic: weakest.topic, reason: "lowest accuracy" });
    }
  }
  return recommendations;
}

// Streak = consecutive days (including today) with at least one logged activity.
async function computeStreak(userId) {
  const logs = await ActivityLog.find({ userId }).sort({ createdAt: -1 }).select("createdAt");
  if (logs.length === 0) return 0;

  const daySet = new Set(logs.map((l) => l.createdAt.toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();

  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function getRecentActivity(userId, limit = 10) {
  return ActivityLog.find({ userId }).sort({ createdAt: -1 }).limit(limit);
}

// Ensures a Skill document exists for every tracked skill (new users start at 0).
async function ensureAllSkillsExist(userId) {
  const existing = await Skill.find({ userId }).select("name");
  const existingNames = new Set(existing.map((s) => s.name));
  const missing = SKILL_NAMES.filter((n) => !existingNames.has(n));

  if (missing.length > 0) {
    await Skill.insertMany(missing.map((name) => ({ userId, name, score: 0, previousScore: 0 })));
  }
  return Skill.find({ userId }).sort({ name: 1 });
}

export {
  recalculateSkill,
  logActivity,
  computeOverallScore,
  computeWeakStrongTopics,
  computeRecommendedTopics,
  computeStreak,
  getRecentActivity,
  ensureAllSkillsExist,
};