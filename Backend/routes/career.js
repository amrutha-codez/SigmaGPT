import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { submitResume, getResume, analyzeJobMatch, getJobMatchHistory } from "../controllers/careerController.js";

const router = express.Router();

router.post("/resume", authMiddleware, submitResume);
router.get("/resume", authMiddleware, getResume);
router.post("/job-match", authMiddleware, analyzeJobMatch);
router.get("/job-match/history", authMiddleware, getJobMatchHistory);

export default router;