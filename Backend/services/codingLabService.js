import { askAIJSON } from "./aiService.js";

function validateReviewResult(r) {
  const errors = [];
  if (!r || typeof r !== "object") throw new Error("AI response was not an object");

  for (const field of ["correctness", "codeQuality", "readability", "timeComplexity", "spaceComplexity", "interviewSuitability"]) {
    if (typeof r[field] !== "string" || !r[field].trim()) errors.push(`${field} must be a non-empty string`);
  }
  for (const field of ["bugs", "optimizationOpportunities", "bestPractices"]) {
    if (!Array.isArray(r[field])) errors.push(`${field} must be an array`);
  }
  if (typeof r.overallScore !== "number" || r.overallScore < 0 || r.overallScore > 100) {
    errors.push("overallScore must be a number between 0 and 100");
  }
  if (errors.length > 0) throw new Error(`Invalid review result: ${errors.join("; ")}`);
}

async function generateCodeReview({ language, code }) {
  const result = await askAIJSON({
    prompt: `Review this ${language} code:\n\n${code}`,
    system:
      "You are a senior software engineer performing a thorough, honest code review. Be specific and reference actual patterns from the submitted code. Do not invent issues that aren't present, and do not withhold real ones.",
    jsonInstruction: `Respond with JSON exactly in this shape:
{
  "correctness": string,
  "bugs": string[],
  "codeQuality": string,
  "readability": string,
  "timeComplexity": string,
  "spaceComplexity": string,
  "optimizationOpportunities": string[],
  "bestPractices": string[],
  "interviewSuitability": string,
  "overallScore": number (0-100, your holistic assessment)
}`,
    maxTokens: 1800,
  });
  validateReviewResult(result);
  return result;
}

function validateDebugResult(r) {
  const errors = [];
  if (!r || typeof r !== "object") throw new Error("AI response was not an object");
  for (const field of ["errorIdentification", "explanation", "rootCause", "correctedCode", "fixExplanation", "similarPracticeProblem"]) {
    if (typeof r[field] !== "string" || !r[field].trim()) errors.push(`${field} must be a non-empty string`);
  }
  if (errors.length > 0) throw new Error(`Invalid debug result: ${errors.join("; ")}`);
}

async function generateDebugResult({ language, code, errorMessage }) {
  const result = await askAIJSON({
    prompt: `Language: ${language}\n\nCode:\n${code}\n\nError message:\n${errorMessage}`,
    system:
      "You are an expert debugger. Diagnose the real root cause, don't guess wildly, and provide a corrected version of the actual submitted code rather than a rewrite from scratch unless truly necessary.",
    jsonInstruction: `Respond with JSON exactly in this shape:
{
  "errorIdentification": string,
  "explanation": string,
  "rootCause": string,
  "correctedCode": string,
  "fixExplanation": string,
  "similarPracticeProblem": string
}`,
    maxTokens: 1800,
  });
  validateDebugResult(result);
  return result;
}

function validateHints(hints) {
  if (!Array.isArray(hints) || hints.length !== 5) {
    throw new Error("hints must be an array of exactly 5 items");
  }
  hints.forEach((h, idx) => {
    if (typeof h.hint !== "string" || !h.hint.trim()) {
      throw new Error(`hints[${idx}].hint must be a non-empty string`);
    }
  });
}

async function generateHintLevels({ problemStatement, language }) {
  const result = await askAIJSON({
    prompt: `Problem: ${problemStatement}\nLanguage: ${language || "any"}`,
    system:
      "You are a coding mentor providing progressive hints. Each level must build on the previous one without repeating it, and only level 5 may reveal the full solution.",
    jsonInstruction: `Respond with JSON exactly in this shape:
{
  "hints": [
    { "level": 1, "hint": string (small nudge, no approach revealed) },
    { "level": 2, "hint": string (stronger hint, still no full approach) },
    { "level": 3, "hint": string (describes the general approach/strategy) },
    { "level": 4, "hint": string (pseudocode, not real code) },
    { "level": 5, "hint": string (full working solution with explanation) }
  ]
}`,
    maxTokens: 2000,
  });
  validateHints(result.hints);
  return result.hints;
}

export { generateCodeReview, generateDebugResult, generateHintLevels };