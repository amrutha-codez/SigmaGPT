import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getDashboard, postActivity, createGoal, toggleGoal } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/", authMiddleware, getDashboard);
router.post("/activity", authMiddleware, postActivity);
router.post("/goals", authMiddleware, createGoal);
router.patch("/goals/:id/toggle", authMiddleware, toggleGoal);

export default router;