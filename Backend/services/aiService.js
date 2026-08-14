import "dotenv/config";

const REQUEST_TIMEOUT_MS = 30000;

const PROVIDER = (process.env.AI_PROVIDER || "groq").toLowerCase();

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-5";

// All AI service errors surface as this so callers/routes can handle them uniformly,
// regardless of which provider is behind the scenes.
class AIServiceError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message);
    this.name = "AIServiceError";
    this.status = status || 500;
    if (cause) this.cause = cause;
  }
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new AIServiceError("AI provider request timed out", { status: 504, cause: err });
    }
    throw new AIServiceError("Failed to reach AI provider", { status: 502, cause: err });
  } finally {
    clearTimeout(timeout);
  }
}

// ---- Groq adapter (OpenAI-compatible chat completions) ----
async function callGroq({ system, prompt, model, maxTokens, temperature }) {
  if (!process.env.GROQ_API_KEY) {
    throw new AIServiceError("GROQ_API_KEY is not configured", { status: 500 });
  }

  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const response = await fetchWithTimeout(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: model || GROQ_DEFAULT_MODEL,
      messages,
      max_tokens: maxTokens,
      ...(temperature !== undefined ? { temperature } : {}),
    }),
  });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new AIServiceError("Groq returned a non-JSON response", { status: 502, cause: err });
  }

  if (!response.ok) {
    const status = response.status === 429 ? 429 : 502;
    throw new AIServiceError(data?.error?.message || `Groq error (status ${response.status})`, {
      status,
      cause: data?.error,
    });
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new AIServiceError("Groq returned an empty response", { status: 502 });
  }

  return text;
}

// ---- Anthropic adapter (Messages API) ----
async function callAnthropic({ system, prompt, model, maxTokens, temperature }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AIServiceError("ANTHROPIC_API_KEY is not configured", { status: 500 });
  }

  const response = await fetchWithTimeout(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: model || ANTHROPIC_DEFAULT_MODEL,
      max_tokens: maxTokens || 2048,
      ...(system ? { system } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new AIServiceError("Anthropic returned a non-JSON response", { status: 502, cause: err });
  }

  if (!response.ok) {
    const status = response.status === 429 ? 429 : 502;
    throw new AIServiceError(data?.error?.message || `Anthropic error (status ${response.status})`, {
      status,
      cause: data?.error,
    });
  }

  const textBlock = Array.isArray(data?.content)
    ? data.content.find((block) => block.type === "text")
    : null;

  if (!textBlock?.text) {
    throw new AIServiceError("Anthropic returned an empty response", { status: 502 });
  }

  return textBlock.text;
}

async function callProvider(args) {
  if (PROVIDER === "anthropic") return callAnthropic(args);
  if (PROVIDER === "groq") return callGroq(args);
  throw new AIServiceError(`Unknown AI_PROVIDER "${PROVIDER}" (expected "groq" or "anthropic")`, {
    status: 500,
  });
}

/**
 * Plain text response from the configured AI provider.
 * Use for anything free-form: explanations, mentor answers, revision content.
 */
async function askAI({ prompt, system, model, maxTokens = 2048, temperature } = {}) {
  if (!prompt || typeof prompt !== "string") {
    throw new AIServiceError("prompt must be a non-empty string", { status: 400 });
  }
  return callProvider({ system, prompt, model, maxTokens, temperature });
}

// Strips ```json ... ``` or ``` ... ``` fences if the model wraps its output despite instructions.
function extractJSONCandidate(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

/**
 * Structured JSON response from the configured AI provider.
 * Use for anything the frontend needs to render predictably: scores, evaluations,
 * quiz questions, resume analysis, etc.
 *
 * `jsonInstruction` should describe the exact shape you want, e.g.:
 *   'Respond with JSON: { "score": number, "strengths": string[], "weaknesses": string[] }'
 */
async function askAIJSON({
  prompt,
  system,
  jsonInstruction,
  model,
  maxTokens = 2048,
  temperature,
} = {}) {
  if (!prompt || typeof prompt !== "string") {
    throw new AIServiceError("prompt must be a non-empty string", { status: 400 });
  }

  const jsonRule =
    "You must respond with ONLY valid JSON. No preamble, no explanation, no markdown code fences, no trailing commentary — the entire response must be a single parseable JSON value.";
  const combinedSystem = [system, jsonInstruction, jsonRule].filter(Boolean).join("\n\n");

  const text = await callProvider({ system: combinedSystem, prompt, model, maxTokens, temperature });
  const candidate = extractJSONCandidate(text);

  let parsed;
  try {
    parsed = JSON.parse(candidate);
  } catch (err) {
    throw new AIServiceError("AI provider returned malformed JSON", { status: 502, cause: err });
  }

  return parsed;
}

export { askAI, askAIJSON, AIServiceError, PROVIDER as currentAIProvider };