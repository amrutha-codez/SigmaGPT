import mongoose from "mongoose";

const ReviewResultSchema = new mongoose.Schema(
  {
    correctness: { type: String, required: true },
    bugs: { type: [String], default: [] },
    codeQuality: { type: String, required: true },
    readability: { type: String, required: true },
    timeComplexity: { type: String, required: true },
    spaceComplexity: { type: String, required: true },
    optimizationOpportunities: { type: [String], default: [] },
    bestPractices: { type: [String], default: [] },
    interviewSuitability: { type: String, required: true },
    overallScore: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const DebugResultSchema = new mongoose.Schema(
  {
    errorIdentification: { type: String, required: true },
    explanation: { type: String, required: true },
    rootCause: { type: String, required: true },
    correctedCode: { type: String, required: true },
    fixExplanation: { type: String, required: true },
    similarPracticeProblem: { type: String, required: true },
  },
  { _id: false }
);

const HintLevelSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true },
    hint: { type: String, required: true },
  },
  { _id: false }
);

const HintSessionSchema = new mongoose.Schema(
  {
    problemStatement: { type: String, required: true },
    hints: { type: [HintLevelSchema], default: [] },
    maxLevelRevealed: { type: Number, default: 0 },
    finished: { type: Boolean, default: false },
  },
  { _id: false }
);

const CodeSubmissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mode: { type: String, enum: ["review", "debug", "hint"], required: true },
    skill: { type: String, required: true },
    topic: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    language: { type: String, default: "javascript" },

    code: { type: String, default: "" },
    errorMessage: { type: String, default: "" },

    reviewResult: { type: ReviewResultSchema, default: null },
    debugResult: { type: DebugResultSchema, default: null },
    hintSession: { type: HintSessionSchema, default: null },

    correct: { type: Boolean, default: null },
  },
  { timestamps: true }
);

CodeSubmissionSchema.index({ userId: 1, createdAt: -1 });
CodeSubmissionSchema.index({ userId: 1, mode: 1 });

export default mongoose.model("CodeSubmission", CodeSubmissionSchema);