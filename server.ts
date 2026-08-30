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

  // sitemap.xml/rss.xml은 더 이상 요청마다 서버가 만들지 않습니다. 매 요청
  // 마다 Firestore를 호출하는 서버리스 함수(예전 api/sitemap.ts) 구조는
  // 재단 홈페이지(nbnhappy.or.kr)에서 실제로 프로덕션 중 FUNCTION_INVOCATION_
  // FAILED로 죽은 전례가 있어, 이 사이트는 scripts/generate-static-seo.mjs가
  // 빌드타임(vite build 직후)에 한 번 만들어 dist/sitemap.xml, dist/rss.xml로
  // 내보내는 정적 파일 방식으로 바꿨습니다. 로컬에서 확인하려면
  // `npm run build && npm run preview` 후 http://localhost:.../sitemap.xml
  // 로 접속하세요(개발 모드 `npm run dev`는 dist/가 없어 정적 파일이 없습니다).

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
