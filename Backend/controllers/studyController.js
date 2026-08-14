import StudySession from "../models/StudySession.js";
import Skill, { SKILL_NAMES } from "../models/Skill.js";
import Mistake from "../models/Mistake.js";
import { generateStudyContent } from "../services/studyContentService.js";
import { logActivity, computeWeakStrongTopics, computeRecommendedTopics } from "../services/scoringService.js";
import { recordMistake } from "../services/mistakeService.js";
import { askAI } from "../services/aiService.js";

function toClientContent(session) {
  return {
    sessionId: session._id,
    subject: session.subject,
    topic: session.topic,
    difficulty: session.difficulty,
    conceptExplanation: session.conceptExplanation,
    simpleExample: session.simpleExample,
    realWorldExample: session.realWorldExample,
    importantPoints: session.importantPoints,
    mcqs: session.mcqs.map((q) => ({ question: q.question, options: q.options })),
    practiceQuestions: session.practiceQuestions,
    codingProblem: session.codingProblem,
    miniTest: session.miniTest.map((q) => ({ question: q.question, options: q.options })),
  };
}

// POST /api/study/start
async function startStudySession(req, res) {
  try {
    const userId = req.user.id;
    const { subject, topic, difficulty } = req.body;

    if (!subject || !SKILL_NAMES.includes(subject)) {
      return res.status(400).json({ error: `subject must be one of: ${SKILL_NAMES.join(", ")}` });
    }
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "topic is required" });
    }
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({ error: "difficulty must be easy, medium, or hard" });
    }

    let content;
    try {
      content = await generateStudyContent({ subject, topic, difficulty });
    } catch (err) {
      console.error("Study content generation failed:", err.message);
      return res.status(502).json({ error: "Failed to generate study content", details: err.message });
    }

    const session = await StudySession.create({ userId, subject, topic, difficulty, ...content });
    res.status(201).json(toClientContent(session));
  } catch (err) {
    console.error("Start study session error:", err);
    res.status(500).json({ error: "Failed to start study session", details: err.message });
  }
}

// GET /api/study/:sessionId — used to resume a revision session from the Mistake Bank
async function getStudySession(req, res) {
  try {
    const session = await StudySession.findOne({ _id: req.params.sessionId, userId: req.user.id });
    if (!session) return res.status(404).json({ error: "Study session not found" });
    if (session.status === "submitted") {
      return res.status(400).json({ error: "This session has already been submitted" });
    }
    res.json(toClientContent(session));
  } catch (err) {
    console.error("Get study session error:", err);
    res.status(500).json({ error: "Failed to fetch study session", details: err.message });
  }
}

