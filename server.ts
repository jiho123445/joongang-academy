import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

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
  app.post("/api/ask-ai", async (req, res) => {
    try {
      const { userQuery, userCategory, goal } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          reply: `안녕하세요! 홍천 중앙정보처리학원 AI 수강 도우미입니다.\n\n질문하신 내용은 원장님 또는 전문 상담 직원을 통해 친절하게 안내받으실 수 있습니다.\n\n📞 학원 전화: 033-433-1926 ~ 7\n📍 위치: 강원도 홍천군 홍천읍 신장대로 48, 2층\n\n국민내일배움카드 국비지원 과정 및 컴퓨터활용능력, 전산세무회계, 시니어 컴퓨터 등 맞춤형 상담을 진행해 드립니다.`
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
너는 '홍천 중앙정보처리학원(jahrd.com, 1999년 설립, 강원도 홍천군 홍천읍 신장대로 48 2층, 전화 033-433-1926)'의 친절하고 전문적인 AI 수강 상담 선생님이야.

[학원 주요 특징]
1. 1999년 설립된 25년 전통의 홍천 대표 컴퓨터/IT 교육기관
2. 고용노동부 지정 국민내일배움카드 국비지원 지정 학원 (수강료 최대 100% 무료 지원)
3. 대표 과정: 컴퓨터활용능력(1급/2급), 전산세무회계, 정보처리기능사/산업기사/기사, ITQ/GTQ 자격증, 시니어/어르신 컴퓨터&스마트폰 기초, 파이썬 코딩 및 AI 활용, 초중고 방학특강
4. 1인 1대 최신 컴퓨터 실습, 1:1 맞춤 친절 지도

[사용자 정보]
- 사용자 분류: ${userCategory || "미지정"}
- 학습 목표: ${goal || "미지정"}
- 사용자 질문: ${userQuery || "나에게 맞는 수강 과정을 추천해주세요."}

[응답 지침]
- 정중하고 친절한 어조로 한국어로 답변해줘.
- 질문자의 상황에 부합하는 홍천 중앙정보처리학원의 강좌를 1~2개 추천하고, 왜 맞는지 간단히 설명해줘.
- 국비지원(국민내일배움카드) 대상일 수 있다면 그 점을 언급하고 학원 방문/전화 상담(033-433-1926)을 유도해줘.
- 답변은 300자 이내로 핵심 위주로 명확하고 읽기 쉽게 작성해줘.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return res.json({ reply: response.text || "상담 요청에 응답할 수 없습니다. 학원으로 직접 문의해 주세요 (033-433-1926)." });
    } catch (error) {
      console.error("Gemini API Error:", error);
      return res.json({
        reply: `안녕하세요! 질문해 주셔서 감사합니다.\n\n고객님의 상황에 맞는 맞춤형 수강 과정과 국비지원 자격 여부는 학원으로 전화(033-433-1926) 주시면 가장 정확하게 안내해 드립니다.`
      });
    }
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
