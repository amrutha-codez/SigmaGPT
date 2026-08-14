import mongoose from "mongoose";

const MISTAKE_TYPES = ["quiz", "coding", "debugging", "interview"];
const REVISION_STATUSES = ["needs_revision", "in_progress", "resolved"];

const MistakeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    skill: { type: String, required: true },
    topic: { type: String, required: true },
    mistakeType: { type: String, enum: MISTAKE_TYPES, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },

    questionOrProblem: { type: String, required: true },
    userAnswer: { type: String, default: "" },
    correctAnswerOrSolution: { type: String, default: "" },
    explanation: { type: String, default: "" },

    sourceType: { type: String, enum: ["study", "coding", "interview"], required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    revisionSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "StudySession", default: null },

    attempts: { type: Number, default: 1 },
    status: { type: String, enum: REVISION_STATUSES, default: "needs_revision" },
    lastAttemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

MistakeSchema.index({ userId: 1, skill: 1, topic: 1 });
MistakeSchema.index({ userId: 1, status: 1 });

export { MISTAKE_TYPES, REVISION_STATUSES };
export default mongoose.model("Mistake", MistakeSchema);