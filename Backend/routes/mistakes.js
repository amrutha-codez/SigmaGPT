import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getMistakes, getRepeatedMistakes, reviseMistake, resolveMistake } from "../controllers/mistakeController.js";

const router = express.Router();

router.get("/", authMiddleware, getMistakes);
router.get("/repeated", authMiddleware, getRepeatedMistakes);
router.post("/:id/revise", authMiddleware, reviseMistake);
router.post("/:id/resolve", authMiddleware, resolveMistake);

export default router;