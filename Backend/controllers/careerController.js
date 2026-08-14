import Resume from "../models/Resume.js";
import JobMatch from "../models/JobMatch.js";
import { analyzeResume, extractRequiredSkills, generateJobMatchExtras } from "../services/careerToolsService.js";

function normalize(s) {
  return s.trim().toLowerCase();
}

// Fully deterministic — no AI involved in this calculation.
function computeSkillMatch(resumeSkills, requiredSkills) {
  const resumeList = resumeSkills.map(normalize);
  const matched = [];
  const missing = [];

  for (const skill of requiredSkills) {
    const norm = normalize(skill);
    const isMatch = resumeList.some((r) => r === norm || r.includes(norm) || norm.includes(r));
    if (isMatch) matched.push(skill);
    else missing.push(skill);
  }

  const percentage = requiredSkills.length > 0 ? Math.round((matched.length / requiredSkills.length) * 100) : 0;
  return { matched, missing, percentage };
}

function readinessLabel(pct) {
  if (pct >= 80) return "Strong Fit — ready to apply";
  if (pct >= 50) return "Good Fit — some preparation recommended";
  return "Needs Preparation — significant skill gaps";
}

// POST /api/career/resume
async function submitResume(req, res) {
  try {
    const userId = req.user.id;
    const { resumeText } = req.body;

    if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 50) {
      return res.status(400).json({ error: "resumeText is required and should be at least 50 characters" });
    }

    let analysis;
    try {
      analysis = await analyzeResume(resumeText);
    } catch (err) {
      console.error("Resume analysis failed:", err.message);
      return res.status(502).json({ error: "Failed to analyze resume", details: err.message });
    }

    const resume = await Resume.findOneAndUpdate(
      { userId },
      { userId, rawText: resumeText, analysis },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ resume });
  } catch (err) {
    console.error("Submit resume error:", err);
    res.status(500).json({ error: "Failed to submit resume", details: err.message });
  }
}

// GET /api/career/resume
async function getResume(req, res) {
  try {
    const resume = await Resume.findOne({ userId: req.user.id });
    if (!resume) return res.status(404).json({ error: "No resume on file yet" });
    res.json({ resume });
  } catch (err) {
    console.error("Get resume error:", err);
    res.status(500).json({ error: "Failed to fetch resume", details: err.message });
  }
}

// POST /api/career/job-match
async function analyzeJobMatch(req, res) {
  try {
    const userId = req.user.id;
    const { jobDescription } = req.body;

    if (!jobDescription || typeof jobDescription !== "string" || jobDescription.trim().length < 30) {
      return res.status(400).json({ error: "jobDescription is required and should be at least 30 characters" });
    }

    const resume = await Resume.findOne({ userId });
    if (!resume) {
      return res.status(400).json({ error: "Please analyze your resume first before running a job match." });
    }

    let requiredSkills;
    try {
      requiredSkills = await extractRequiredSkills(jobDescription);
    } catch (err) {
      console.error("Skill extraction failed:", err.message);
      return res.status(502).json({ error: "Failed to analyze job description", details: err.message });
    }

    const { matched, missing, percentage } = computeSkillMatch(resume.analysis.skills, requiredSkills);
    const applicationReadiness = readinessLabel(percentage);

    let extras = { relevantProjects: [], weakAreas: [], recommendedLearningTopics: [], narrativeSummary: "" };
    try {
      extras = await generateJobMatchExtras({
        resumeText: resume.rawText,
        jobDescription,
        matchedSkills: matched,
        missingSkills: missing,
        matchPercentage: percentage,
      });
    } catch (err) {
      console.error("Job match extras generation failed:", err.message);
    }

    const jobMatch = await JobMatch.create({
      userId,
      jobDescription,
      resumeSnapshotSkills: resume.analysis.skills,
      requiredSkills,
      matchedSkills: matched,
      missingSkills: missing,
      matchPercentage: percentage,
      applicationReadiness,
      relevantProjects: extras.relevantProjects,
      weakAreas: extras.weakAreas,
      recommendedLearningTopics: extras.recommendedLearningTopics,
      narrativeSummary: extras.narrativeSummary,
    });

    res.status(201).json({ jobMatch });
  } catch (err) {
    console.error("Job match error:", err);
    res.status(500).json({ error: "Failed to analyze job match", details: err.message });
  }
}

// GET /api/career/job-match/history
async function getJobMatchHistory(req, res) {
  try {
    const matches = await JobMatch.find({ userId: req.user.id })
      .select("jobDescription matchPercentage applicationReadiness createdAt")
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({ matches });
  } catch (err) {
    console.error("Job match history error:", err);
    res.status(500).json({ error: "Failed to fetch job match history", details: err.message });
  }
}

export { submitResume, getResume, analyzeJobMatch, getJobMatchHistory };