import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  reviewCode, debugCode, startHintSession, revealHintLevel, finishHintSession, getCodingHistory,
} from "../controllers/codingLabController.js";

const router = express.Router();

router.post("/review", authMiddleware, reviewCode);
router.post("/debug", authMiddleware, debugCode);
router.post("/hint/start", authMiddleware, startHintSession);
router.post("/hint/:submissionId/reveal", authMiddleware, revealHintLevel);
router.post("/hint/:submissionId/finish", authMiddleware, finishHintSession);
router.get("/history", authMiddleware, getCodingHistory);

export default router;