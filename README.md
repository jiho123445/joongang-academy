<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ca4abb49-e194-408b-a23c-336854a466c9

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deployment architecture (Vercel)

이 프로젝트는 두 가지 서버 실행 방식이 공존합니다. 혼동하지 않도록 정리합니다.

- **`server.ts`** — 로컬 개발 전용 Express 서버(`npm run dev`)입니다. Vite 미들웨어와
  함께 실행되며, `/api/health`, `/api/ask-ai` 같은 라우트를 직접 정의합니다.
  **Vercel에 배포될 때는 이 파일이 실행되지 않습니다** — Vercel은 정적 프론트엔드
  (Vite 빌드 결과물)만 호스팅하고, `server.ts`는 사용하지 않습니다.
- **`api/*.ts`** — Vercel 서버리스 함수입니다. 실제 운영(`www.jahrd.co.kr`)에서
  `/api/...`로 오는 모든 요청은 이 폴더의 파일들이 처리합니다. 새 API가
  필요하면 이 폴더에 파일을 추가해야 실제 배포 환경에서 작동합니다.

즉 로컬에서 테스트할 땐 `server.ts`가, 실제 배포 환경에서는 `api/*.ts`가
같은 역할(AI 상담, 자료 다운로드, 관리자 계정 관리 등)을 나눠서 담당하는
구조입니다. 두 곳의 로직이 서로 다르게 바뀌지 않도록 주의가 필요합니다.
