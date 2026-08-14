import { askAI } from "./aiService.js";

async function askMentor({ project, question }) {
  const contextSummary = `
Project: ${project.name}
Description: ${project.description || "N/A"}
Tech Stack: ${project.techStack.join(", ") || "N/A"}
Goals: ${project.goals.join(", ") || "N/A"}
Features: ${project.features.join(", ") || "N/A"}
Components: ${project.components.map((c) => `${c.name}: ${c.status}`).join(", ") || "N/A"}
Completed Tasks: ${project.completedTasks.join(", ") || "N/A"}
Pending Tasks: ${project.pendingTasks.join(", ") || "N/A"}
Problems Encountered: ${project.problemsEncountered.join(", ") || "N/A"}
Progress: ${project.progressPercentage}%
`.trim();

  const recentHistory = project.mentorHistory
    .slice(-5)
    .map((h) => `Q: ${h.question}\nA: ${h.answer}`)
    .join("\n\n");

  const prompt = `${contextSummary}

${recentHistory ? `Recent mentor conversation:\n${recentHistory}\n\n` : ""}The developer asks: "${question}"`;

  const answer = await askAI({
    prompt,
    system:
      "You are an experienced senior engineer mentoring a developer on their personal project. Give specific, actionable advice grounded in the actual project details given — reference the real tech stack, components, and tasks. Avoid generic advice. Keep answers focused and practical, 3-6 sentences unless the question calls for a list.",
    maxTokens: 700,
  });

  return answer;
}

export { askMentor };