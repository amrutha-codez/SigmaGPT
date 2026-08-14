import CodeSubmission from "../models/CodeSubmission.js";
import { SKILL_NAMES } from "../models/Skill.js";
import { generateCodeReview, generateDebugResult, generateHintLevels } from "../services/codingLabService.js";
import { logActivity } from "../services/scoringService.js";
import { recordMistake } from "../services/mistakeService.js";

function validateCommon({ skill, topic, difficulty }) {
  if (!skill || !SKILL_NAMES.includes(skill)) return `skill must be one of: ${SKILL_NAMES.join(", ")}`;
  if (!topic || typeof topic !== "string") return "topic is required";
  if (difficulty && !["easy", "medium", "hard"].includes(difficulty)) return "difficulty must be easy, medium, or hard";
  return null;
}

// POST /api/coding-lab/review
async function reviewCode(req, res) {
  try {
    const userId = req.user.id;
    const { code, language = "javascript", skill, topic, difficulty = "medium" } = req.body;

    const validationError = validateCommon({ skill, topic, difficulty });
    if (validationError) return res.status(400).json({ error: validationError });
    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ error: "code is required" });
    }

    let reviewResult;
    try {
      reviewResult = await generateCodeReview({ language, code });
    } catch (err) {
      console.error("Code review generation failed:", err.message);
      return res.status(502).json({ error: "Failed to generate code review", details: err.message });
    }

    const correct = reviewResult.overallScore >= 70;

    const submission = await CodeSubmission.create({
      userId, mode: "review", skill, topic, difficulty, language, code, reviewResult, correct,
    });

    try {
      await logActivity(userId, { skill, topic, source: "coding", activityType: "coding_problem", difficulty, correct });
    } catch (err) {
      console.error("Failed to log coding activity:", err.message);
    }

    if (!correct) {
      try {
        await recordMistake({
          userId, skill, topic, mistakeType: "coding", difficulty,
          questionOrProblem: `Code review submission (${language})`,
          userAnswer: code,
          correctAnswerOrSolution: "",
          explanation: reviewResult.bugs.join("; ") || reviewResult.correctness,
          sourceType: "coding", sourceId: submission._id,
        });
      } catch (err) {
        console.error("Failed to record mistake:", err.message);
      }
    }

    res.status(201).json({ submissionId: submission._id, reviewResult, correct });
  } catch (err) {
    console.error("Review code error:", err);
    res.status(500).json({ error: "Failed to review code", details: err.message });
  }
}

// POST /api/coding-lab/debug
async function debugCode(req, res) {
  try {
    const userId = req.user.id;
    const { code, language = "javascript", errorMessage, skill, topic, difficulty = "medium" } = req.body;

    const validationError = validateCommon({ skill, topic, difficulty });
    if (validationError) return res.status(400).json({ error: validationError });
    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ error: "code is required" });
    }
    if (!errorMessage || typeof errorMessage !== "string" || !errorMessage.trim()) {
      return res.status(400).json({ error: "errorMessage is required" });
    }

    let debugResult;
    try {
      debugResult = await generateDebugResult({ language, code, errorMessage });
    } catch (err) {
      console.error("Debug generation failed:", err.message);
      return res.status(502).json({ error: "Failed to debug code", details: err.message });
    }

    const submission = await CodeSubmission.create({
      userId, mode: "debug", skill, topic, difficulty, language, code, errorMessage, debugResult, correct: false,
    });

    try {
      await logActivity(userId, { skill, topic, source: "coding", activityType: "coding_problem", difficulty, correct: false });
    } catch (err) {
      console.error("Failed to log coding activity:", err.message);
    }

    // A debug session always represents a mistake by definition.
    try {
      await recordMistake({
        userId, skill, topic, mistakeType: "debugging", difficulty,
        questionOrProblem: errorMessage,
        userAnswer: code,
        correctAnswerOrSolution: debugResult.correctedCode,
        explanation: debugResult.explanation,
        sourceType: "coding", sourceId: submission._id,
      });
    } catch (err) {
      console.error("Failed to record mistake:", err.message);
    }

    res.status(201).json({ submissionId: submission._id, debugResult });
  } catch (err) {
    console.error("Debug code error:", err);
    res.status(500).json({ error: "Failed to debug code", details: err.message });
  }
}