// POST /api/study/:sessionId/submit
async function submitStudySession(req, res) {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const { mcqAnswers = [], miniTestAnswers = [], codingSubmission = "" } = req.body;

    const session = await StudySession.findOne({ _id: sessionId, userId });
    if (!session) return res.status(404).json({ error: "Study session not found" });
    if (session.status === "submitted") {
      return res.status(400).json({ error: "Session already submitted" });
    }
    if (!Array.isArray(mcqAnswers) || !Array.isArray(miniTestAnswers)) {
      return res.status(400).json({ error: "mcqAnswers and miniTestAnswers must be arrays" });
    }

    const gradeSet = (questions, answers) =>
      questions.map((q, idx) => {
        const selectedIndex = answers[idx];
        return { questionIndex: idx, selectedIndex: selectedIndex ?? -1, correct: selectedIndex === q.correctIndex };
      });

    const gradedMCQ = gradeSet(session.mcqs, mcqAnswers);
    const gradedMiniTest = gradeSet(session.miniTest, miniTestAnswers);

    const totalQuestions = gradedMCQ.length + gradedMiniTest.length;
    const totalCorrect = [...gradedMCQ, ...gradedMiniTest].filter((a) => a.correct).length;
    const score = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    session.mcqAnswers = gradedMCQ;
    session.miniTestAnswers = gradedMiniTest;
    session.codingSubmission = codingSubmission;
    session.score = score;
    session.status = "submitted";
    session.submittedAt = new Date();
    await session.save();

    // If this was a revision session started from the Mistake Bank, update the
    // linked mistake's status based on how it went.
    try {
      const linkedMistake = await Mistake.findOne({ revisionSessionId: session._id });
      if (linkedMistake) {
        linkedMistake.status = score >= 70 ? "resolved" : "needs_revision";
        await linkedMistake.save();
      }
    } catch (err) {
      console.error("Failed to update linked mistake status:", err.message);
    }

    // Feed every graded question into the shared activity log, and record wrong
    // answers into the Mistake Bank.
    const allGraded = [
      ...gradedMCQ.map((a) => ({ ...a, source: session.mcqs[a.questionIndex] })),
      ...gradedMiniTest.map((a) => ({ ...a, source: session.miniTest[a.questionIndex] })),
    ];

    for (const a of allGraded) {
      try {
        await logActivity(userId, {
          skill: session.subject,
          topic: session.topic,
          source: "study",
          activityType: "quiz",
          difficulty: session.difficulty,
          correct: a.correct,
        });
      } catch (err) {
        console.error("Failed to log study activity:", err.message);
      }

      if (!a.correct) {
        try {
          await recordMistake({
            userId,
            skill: session.subject,
            topic: session.topic,
            mistakeType: "quiz",
            difficulty: session.difficulty,
            questionOrProblem: a.source.question,
            userAnswer: a.source.options[a.selectedIndex] ?? "(no answer selected)",
            correctAnswerOrSolution: a.source.options[a.source.correctIndex],
            explanation: a.source.explanation || "",
            sourceType: "study",
            sourceId: session._id,
          });
        } catch (err) {
          console.error("Failed to record mistake:", err.message);
        }
      }
    }

    const updatedSkill = await Skill.findOne({ userId, name: session.subject });
    const { weak, strong } = updatedSkill ? computeWeakStrongTopics([updatedSkill]) : { weak: [], strong: [] };
    const recommendedRevision = updatedSkill ? computeRecommendedTopics([updatedSkill]) : [];

    let aiFeedback = "Nice work completing the session — keep practicing to build on this.";
    try {
      aiFeedback = await askAI({
        prompt: `The user just completed a study session on ${session.subject} → ${session.topic} (${session.difficulty}) and scored ${score}%. Weak topics in this skill: ${JSON.stringify(weak)}. Strong topics: ${JSON.stringify(strong)}. Give 2-3 encouraging, specific sentences of feedback and what to focus on next.`,
        system: "You are a supportive coding tutor. Reference the actual topic names given. Never invent a different score.",
        maxTokens: 300,
      });
    } catch (err) {
      console.error("AI feedback generation failed:", err.message);
    }

    res.json({
      sessionId: session._id,
      score,
      totalQuestions,
      totalCorrect,
      mcqResults: gradedMCQ.map((a, idx) => ({
        ...a,
        correctIndex: session.mcqs[idx].correctIndex,
        explanation: session.mcqs[idx].explanation,
      })),
      miniTestResults: gradedMiniTest.map((a, idx) => ({ ...a, correctIndex: session.miniTest[idx].correctIndex })),
      weakTopics: weak,
      strongTopics: strong,
      recommendedRevision,
      aiFeedback,
    });
  } catch (err) {
    console.error("Submit study session error:", err);
    res.status(500).json({ error: "Failed to submit study session", details: err.message });
  }
}

// GET /api/study/history
async function getStudyHistory(req, res) {
  try {
    const sessions = await StudySession.find({ userId: req.user.id })
      .select("subject topic difficulty score status createdAt submittedAt")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ sessions });
  } catch (err) {
    console.error("Study history error:", err);
    res.status(500).json({ error: "Failed to fetch study history", details: err.message });
  }
}

export { startStudySession, getStudySession, submitStudySession, getStudyHistory };