import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
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
      const { latitude, longitude, timestamp, technicianId } = req.body;
      
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: "Missing latitude or longitude" });
      }

      const techId = technicianId || "tech_mobile";
      
      if (!db) {
        return res.status(500).json({ error: "Database not initialized" });
      }

      await setDoc(doc(db, "technicianLocations", techId), {
        latitude,
        longitude,
        timestamp: timestamp || Date.now(),
        technicianId: techId
      });
      
      return res.status(200).json({ success: true, message: "Location saved to Firebase" });
    } catch (error) {
      console.error("Location POST Error:", error);
      return res.status(500).json({ error: "Failed to update location" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
