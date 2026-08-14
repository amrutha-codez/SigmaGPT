import mongoose from "mongoose";

const JobMatchSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    jobDescription: { type: String, required: true },
    resumeSnapshotSkills: { type: [String], default: [] },
    requiredSkills: { type: [String], default: [] },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    matchPercentage: { type: Number, required: true, min: 0, max: 100 },
    applicationReadiness: { type: String, required: true },
    relevantProjects: { type: [String], default: [] },
    weakAreas: { type: [String], default: [] },
    recommendedLearningTopics: { type: [String], default: [] },
    narrativeSummary: { type: String, default: "" },
  },
  { timestamps: true }
);

JobMatchSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("JobMatch", JobMatchSchema);