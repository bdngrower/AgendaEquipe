import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // CORS setup
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const { dataSummary, systemPrompt } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_AI_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: "API key not configured in Vercel" });
      }

      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: systemPrompt + "\n\n" + dataSummary }] }
        ],
        config: {
          temperature: 0.2,
          systemInstruction: "Você é um especialista em logística de suporte técnico.",
        }
      });
      
      return res.status(200).json({ insights: response.text });
    } catch (error) {
      console.error("Insights API Error:", error);
      return res.status(500).json({ error: "Failed to generate insights" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
