import { askAIJSON } from "./aiService.js";
import INTERVIEW_TOPICS from "../utils/interviewTopics.js";

function pickTopic(category, excludeTopics = []) {
  const catalog = INTERVIEW_TOPICS[category] || ["General"];
  const remaining = catalog.filter((t) => !excludeTopics.includes(t));
  const pool = remaining.length > 0 ? remaining : catalog;
  return pool[Math.floor(Math.random() * pool.length)];
}

function validateQuestion(q) {
  if (!q || typeof q.question !== "string" || !q.question.trim()) {
    throw new Error("Invalid question generated");
  }
}

async function generateQuestion({ category, difficulty, topic }) {
  const result = await askAIJSON({
    prompt: `Generate one interview question for category "${category}", topic "${topic}", difficulty "${difficulty}".`,
    system: "You are an experienced technical interviewer. Ask one clear, focused question appropriate to the topic and difficulty. Do not include the answer.",
    jsonInstruction: 'Respond with JSON: { "question": string }',
    maxTokens: 300,
  });
  validateQuestion(result);
  return result.question;
}

function validateEvaluation(e) {
  const errors = [];
  if (!e || typeof e !== "object") throw new Error("AI response was not an object");
  for (const field of ["technicalKnowledge", "problemSolving", "answerQuality", "communication"]) {
    if (typeof e[field] !== "number" || e[field] < 0 || e[field] > 100) errors.push(`${field} must be a number between 0 and 100`);
  }
  if (typeof e.feedback !== "string" || !e.feedback.trim()) errors.push("feedback must be a non-empty string");
  if (typeof e.followUpNeeded !== "boolean") errors.push("followUpNeeded must be a boolean");
  if (e.followUpNeeded && (typeof e.followUpQuestion !== "string" || !e.followUpQuestion.trim())) {
    errors.push("followUpQuestion is required when followUpNeeded is true");
  }
  if (errors.length > 0) throw new Error(`Invalid evaluation: ${errors.join("; ")}`);
}

async function evaluateAnswer({ category, topic, question, difficulty, answer }) {
  const result = await askAIJSON({
    prompt: `Category: ${category}\nTopic: ${topic}\nDifficulty: ${difficulty}\nQuestion: ${question}\nCandidate's answer: ${answer}`,
    system:
      "You are an experienced technical interviewer evaluating a candidate's answer honestly and fairly. Be specific in your feedback. Decide if a follow-up question would meaningfully probe deeper on this same topic, or if it's time to move on.",
    jsonInstruction: `Respond with JSON exactly in this shape:
{
  "technicalKnowledge": number (0-100),
  "problemSolving": number (0-100),
  "answerQuality": number (0-100),
  "communication": number (0-100),
  "feedback": string (2-3 sentences, specific to this answer),
  "followUpNeeded": boolean,
  "followUpQuestion": string (required if followUpNeeded is true, else empty string)
}`,
    maxTokens: 600,
  });
  validateEvaluation(result);
  return result;
}

export { pickTopic, generateQuestion, evaluateAnswer };