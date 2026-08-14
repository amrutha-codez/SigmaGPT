import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { startStudySession, getStudySession, submitStudySession, getStudyHistory } from "../controllers/studyController.js";

const router = express.Router();

router.post("/start", authMiddleware, startStudySession);
router.get("/history", authMiddleware, getStudyHistory);
router.get("/:sessionId", authMiddleware, getStudySession);
router.post("/:sessionId/submit", authMiddleware, submitStudySession);

export default router;