import { askAIJSON } from "./aiService.js";

// Validates the AI's JSON before it's ever saved to the database.
function validateStudyContent(content) {
  const errors = [];

  if (!content || typeof content !== "object") {
    throw new Error("AI response was not an object");
  }

  for (const field of ["conceptExplanation", "simpleExample", "realWorldExample"]) {
    if (typeof content[field] !== "string" || !content[field].trim()) {
      errors.push(`${field} must be a non-empty string`);
    }
  }

  if (!Array.isArray(content.importantPoints) || content.importantPoints.length === 0) {
    errors.push("importantPoints must be a non-empty array");
  }

  function validateQuestionSet(name, arr, minCount) {
    if (!Array.isArray(arr) || arr.length < minCount) {
      errors.push(`${name} must be an array with at least ${minCount} item(s)`);
      return;
    }
    arr.forEach((q, idx) => {
      if (typeof q.question !== "string" || !q.question.trim()) {
        errors.push(`${name}[${idx}].question is invalid`);
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`${name}[${idx}].options is invalid`);
      }
      if (
        typeof q.correctIndex !== "number" ||
        q.correctIndex < 0 ||
        q.correctIndex >= (q.options?.length || 0)
      ) {
        errors.push(`${name}[${idx}].correctIndex is invalid`);
      }
    });
  }

  validateQuestionSet("mcqs", content.mcqs, 2);
  validateQuestionSet("miniTest", content.miniTest, 2);

  if (!Array.isArray(content.practiceQuestions) || content.practiceQuestions.length === 0) {
    errors.push("practiceQuestions must be a non-empty array");
  }

  if (
    !content.codingProblem ||
    typeof content.codingProblem.title !== "string" ||
    typeof content.codingProblem.description !== "string"
  ) {
    errors.push("codingProblem is invalid");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid study content: ${errors.join("; ")}`);
  }
}

async function generateStudyContent({ subject, topic, difficulty }) {
  const content = await askAIJSON({
    prompt: `Generate a complete study module for:
Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}`,
    system:
      "You are an expert coding tutor creating study material. Be accurate, concise, and appropriate for the requested difficulty level. Never invent incorrect technical facts.",
    jsonInstruction: `Respond with JSON exactly in this shape:
{
  "conceptExplanation": string,
  "simpleExample": string,
  "realWorldExample": string,
  "importantPoints": string[] (3-6 items),
  "mcqs": [ { "question": string, "options": string[] (exactly 4), "correctIndex": number (0-3), "explanation": string } ] (exactly 3 items),
  "practiceQuestions": [ { "question": string } ] (exactly 2 items),
  "codingProblem": { "title": string, "description": string, "constraints": string, "sampleInput": string, "sampleOutput": string },
  "miniTest": [ { "question": string, "options": string[] (exactly 4), "correctIndex": number (0-3) } ] (exactly 3 items)
}`,
    maxTokens: 2500,
  });

  validateStudyContent(content);
  return content;
}

export { generateStudyContent, validateStudyContent };