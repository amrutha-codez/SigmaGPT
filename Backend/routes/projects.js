import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  createProject, listProjects, getProject, updateProject, deleteProject, askProjectMentor,
} from "../controllers/projectController.js";

const router = express.Router();

router.post("/", authMiddleware, createProject);
router.get("/", authMiddleware, listProjects);
router.get("/:id", authMiddleware, getProject);
router.put("/:id", authMiddleware, updateProject);
router.delete("/:id", authMiddleware, deleteProject);
router.post("/:id/ask", authMiddleware, askProjectMentor);

export default router;