import Mistake from "../models/Mistake.js";

// If an open mistake already exists for this exact skill+topic+type, bump its
// attempt count instead of creating a duplicate. Otherwise start a new record.
async function recordMistake({
  userId, skill, topic, mistakeType, difficulty,
  questionOrProblem, userAnswer, correctAnswerOrSolution, explanation,
  sourceType, sourceId,
}) {
  const existing = await Mistake.findOne({
    userId, skill, topic, mistakeType, status: { $in: ["needs_revision", "in_progress"] },
  });

  if (existing) {
    existing.attempts += 1;
    existing.questionOrProblem = questionOrProblem;
    existing.userAnswer = userAnswer;
    existing.correctAnswerOrSolution = correctAnswerOrSolution;
    existing.explanation = explanation;
    existing.difficulty = difficulty;
    existing.sourceType = sourceType;
    existing.sourceId = sourceId;
    existing.lastAttemptedAt = new Date();
    // Struggling again — bump back to needs_revision even if a revision was in progress.
    existing.status = "needs_revision";
    await existing.save();
    return existing;
  }

  return Mistake.create({
    userId, skill, topic, mistakeType, difficulty,
    questionOrProblem, userAnswer, correctAnswerOrSolution, explanation,
    sourceType, sourceId, attempts: 1, status: "needs_revision", lastAttemptedAt: new Date(),
  });
}

export { recordMistake };