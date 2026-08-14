import mongoose from "mongoose";

const SKILL_NAMES = [
  "Java",
  "DSA",
  "React",
  "Node.js",
  "Express",
  "MongoDB",
  "Full Stack",
  "Problem Solving",
  "Interview Skills",
];

const TopicScoreSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    correct: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const SkillSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, enum: SKILL_NAMES, required: true },
    score: { type: Number, default: 0, min: 0, max: 100 },
    previousScore: { type: Number, default: 0, min: 0, max: 100 },
    topicScores: { type: [TopicScoreSchema], default: [] },
    lastActivityAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SkillSchema.index({ userId: 1, name: 1 }, { unique: true });

export { SKILL_NAMES };
export default mongoose.model("Skill", SkillSchema);