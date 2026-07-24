import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import tutorHandler from "./api/tutor";
import writingFeedbackHandler from "./api/writing-feedback";

dotenv.config();

async function startServer() {
  const app = express();
  const port = 3000;

  app.use(express.json());
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  // The same handlers are used by Vercel in production and by Express locally.
  app.post("/api/tutor", (req, res) => void tutorHandler(req, res));
  app.post("/api/writing-feedback", (req, res) => void writingFeedbackHandler(req, res));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(port, "0.0.0.0", () => console.log(`Server running on http://localhost:${port}`));
}

startServer();
