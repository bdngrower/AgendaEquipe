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

  // API Route to receive location from mobile app
  app.post("/api/location", async (req, res) => {
    try {
      const { latitude, longitude, timestamp, technicianId } = req.body;
      
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: "Missing latitude or longitude" });
      }

      const techId = technicianId || "tech_mobile";
      
      // Import Firebase dynamically or read from config
      const fs = await import("fs");
      const pathModule = await import("path");
      const { initializeApp, getApps } = await import("firebase/app");
      const { getFirestore, doc, setDoc } = await import("firebase/firestore");
      
      const configPath = pathModule.resolve(process.cwd(), "firebase-applet-config.json");
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      
      let appInstance;
      if (!getApps().length) {
        appInstance = initializeApp(firebaseConfig);
      } else {
        appInstance = getApps()[0];
      }
      const db = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);

      await setDoc(doc(db, "technicianLocations", techId), {
        latitude,
        longitude,
        timestamp: timestamp || Date.now(),
        technicianId: techId
      });
      
      res.json({ success: true, message: "Location updated in Firebase" });
    } catch (error) {
      console.error("Location POST Error:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  // API Route to stop tracking
  app.post("/api/stop-tracking", async (req, res) => {
    try {
      const { technicianId, reason, timestamp } = req.body;
      
      if (!technicianId) {
        return res.status(400).json({ error: "Missing technicianId" });
      }
      
      const fs = await import("fs");
      const pathModule = await import("path");
      const { initializeApp, getApps } = await import("firebase/app");
      const { getFirestore, doc, deleteDoc, collection, addDoc } = await import("firebase/firestore");
      
      const configPath = pathModule.resolve(process.cwd(), "firebase-applet-config.json");
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      
      let appInstance;
      if (!getApps().length) {
        appInstance = initializeApp(firebaseConfig);
      } else {
        appInstance = getApps()[0];
      }
      const db = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);

      // Remove from real-time radar
      await deleteDoc(doc(db, "technicianLocations", technicianId));
      
      // Log the reason
      await addDoc(collection(db, "trackingLogs"), {
        technicianId,
        reason: reason || "Não informado",
        timestamp: timestamp || Date.now(),
        action: "STOP_TRACKING"
      });
      
      res.json({ success: true, message: "Tracking stopped successfully" });
    } catch (error) {
      console.error("Stop Tracking POST Error:", error);
      res.status(500).json({ error: "Failed to stop tracking" });
    }
  });

  // API Route to fetch latest locations for the dashboard
  // (We'll keep this as a fallback, though the frontend should now use Firebase onSnapshot)
  app.get("/api/location", async (req, res) => {
    try {
      const fs = await import("fs");
      const pathModule = await import("path");
      const { initializeApp, getApps } = await import("firebase/app");
      const { getFirestore, collection, getDocs } = await import("firebase/firestore");
      
      const configPath = pathModule.resolve(process.cwd(), "firebase-applet-config.json");
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      
      let appInstance;
      if (!getApps().length) {
        appInstance = initializeApp(firebaseConfig);
      } else {
        appInstance = getApps()[0];
      }
      const db = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);
      
      const querySnapshot = await getDocs(collection(db, "technicianLocations"));
      const locations = [];
      querySnapshot.forEach((doc) => {
        locations.push(doc.data());
      });
      
      res.json({ locations });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch locations" });
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
