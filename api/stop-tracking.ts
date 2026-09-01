import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, deleteDoc, collection, addDoc } from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";

// Initialize Firebase only once
let app;
let db;
try {
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.error("Error initializing Firebase in Vercel API:", error);
}

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
      const { technicianId, reason, timestamp } = req.body;
      
      if (!technicianId) {
        return res.status(400).json({ error: "Missing technicianId" });
      }
      
      if (!db) {
        return res.status(500).json({ error: "Database not initialized" });
      }

      // 1. Remove o técnico do radar em tempo real
      await deleteDoc(doc(db, "technicianLocations", technicianId));
      
      // 2. Registra o motivo no histórico de logs
      await addDoc(collection(db, "trackingLogs"), {
        technicianId,
        reason: reason || "Não informado",
        timestamp: timestamp || Date.now(),
        action: "STOP_TRACKING"
      });
      
      return res.status(200).json({ success: true, message: "Tracking stopped successfully" });
    } catch (error) {
      console.error("Stop Tracking POST Error:", error);
      return res.status(500).json({ error: "Failed to stop tracking" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
