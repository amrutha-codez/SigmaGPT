import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getCareerReadiness, getCareerScoreHistory } from "../controllers/careerScoreController.js";

const router = express.Router();

router.get("/", authMiddleware, getCareerReadiness);
router.get("/history", authMiddleware, getCareerScoreHistory);

export default router;