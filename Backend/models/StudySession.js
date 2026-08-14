import mongoose from "mongoose";

const MCQSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true },
    explanation: { type: String, default: "" },
  },
  { _id: false }
);

const PracticeQuestionSchema = new mongoose.Schema(
  { question: { type: String, required: true } },
  { _id: false }
);

const CodingProblemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    constraints: { type: String, default: "" },
    sampleInput: { type: String, default: "" },
    sampleOutput: { type: String, default: "" },
  },
  { _id: false }
);

const AnswerSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    selectedIndex: { type: Number, required: true },
    correct: { type: Boolean, required: true },
  },
  { _id: false }
);

const StudySessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },

    conceptExplanation: { type: String, required: true },
    simpleExample: { type: String, required: true },
    realWorldExample: { type: String, required: true },
    importantPoints: { type: [String], default: [] },
    mcqs: { type: [MCQSchema], default: [] },
    practiceQuestions: { type: [PracticeQuestionSchema], default: [] },
    codingProblem: { type: CodingProblemSchema, default: null },
    miniTest: { type: [MCQSchema], default: [] },

    status: { type: String, enum: ["generated", "submitted"], default: "generated" },
    mcqAnswers: { type: [AnswerSchema], default: [] },
    miniTestAnswers: { type: [AnswerSchema], default: [] },
    codingSubmission: { type: String, default: "" },
    score: { type: Number, default: null },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

StudySessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("StudySession", StudySessionSchema);