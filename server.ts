import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { handleAskAiRequest } from "./api/_shared/aiConsultant";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", academy: "홍천 중앙정보처리학원" });
  });

  // AI Course Advice Endpoint using Gemini
  // (프로덕션/Vercel에서는 api/ask-ai.ts 서버리스 함수가 같은 로직을
  //  api/_shared/aiConsultant.ts에서 공유해서 사용합니다.)
  app.post("/api/ask-ai", async (req, res) => {
    const forwardedFor = req.headers["x-forwarded-for"];
    const clientIp =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const result = await handleAskAiRequest(req.body, clientIp);
    res.status(result.status).json(result.body);
  });

  // Vite middleware for development vs static in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hongcheon JAHRD Server running on http://localhost:${PORT}`);
  });
}

startServer();
