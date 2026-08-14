import "dotenv/config";

const getOpenAIAPIResponse = async (message, systemPrompt) => {
  try {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: message });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Groq API Error");
    }

    return data.choices[0].message.content;
  } catch (err) {
    console.error("Groq Error:", err.message);
    throw err;
  }
};

export default getOpenAIAPIResponse;