import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import tutorHandler from "./api/tutor";
import writingFeedbackHandler from "./api/writing-feedback";
import missionsHandler from "./api/missions";
import learningProgressHandler from "./api/learning-progress";
import adminContentImportHandler from "./api/admin-content-import";
import adminContentListHandler from "./api/admin-content-list";
import adminContentReviewHandler from "./api/admin-content-review";
import adminContentPublishHandler from "./api/admin-content-publish";
import cronContentImportHandler from "./api/cron-content-import";

dotenv.config();

async function startServer() {
  const app = express();
  const port = 3000;

  app.use(express.json());
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  // The same handlers are used by Vercel in production and by Express locally.
  app.post("/api/tutor", (req, res) => void tutorHandler(req, res));
  app.post("/api/writing-feedback", (req, res) => void writingFeedbackHandler(req, res));
  app.post("/api/missions", (req, res) => void missionsHandler(req, res));
  app.post("/api/learning-progress", (req, res) => void learningProgressHandler(req, res));
  app.post("/api/admin-content-import", (req, res) => void adminContentImportHandler(req, res));
  app.get("/api/admin-content-list", (req, res) => void adminContentListHandler(req, res));
  app.post("/api/admin-content-review", (req, res) => void adminContentReviewHandler(req, res));
  app.post("/api/admin-content-publish", (req, res) => void adminContentPublishHandler(req, res));
  app.get("/api/cron-content-import", (req, res) => void cronContentImportHandler(req, res));

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
