import mongoose from "mongoose";

const GoalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["daily", "weekly"], required: true },
    description: { type: String, required: true },
    skill: { type: String, default: null },
    completed: { type: Boolean, default: false },
    // "2026-08-12" for daily goals, "2026-W33" for weekly goals — scopes goals to a period.
    periodKey: { type: String, required: true },
  },
  { timestamps: true }
);

GoalSchema.index({ userId: 1, type: 1, periodKey: 1 });

export default mongoose.model("Goal", GoalSchema);