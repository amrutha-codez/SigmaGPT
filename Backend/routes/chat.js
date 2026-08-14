import express from "express";
import Thread from "../models/Thread.js";
import getOpenAIAPIResponse from "../utils/openai.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { buildPersonalizationContext } from "../services/personalizationService.js";

const router = express.Router();

// Get all threads
router.get("/thread", authMiddleware, async (req, res) => {
  try {
    const threads = await Thread.find({
      userId: req.user.id,
    }).sort({ updatedAt: -1 });

    res.json(threads);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch threads",
      details: err.message,
    });
  }
});

// Get messages of a thread
router.get("/thread/:threadId", authMiddleware, async (req, res) => {
  const { threadId } = req.params;

  try {
    const thread = await Thread.findOne({
      threadId,
      userId: req.user.id,
    });

    if (!thread) {
      return res.status(404).json({
        error: "Thread not found",
      });
    }

    res.json(thread.messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch chat",
      details: err.message,
    });
  }
});

// Delete thread
router.delete("/thread/:threadId", authMiddleware, async (req, res) => {
  const { threadId } = req.params;

  try {
    const deletedThread = await Thread.findOneAndDelete({
      threadId,
      userId: req.user.id,
    });

    if (!deletedThread) {
      return res.status(404).json({
        error: "Thread not found",
      });
    }

    res.status(200).json({
      success: "Thread deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to delete thread",
      details: err.message,
    });
  }
});

// Chat Route
router.post("/chat", authMiddleware, async (req, res) => {
  const { threadId, message } = req.body;

  if (!threadId || !message) {
    return res.status(400).json({
      error: "Missing required fields",
    });
  }

  try {
    let thread = await Thread.findOne({
      threadId,
      userId: req.user.id,
    });

    if (!thread) {
      thread = new Thread({
        userId: req.user.id,
        threadId,
        title: message,
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      });
    } else {
      thread.messages.push({
        role: "user",
        content: message,
      });
    }

    // Build a personalization context from the user's activity across every
    // SigmaGPT system (Skill Dashboard, Career Readiness, Mistake Bank, Projects,
    // Resume) so chat answers can reference real data when relevant.
    let systemPrompt;
    try {
      systemPrompt = await buildPersonalizationContext(req.user.id);
    } catch (err) {
      console.error("Failed to build personalization context:", err.message);
      systemPrompt = undefined;
    }

    const assistantReply = await getOpenAIAPIResponse(message, systemPrompt);

    thread.messages.push({
      role: "assistant",
      content: assistantReply,
    });

    thread.updatedAt = Date.now();

    await thread.save();

    res.status(200).json({
      threadId: thread.threadId,
      reply: assistantReply,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to process chat",
      details: err.message,
    });
  }
});

export default router;