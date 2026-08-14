import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { startInterview, submitAnswer, endInterview, getInterviewHistory, getInterview } from "../controllers/interviewController.js";

const router = express.Router();

router.post("/start", authMiddleware, startInterview);
router.post("/:id/answer", authMiddleware, submitAnswer);
router.post("/:id/end", authMiddleware, endInterview);
router.get("/history", authMiddleware, getInterviewHistory);
router.get("/:id", authMiddleware, getInterview);

export default router;