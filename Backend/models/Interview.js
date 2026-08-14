import mongoose from "mongoose";

const INTERVIEW_CATEGORIES = ["Java", "DSA", "Full Stack", "DBMS", "OOP", "HR"];

const QuestionEvaluationSchema = new mongoose.Schema(
  {
    technicalKnowledge: { type: Number, required: true, min: 0, max: 100 },
    problemSolving: { type: Number, required: true, min: 0, max: 100 },
    answerQuality: { type: Number, required: true, min: 0, max: 100 },
    communication: { type: Number, required: true, min: 0, max: 100 },
    feedback: { type: String, required: true },
  },
  { _id: false }
);

const InterviewQuestionSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    topic: { type: String, required: true },
    question: { type: String, required: true },
    isFollowUp: { type: Boolean, default: false },
    answer: { type: String, default: null },
    evaluation: { type: QuestionEvaluationSchema, default: null },
    correct: { type: Boolean, default: null },
  },
  { _id: false }
);

const TopicScoreSchema = new mongoose.Schema(
  { topic: { type: String, required: true }, avgScore: { type: Number, required: true } },
  { _id: false }
);

const FinalReportSchema = new mongoose.Schema(
  {
    technicalKnowledge: { type: Number, required: true },
    problemSolving: { type: Number, required: true },
    answerQuality: { type: Number, required: true },
    communication: { type: Number, required: true },
    overallScore: { type: Number, required: true },
    weakTopics: { type: [TopicScoreSchema], default: [] },
    strongTopics: { type: [TopicScoreSchema], default: [] },
    recommendedPractice: { type: [String], default: [] },
    aiSummary: { type: String, default: "" },
  },
  { _id: false }
);

const InterviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, enum: INTERVIEW_CATEGORIES, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    numQuestions: { type: Number, required: true },
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
    questions: { type: [InterviewQuestionSchema], default: [] },
    finalReport: { type: FinalReportSchema, default: null },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: null },
  },
  { timestamps: true }
);

InterviewSchema.index({ userId: 1, createdAt: -1 });

export { INTERVIEW_CATEGORIES };
export default mongoose.model("Interview", InterviewSchema);