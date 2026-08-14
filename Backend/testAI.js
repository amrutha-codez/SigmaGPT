import "dotenv/config";
import { askAI, askAIJSON, currentAIProvider } from "./services/aiService.js";

const run = async () => {
  console.log(`Testing AI service with provider: "${currentAIProvider}"\n`);

  try {
    console.log("Testing plain text response...");
    const reply = await askAI({
      prompt: "Reply with one short sentence confirming you're working.",
    });
    console.log("✅ Text response:", reply);

    console.log("\nTesting structured JSON response...");
    const json = await askAIJSON({
      prompt: "Give me a sample skill score for Java.",
      jsonInstruction: 'Respond with JSON: { "skill": string, "score": number }',
    });
    console.log("✅ JSON response:", json);
  } catch (err) {
    console.error("❌ AI service test failed:", err.message);
    process.exit(1);
  }
};

run();