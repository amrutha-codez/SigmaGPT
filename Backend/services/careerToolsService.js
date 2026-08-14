import { askAIJSON } from "./aiService.js";

function validateResumeAnalysis(a) {
  const errors = [];
  if (!a || typeof a !== "object") throw new Error("AI response was not an object");

  const arrayFields = [
    "skills", "projects", "experience", "education", "achievements",
    "technicalKeywords", "weakSections", "missingInformation",
    "strengths", "weaknesses", "suggestions", "missingSkills",
  ];
  for (const field of arrayFields) {
    if (!Array.isArray(a[field])) errors.push(`${field} must be an array`);
  }
  for (const field of ["atsFriendliness", "projectImpactAssessment", "overallQuality"]) {
    if (typeof a[field] !== "string" || !a[field].trim()) errors.push(`${field} must be a non-empty string`);
  }
  if (typeof a.score !== "number" || a.score < 0 || a.score > 100) {
    errors.push("score must be a number between 0 and 100");
  }
  if (errors.length > 0) throw new Error(`Invalid resume analysis: ${errors.join("; ")}`);
}

async function analyzeResume(rawText) {
  const result = await askAIJSON({
    prompt: `Analyze this resume:\n\n${rawText}`,
    system:
      "You are an expert technical resume reviewer and ATS specialist. Be honest and specific, referencing what is actually present or missing in this resume. Do not invent content that isn't there.",
    jsonInstruction: `Respond with JSON exactly in this shape:
{
  "skills": string[],
  "projects": string[],
  "experience": string[],
  "education": string[],
  "achievements": string[],
  "technicalKeywords": string[],
  "atsFriendliness": string,
  "weakSections": string[],
  "missingInformation": string[],
  "projectImpactAssessment": string,
  "overallQuality": string,
  "strengths": string[],
  "weaknesses": string[],
  "suggestions": string[],
  "missingSkills": string[],
  "score": number (0-100, your holistic assessment of overall resume quality)
}`,
    maxTokens: 2500,
  });
  validateResumeAnalysis(result);
  return result;
}

function validateRequiredSkills(r) {
  if (!r || !Array.isArray(r.requiredSkills) || r.requiredSkills.length === 0) {
    throw new Error("requiredSkills must be a non-empty array");
  }
  r.requiredSkills.forEach((s, idx) => {
    if (typeof s !== "string" || !s.trim()) throw new Error(`requiredSkills[${idx}] is invalid`);
  });
}

async function extractRequiredSkills(jobDescription) {
  const result = await askAIJSON({
    prompt: `Job description:\n\n${jobDescription}`,
    system: "Extract only concrete technical skills, tools, languages, and frameworks explicitly required or preferred. Do not include soft skills or vague phrases.",
    jsonInstruction: 'Respond with JSON: { "requiredSkills": string[] }',
    maxTokens: 500,
  });
  validateRequiredSkills(result);
  return result.requiredSkills;
}

function validateJobMatchExtras(r) {
  const errors = [];
  if (!r || typeof r !== "object") throw new Error("AI response was not an object");
  for (const field of ["relevantProjects", "weakAreas", "recommendedLearningTopics"]) {
    if (!Array.isArray(r[field])) errors.push(`${field} must be an array`);
  }
  if (typeof r.narrativeSummary !== "string" || !r.narrativeSummary.trim()) {
    errors.push("narrativeSummary must be a non-empty string");
  }
  if (errors.length > 0) throw new Error(`Invalid job match extras: ${errors.join("; ")}`);
}

async function generateJobMatchExtras({ resumeText, jobDescription, matchedSkills, missingSkills, matchPercentage }) {
  const result = await askAIJSON({
    prompt: `Resume:\n${resumeText}\n\nJob description:\n${jobDescription}\n\nDeterministically computed match: ${matchPercentage}%. Matched skills: ${JSON.stringify(matchedSkills)}. Missing skills: ${JSON.stringify(missingSkills)}.`,
    system:
      "You are a career coach. Using the match percentage and skill lists already computed (do not change or restate them as different numbers), identify which resume projects are most relevant to this job, what weak areas remain, what topics to learn next, and a short honest summary.",
    jsonInstruction: `Respond with JSON exactly in this shape:
{
  "relevantProjects": string[],
  "weakAreas": string[],
  "recommendedLearningTopics": string[],
  "narrativeSummary": string (2-3 sentences)
}`,
    maxTokens: 800,
  });
  validateJobMatchExtras(result);
  return result;
}

export { analyzeResume, extractRequiredSkills, generateJobMatchExtras };