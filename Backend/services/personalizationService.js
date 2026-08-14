import Skill from "../models/Skill.js";
import CareerScore from "../models/CareerScore.js";
import Mistake from "../models/Mistake.js";
import Project from "../models/Project.js";
import Resume from "../models/Resume.js";

// Builds a compact, factual summary of the user's SigmaGPT activity across every
// system, for injection into the main chat's system prompt. Read-only — never
// writes anything, and every fact here traces back to data computed elsewhere
// (Skill scores, Career Readiness snapshot, Mistake Bank, Projects, Resume).
async function buildPersonalizationContext(userId) {
  const [skills, latestCareerScore, repeatedMistakes, projects, resume] = await Promise.all([
    Skill.find({ userId, topicScores: { $exists: true, $not: { $size: 0 } } }).select("name score"),
    CareerScore.findOne({ userId }).sort({ createdAt: -1 }),
    Mistake.find({ userId, status: "needs_revision", attempts: { $gte: 2 } })
      .sort({ attempts: -1 })
      .limit(5)
      .select("skill topic attempts"),
    Project.find({ userId }).select("name progressPercentage").limit(10),
    Resume.findOne({ userId }).select("analysis.score"),
  ]);

  if (skills.length === 0 && !latestCareerScore && repeatedMistakes.length === 0 && projects.length === 0 && !resume) {
    return null; // brand new user — nothing to personalize with yet
  }

  const lines = [
    "The following is real activity data about this specific user from the SigmaGPT platform. Use it only when it's actually relevant to what they're asking — don't force it into unrelated answers, and never invent numbers beyond what's given here.",
  ];

  if (skills.length > 0) {
    lines.push(`Skill scores: ${skills.map((s) => `${s.name} ${s.score}%`).join(", ")}.`);
  }
  if (latestCareerScore) {
    lines.push(`Overall Career Readiness: ${latestCareerScore.overallScore}%.`);
  }
  if (repeatedMistakes.length > 0) {
    lines.push(
      `Topics they've repeatedly struggled with: ${repeatedMistakes
        .map((m) => `${m.skill} → ${m.topic} (${m.attempts} attempts)`)
        .join(", ")}.`
    );
  }
  if (projects.length > 0) {
    lines.push(`Active projects: ${projects.map((p) => `${p.name} (${p.progressPercentage}% complete)`).join(", ")}.`);
  }
  if (resume) {
    lines.push(`Resume score: ${resume.analysis.score}%.`);
  }

  return lines.join("\n");
}

export { buildPersonalizationContext };