import Interview, { INTERVIEW_CATEGORIES } from "../models/Interview.js";
import { SKILL_NAMES } from "../models/Skill.js";
import { pickTopic, generateQuestion, evaluateAnswer } from "../services/interviewService.js";
import { logActivity } from "../services/scoringService.js";
import { recordMistake } from "../services/mistakeService.js";
import { askAI } from "../services/aiService.js";

const SCORE_PASS_THRESHOLD = 70;
const MAX_FOLLOWUPS_PER_QUESTION = 1;

function avg(nums) {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

// POST /api/interview/start
async function startInterview(req, res) {
  try {
    const userId = req.user.id;
    const { category, difficulty, numQuestions } = req.body;

    if (!INTERVIEW_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${INTERVIEW_CATEGORIES.join(", ")}` });
    }
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({ error: "difficulty must be easy, medium, or hard" });
    }
    const n = Number(numQuestions);
    if (!Number.isInteger(n) || n < 3 || n > 10) {
      return res.status(400).json({ error: "numQuestions must be an integer between 3 and 10" });
    }

    const topic = pickTopic(category);
    let question;
    try {
      question = await generateQuestion({ category, difficulty, topic });
    } catch (err) {
      console.error("Interview question generation failed:", err.message);
      return res.status(502).json({ error: "Failed to generate interview question", details: err.message });
    }

    const interview = await Interview.create({
      userId, category, difficulty, numQuestions: n,
      questions: [{ index: 0, topic, question, isFollowUp: false }],
      startedAt: new Date(),
    });

    res.status(201).json({
      interviewId: interview._id,
      category, difficulty, numQuestions: n,
      currentQuestion: { index: 0, topic, question },
      progress: { primaryAsked: 1, numQuestions: n },
    });
  } catch (err) {
    console.error("Start interview error:", err);
    res.status(500).json({ error: "Failed to start interview", details: err.message });
  }
}

async function finalizeInterview(interview) {
  const graded = interview.questions.filter((q) => q.evaluation);

  const technicalKnowledge = avg(graded.map((q) => q.evaluation.technicalKnowledge));
  const problemSolving = avg(graded.map((q) => q.evaluation.problemSolving));
  const answerQuality = avg(graded.map((q) => q.evaluation.answerQuality));
  const communication = avg(graded.map((q) => q.evaluation.communication));
  const overallScore = avg([technicalKnowledge, problemSolving, answerQuality, communication]);

  const topicMap = new Map();
  for (const q of graded) {
    const scores = topicMap.get(q.topic) || [];
    scores.push(avg([q.evaluation.technicalKnowledge, q.evaluation.problemSolving, q.evaluation.answerQuality, q.evaluation.communication]));
    topicMap.set(q.topic, scores);
  }
  const topicAverages = Array.from(topicMap.entries())
    .map(([topic, scores]) => ({ topic, avgScore: avg(scores) }))
    .sort((a, b) => a.avgScore - b.avgScore);

  const weakTopics = topicAverages.slice(0, 3);
  const strongTopics = topicAverages.slice(-3).reverse();
  const recommendedPractice = weakTopics.map((t) => t.topic);

  let aiSummary = "Interview complete — review your results below.";
  try {
    aiSummary = await askAI({
      prompt: `Interview category: ${interview.category}. Scores — Technical Knowledge: ${technicalKnowledge}, Problem Solving: ${problemSolving}, Answer Quality: ${answerQuality}, Communication: ${communication}, Overall: ${overallScore}. Weak topics: ${JSON.stringify(weakTopics)}. Strong topics: ${JSON.stringify(strongTopics)}. Give 2-3 encouraging, specific sentences summarizing performance and what to focus on next.`,
      system: "You are a supportive technical interview coach. Reference the actual scores and topics given. Never invent a different score.",
      maxTokens: 300,
    });
  } catch (err) {
    console.error("AI interview summary failed:", err.message);
  }

  interview.status = "completed";
  interview.completedAt = new Date();
  interview.durationSeconds = Math.round((interview.completedAt - interview.startedAt) / 1000);
  interview.finalReport = {
    technicalKnowledge, problemSolving, answerQuality, communication, overallScore,
    weakTopics, strongTopics, recommendedPractice, aiSummary,
  };
}

async function logInterviewActivities(userId, interview) {
  for (const q of interview.questions) {
    if (!q.evaluation) continue;
    try {
      await logActivity(userId, {
        skill: "Interview Skills", topic: interview.category, source: "interview",
        activityType: "interview_question", difficulty: interview.difficulty, correct: q.correct,
      });
      if (SKILL_NAMES.includes(interview.category)) {
        await logActivity(userId, {
          skill: interview.category, topic: q.topic, source: "interview",
          activityType: "interview_question", difficulty: interview.difficulty, correct: q.correct,
        });
      }
    } catch (err) {
      console.error("Failed to log interview activity:", err.message);
    }

    if (!q.correct) {
      try {
        await recordMistake({
          userId,
          skill: "Interview Skills",
          topic: q.topic,
          mistakeType: "interview",
          difficulty: interview.difficulty,
          questionOrProblem: q.question,
          userAnswer: q.answer,
          correctAnswerOrSolution: "",
          explanation: q.evaluation.feedback,
          sourceType: "interview",
          sourceId: interview._id,
        });
      } catch (err) {
        console.error("Failed to record interview mistake:", err.message);
      }
    }
  }
}

// POST /api/interview/:id/answer
async function submitAnswer(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { answer } = req.body;

    if (!answer || typeof answer !== "string" || !answer.trim()) {
      return res.status(400).json({ error: "answer is required" });
    }

    const interview = await Interview.findOne({ _id: id, userId });
    if (!interview) return res.status(404).json({ error: "Interview not found" });
    if (interview.status === "completed") return res.status(400).json({ error: "Interview already completed" });

    const currentQ = interview.questions[interview.questions.length - 1];
    if (!currentQ || currentQ.answer) {
      return res.status(400).json({ error: "No pending question to answer" });
    }

    let evaluation;
    try {
      evaluation = await evaluateAnswer({
        category: interview.category, topic: currentQ.topic, question: currentQ.question,
        difficulty: interview.difficulty, answer,
      });
    } catch (err) {
      console.error("Answer evaluation failed:", err.message);
      return res.status(502).json({ error: "Failed to evaluate answer", details: err.message });
    }

    currentQ.answer = answer;
    currentQ.evaluation = {
      technicalKnowledge: evaluation.technicalKnowledge,
      problemSolving: evaluation.problemSolving,
      answerQuality: evaluation.answerQuality,
      communication: evaluation.communication,
      feedback: evaluation.feedback,
    };
    const avgQScore = avg([evaluation.technicalKnowledge, evaluation.problemSolving, evaluation.answerQuality, evaluation.communication]);
    currentQ.correct = avgQScore >= SCORE_PASS_THRESHOLD;

    const primaryAsked = interview.questions.filter((q) => !q.isFollowUp).length;
    const followUpsForThisPrimary = interview.questions.filter((q) => q.isFollowUp && q.topic === currentQ.topic).length;

    let nextQuestion = null;
    let interviewComplete = false;

    const canFollowUp = !currentQ.isFollowUp && evaluation.followUpNeeded && followUpsForThisPrimary < MAX_FOLLOWUPS_PER_QUESTION;

    if (canFollowUp) {
      nextQuestion = { index: interview.questions.length, topic: currentQ.topic, question: evaluation.followUpQuestion, isFollowUp: true };
      interview.questions.push(nextQuestion);
    } else if (primaryAsked < interview.numQuestions) {
      const askedTopics = interview.questions.filter((q) => !q.isFollowUp).map((q) => q.topic);
      const topic = pickTopic(interview.category, askedTopics);
      let question;
      try {
        question = await generateQuestion({ category: interview.category, difficulty: interview.difficulty, topic });
      } catch (err) {
        console.error("Next question generation failed:", err.message);
        return res.status(502).json({ error: "Failed to generate next question", details: err.message });
      }
      nextQuestion = { index: interview.questions.length, topic, question, isFollowUp: false };
      interview.questions.push(nextQuestion);
    } else {
      interviewComplete = true;
    }

    if (interviewComplete) {
      await finalizeInterview(interview);
      await interview.save();
      await logInterviewActivities(userId, interview);

      return res.json({
        interviewId: interview._id, status: "completed",
        evaluation: currentQ.evaluation, finalReport: interview.finalReport,
      });
    }

    await interview.save();

    res.json({
      interviewId: interview._id,
      status: "in_progress",
      evaluation: currentQ.evaluation,
      nextQuestion: { index: nextQuestion.index, topic: nextQuestion.topic, question: nextQuestion.question, isFollowUp: nextQuestion.isFollowUp },
      progress: { primaryAsked: interview.questions.filter((q) => !q.isFollowUp).length, numQuestions: interview.numQuestions },
    });
  } catch (err) {
    console.error("Submit answer error:", err);
    res.status(500).json({ error: "Failed to submit answer", details: err.message });
  }
}

// POST /api/interview/:id/end
async function endInterview(req, res) {
  try {
    const userId = req.user.id;
    const interview = await Interview.findOne({ _id: req.params.id, userId });
    if (!interview) return res.status(404).json({ error: "Interview not found" });
    if (interview.status === "completed") return res.status(400).json({ error: "Interview already completed" });

    await finalizeInterview(interview);
    await interview.save();
    await logInterviewActivities(userId, interview);

    res.json({ interviewId: interview._id, status: "completed", finalReport: interview.finalReport });
  } catch (err) {
    console.error("End interview error:", err);
    res.status(500).json({ error: "Failed to end interview", details: err.message });
  }
}

// GET /api/interview/history
async function getInterviewHistory(req, res) {
  try {
    const interviews = await Interview.find({ userId: req.user.id })
      .select("category difficulty numQuestions status finalReport.overallScore createdAt completedAt")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ interviews });
  } catch (err) {
    console.error("Interview history error:", err);
    res.status(500).json({ error: "Failed to fetch interview history", details: err.message });
  }
}

// GET /api/interview/:id
async function getInterview(req, res) {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.user.id });
    if (!interview) return res.status(404).json({ error: "Interview not found" });
    res.json(interview);
  } catch (err) {
    console.error("Get interview error:", err);
    res.status(500).json({ error: "Failed to fetch interview", details: err.message });
  }
}

export { startInterview, submitAnswer, endInterview, getInterviewHistory, getInterview };