// POST /api/coding-lab/hint/start
async function startHintSession(req, res) {
  try {
    const userId = req.user.id;
    const { problemStatement, language = "javascript", skill, topic, difficulty = "medium" } = req.body;

    const validationError = validateCommon({ skill, topic, difficulty });
    if (validationError) return res.status(400).json({ error: validationError });
    if (!problemStatement || typeof problemStatement !== "string" || !problemStatement.trim()) {
      return res.status(400).json({ error: "problemStatement is required" });
    }

    let hints;
    try {
      hints = await generateHintLevels({ problemStatement, language });
    } catch (err) {
      console.error("Hint generation failed:", err.message);
      return res.status(502).json({ error: "Failed to generate hints", details: err.message });
    }

    const submission = await CodeSubmission.create({
      userId, mode: "hint", skill, topic, difficulty, language,
      hintSession: { problemStatement, hints, maxLevelRevealed: 0, finished: false },
    });

    res.status(201).json({ submissionId: submission._id, problemStatement, totalLevels: hints.length, maxLevelRevealed: 0 });
  } catch (err) {
    console.error("Start hint session error:", err);
    res.status(500).json({ error: "Failed to start hint session", details: err.message });
  }
}

// POST /api/coding-lab/hint/:submissionId/reveal
async function revealHintLevel(req, res) {
  try {
    const userId = req.user.id;
    const { submissionId } = req.params;
    const { level } = req.body;

    if (!Number.isInteger(level) || level < 1 || level > 5) {
      return res.status(400).json({ error: "level must be an integer between 1 and 5" });
    }

    const submission = await CodeSubmission.findOne({ _id: submissionId, userId, mode: "hint" });
    if (!submission) return res.status(404).json({ error: "Hint session not found" });
    if (submission.hintSession.finished) return res.status(400).json({ error: "This hint session is already finished" });

    submission.hintSession.maxLevelRevealed = Math.max(submission.hintSession.maxLevelRevealed, level);
    await submission.save();

    const revealedHints = submission.hintSession.hints.filter((h) => h.level <= level);

    res.json({ submissionId: submission._id, maxLevelRevealed: submission.hintSession.maxLevelRevealed, hints: revealedHints });
  } catch (err) {
    console.error("Reveal hint error:", err);
    res.status(500).json({ error: "Failed to reveal hint", details: err.message });
  }
}

// POST /api/coding-lab/hint/:submissionId/finish
async function finishHintSession(req, res) {
  try {
    const userId = req.user.id;
    const { submissionId } = req.params;

    const submission = await CodeSubmission.findOne({ _id: submissionId, userId, mode: "hint" });
    if (!submission) return res.status(404).json({ error: "Hint session not found" });
    if (submission.hintSession.finished) return res.status(400).json({ error: "This hint session is already finished" });

    const correct = submission.hintSession.maxLevelRevealed < 5;

    submission.hintSession.finished = true;
    submission.correct = correct;
    await submission.save();

    try {
      await logActivity(userId, {
        skill: submission.skill, topic: submission.topic, source: "coding",
        activityType: "coding_problem", difficulty: submission.difficulty, correct,
      });
    } catch (err) {
      console.error("Failed to log coding activity:", err.message);
    }

    if (!correct) {
      try {
        await recordMistake({
          userId,
          skill: submission.skill,
          topic: submission.topic,
          mistakeType: "coding",
          difficulty: submission.difficulty,
          questionOrProblem: submission.hintSession.problemStatement,
          userAnswer: "(needed the full solution)",
          correctAnswerOrSolution: submission.hintSession.hints.find((h) => h.level === 5)?.hint || "",
          explanation: "Full solution was revealed before solving independently.",
          sourceType: "coding",
          sourceId: submission._id,
        });
      } catch (err) {
        console.error("Failed to record mistake:", err.message);
      }
    }

    res.json({ submissionId: submission._id, solvedWithoutFullSolution: correct, maxLevelRevealed: submission.hintSession.maxLevelRevealed });
  } catch (err) {
    console.error("Finish hint session error:", err);
    res.status(500).json({ error: "Failed to finish hint session", details: err.message });
  }
}

// GET /api/coding-lab/history
async function getCodingHistory(req, res) {
  try {
    const submissions = await CodeSubmission.find({ userId: req.user.id })
      .select("mode skill topic difficulty correct createdAt")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ submissions });
  } catch (err) {
    console.error("Coding history error:", err);
    res.status(500).json({ error: "Failed to fetch coding history", details: err.message });
  }
}

export { reviewCode, debugCode, startHintSession, revealHintLevel, finishHintSession, getCodingHistory };