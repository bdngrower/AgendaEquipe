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
      const { dataSummary, systemPrompt } = req.body;
      const apiKey = process.env.VITE_AI_KEY || process.env.AI_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "AI Key (VITE_AI_KEY) not configured on server" });
      }

      const groq = new Groq({ apiKey });

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "Você é um especialista em logística de suporte técnico." },
          { role: "user", content: systemPrompt || dataSummary }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.2,
        max_completion_tokens: 350,
      });

      const text = chatCompletion.choices[0]?.message?.content || "";

      res.json({ insights: text });
    } catch (error) {
      console.error("Groq API Error:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // In-memory store for technician locations
  const technicianLocations: Record<string, { latitude: number; longitude: number; timestamp: number; technicianId: string }> = {};

  // API Route to receive location from mobile app
  app.post("/api/location", (req, res) => {
    try {
      const { latitude, longitude, timestamp, technicianId } = req.body;
      
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: "Missing latitude or longitude" });
      }

      const techId = technicianId || "tech_mobile";
      
      technicianLocations[techId] = {
        latitude,
        longitude,
        timestamp: timestamp || Date.now(),
        technicianId: techId
      };
      
      res.json({ success: true, message: "Location updated" });
    } catch (error) {
      console.error("Location POST Error:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  // API Route to fetch latest locations for the dashboard
  app.get("/api/location", (req, res) => {
    res.json({ locations: Object.values(technicianLocations) });
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
