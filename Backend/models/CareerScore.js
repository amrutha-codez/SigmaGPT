import mongoose from "mongoose";

const CareerScoreSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    categories: {
      DSA: { type: Number, default: null },
      Java: { type: Number, default: null },
      "Full Stack": { type: Number, default: null },
      Coding: { type: Number, default: null },
      Projects: { type: Number, default: null },
      Interview: { type: Number, default: null },
      Resume: { type: Number, default: null },
      "Problem Solving": { type: Number, default: null },
    },
    overallScore: { type: Number, required: true },
    aiSummary: { type: String, default: "" },
    strongestArea: { type: String, default: "" },
    weakestArea: { type: String, default: "" },
    recommendations: { type: [String], default: [] },
  },
  { timestamps: true }
);

CareerScoreSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("CareerScore", CareerScoreSchema);