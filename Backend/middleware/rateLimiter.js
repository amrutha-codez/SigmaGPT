import rateLimit from "express-rate-limit";

// Applied globally to all /api routes. Generous enough for normal use — including
// the AI-heavy features (Study, Coding Lab, Interview, Career Tools, Project
// Mentor) — but blocks scripted hammering of the API, which matters since every
// one of those requests costs real money via Groq/Anthropic.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please slow down and try again shortly." },
});

// Stricter limiter available if you want to apply it to specific AI-heavy
// routers individually later (not wired up by default in this phase).
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests — please slow down and try again shortly." },
});

export { generalLimiter, aiLimiter };