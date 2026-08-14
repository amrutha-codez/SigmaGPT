import mongoose from "mongoose";

const ResumeAnalysisSchema = new mongoose.Schema(
  {
    skills: { type: [String], default: [] },
    projects: { type: [String], default: [] },
    experience: { type: [String], default: [] },
    education: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    technicalKeywords: { type: [String], default: [] },
    atsFriendliness: { type: String, required: true },
    weakSections: { type: [String], default: [] },
    missingInformation: { type: [String], default: [] },
    projectImpactAssessment: { type: String, required: true },
    overallQuality: { type: String, required: true },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    suggestions: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    score: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const ResumeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    rawText: { type: String, required: true },
    analysis: { type: ResumeAnalysisSchema, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Resume", ResumeSchema);