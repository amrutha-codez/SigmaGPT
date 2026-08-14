import Mistake from "../models/Mistake.js";
import StudySession from "../models/StudySession.js";
import { generateStudyContent } from "../services/studyContentService.js";
import { askAI } from "../services/aiService.js";

const REPEATED_THRESHOLD = 3;

// GET /api/mistakes
async function getMistakes(req, res) {
  try {
    const { status } = req.query;
    const filter = { userId: req.user.id };
    if (status) filter.status = status;
    const mistakes = await Mistake.find(filter).sort({ lastAttemptedAt: -1 }).limit(100);
    res.json({ mistakes });
  } catch (err) {
    console.error("Get mistakes error:", err);
    res.status(500).json({ error: "Failed to fetch mistakes", details: err.message });
  }
}

// GET /api/mistakes/repeated
async function getRepeatedMistakes(req, res) {
  try {
    const userId = req.user.id;
    const repeated = await Mistake.find({
      userId, status: "needs_revision", attempts: { $gte: REPEATED_THRESHOLD },
    }).sort({ attempts: -1, lastAttemptedAt: -1 });

    let aiInsight = "";
    if (repeated.length > 0) {
      try {
        aiInsight = await askAI({
          prompt: `The user is repeatedly struggling with these topics (attempts shown): ${JSON.stringify(
            repeated.map((m) => ({ skill: m.skill, topic: m.topic, attempts: m.attempts }))
          )}. Write 1-2 sentences noting the pattern and encouraging them to do a revision session, referencing the actual topic names.`,
          system: "You are a supportive tutor noticing a real pattern in the data given. Do not invent topics not listed.",
          maxTokens: 200,
        });
      } catch (err) {
        console.error("Repeated mistakes AI insight failed:", err.message);
        aiInsight = "You have a few topics worth revisiting below.";
      }
    }

    res.json({ mistakes: repeated, aiInsight });
  } catch (err) {
    console.error("Get repeated mistakes error:", err);
    res.status(500).json({ error: "Failed to fetch repeated mistakes", details: err.message });
  }
}

// POST /api/mistakes/:id/revise — generates a real revision session via the
// existing Study System and links it back to this mistake for auto-resolution.
async function reviseMistake(req, res) {
  try {
    const userId = req.user.id;
    const mistake = await Mistake.findOne({ _id: req.params.id, userId });
    if (!mistake) return res.status(404).json({ error: "Mistake not found" });

    let content;
    try {
      content = await generateStudyContent({ subject: mistake.skill, topic: mistake.topic, difficulty: mistake.difficulty });
    } catch (err) {
      console.error("Revision content generation failed:", err.message);
      return res.status(502).json({ error: "Failed to generate revision session", details: err.message });
    }

    const session = await StudySession.create({
      userId, subject: mistake.skill, topic: mistake.topic, difficulty: mistake.difficulty, ...content,
    });

    mistake.status = "in_progress";
    mistake.revisionSessionId = session._id;
    await mistake.save();

    res.status(201).json({ sessionId: session._id, mistakeId: mistake._id });
  } catch (err) {
    console.error("Revise mistake error:", err);
    res.status(500).json({ error: "Failed to start revision", details: err.message });
  }
}

// POST /api/mistakes/:id/resolve — manual dismiss
async function resolveMistake(req, res) {
  try {
    const mistake = await Mistake.findOne({ _id: req.params.id, userId: req.user.id });
    if (!mistake) return res.status(404).json({ error: "Mistake not found" });
    mistake.status = "resolved";
    await mistake.save();
    res.json({ mistake });
  } catch (err) {
    console.error("Resolve mistake error:", err);
    res.status(500).json({ error: "Failed to resolve mistake", details: err.message });
  }
}

export { getMistakes, getRepeatedMistakes, reviseMistake, resolveMistake };