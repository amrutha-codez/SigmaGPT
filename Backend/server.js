import express from "express";
import axios from "axios";
import cors from "cors";
import "dotenv/config";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import dashboardRoutes from "./routes/dashboard.js";
import studyRoutes from "./routes/study.js";
import codingLabRoutes from "./routes/codingLab.js";
import interviewRoutes from "./routes/interview.js";
import careerRoutes from "./routes/career.js";
import projectRoutes from "./routes/projects.js";
import careerScoreRoutes from "./routes/careerScore.js";
import mistakeRoutes from "./routes/mistakes.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
const app = express();
const PORT = 3000;

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json({ limit: "2mb" }));
app.use("/api", generalLimiter);

app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);
app.use("/api/user", userRoutes);
app.use("/api/dashboard",dashboardRoutes);
app.use("/api/study", studyRoutes);
app.use("/api/coding-lab", codingLabRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/career", careerRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/career-score", careerScoreRoutes);
app.use("/api/mistakes", mistakeRoutes);
// 404 handler — catches any unmatched API route.
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler — final safety net so unexpected errors return clean
// JSON instead of leaking stack traces or crashing the process.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: "Something went wrong",
    details: process.env.NODE_ENV === "production" ? undefined : err.message,
  });
});
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  connectDB();
});
const connectDB = async () => {
  try {
    console.log(process.env.MONGO_URL);
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Connected with Database!");
  } catch (err) {
    console.error("Database Connection Error:", err.message);
  }
};