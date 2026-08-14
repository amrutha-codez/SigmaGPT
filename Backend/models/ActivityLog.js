import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    skill: { type: String, required: true },
    topic: { type: String, required: true },
    source: {
      type: String,
      enum: ["study", "coding", "interview", "manual"],
      default: "manual",
    },
    activityType: {
      type: String,
      enum: ["quiz", "coding_problem", "interview_question", "other"],
      default: "other",
    },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    correct: { type: Boolean, required: true },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ userId: 1, skill: 1 });

export default mongoose.model("ActivityLog", ActivityLogSchema);