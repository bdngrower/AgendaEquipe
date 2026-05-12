import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Groq from "groq-sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for AI Insights
  app.post("/api/insights", async (req, res) => {
    try {
      const { dataSummary } = req.body;
      const apiKey = process.env.VITE_AI_KEY || process.env.AI_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "AI Key (VITE_AI_KEY) not configured on server" });
      }

      const groq = new Groq({ apiKey });

      const prompt = `Analyze these business visit logistics data and provide 3 short, punchy insights in Portuguese about business performance, identifying trends or areas for improvement. Data: ${dataSummary}`;

      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama3-8b-8192", // A common and fast model string for Groq. Provide a solid default.
        temperature: 0.7,
        max_completion_tokens: 300,
      });

      const text = chatCompletion.choices[0]?.message?.content || "";

      res.json({ insights: text });
    } catch (error) {
      console.error("Groq API Error:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
