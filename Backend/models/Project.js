import mongoose from "mongoose";

const ComponentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ["complete", "in_progress", "pending"], required: true },
  },
  { _id: false }
);

const MentorExchangeSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    askedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    techStack: { type: [String], default: [] },
    goals: { type: [String], default: [] },
    features: { type: [String], default: [] },
    components: { type: [ComponentSchema], default: [] },
    completedTasks: { type: [String], default: [] },
    pendingTasks: { type: [String], default: [] },
    problemsEncountered: { type: [String], default: [] },
    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    mentorHistory: { type: [MentorExchangeSchema], default: [] },
  },
  { timestamps: true }
);

ProjectSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model("Project", ProjectSchema);