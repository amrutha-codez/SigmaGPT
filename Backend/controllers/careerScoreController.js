import CareerScore from "../models/CareerScore.js";
import { computeCareerReadiness } from "../services/careerReadinessService.js";
import { askAIJSON } from "../services/aiService.js";

// GET /api/career-score
async function getCareerReadiness(req, res) {
  try {
    const userId = req.user.id;
    const { categories, overallScore, categoriesWithData, totalCategories } = await computeCareerReadiness(userId);

    let aiInsights = {
      summary: "Keep building activity across each area to unlock a fuller readiness picture.",
      strongestArea: "",
      weakestArea: "",
      recommendations: [],
    };

    try {
      aiInsights = await askAIJSON({
        prompt: `Career readiness categories and scores (null means no data yet, not a zero score): ${JSON.stringify(categories)}. Overall Career Readiness: ${overallScore}% (based on ${categoriesWithData} of ${totalCategories} categories with data).`,
        system:
          "You are a career coach summarizing a deterministic readiness report. Never invent or restate a different score than what is given. If a category is null, mention it as an area with no data yet rather than a weakness. Be specific and reference the actual category names and numbers given.",
        jsonInstruction: `Respond with JSON exactly in this shape:
{
  "summary": string (2-3 sentences),
  "strongestArea": string (a category name from the data, or empty string if no data),
  "weakestArea": string (a category name with real non-null data that's lowest, or empty string if no data),
  "recommendations": string[] (2-4 specific, actionable items)
}`,
        maxTokens: 500,
      });
    } catch (err) {
      console.error("Career readiness AI insight failed:", err.message);
    }

    const snapshot = await CareerScore.create({
      userId,
      categories,
      overallScore,
      aiSummary: aiInsights.summary,
      strongestArea: aiInsights.strongestArea,
      weakestArea: aiInsights.weakestArea,
      recommendations: aiInsights.recommendations,
    });

    res.json({ categories, overallScore, categoriesWithData, totalCategories, aiInsights, snapshotId: snapshot._id });
  } catch (err) {
    console.error("Career readiness error:", err);
    res.status(500).json({ error: "Failed to compute career readiness", details: err.message });
  }
}

// GET /api/career-score/history
async function getCareerScoreHistory(req, res) {
  try {
    const snapshots = await CareerScore.find({ userId: req.user.id })
      .select("overallScore categories createdAt")
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({ snapshots });
  } catch (err) {
    console.error("Career score history error:", err);
    res.status(500).json({ error: "Failed to fetch career score history", details: err.message });
  }
}

export { getCareerReadiness, getCareerScoreHistory };