import { defineConfig } from "vitest/config";

// Firestore 보안 규칙 자동 테스트 전용 설정입니다. 이 프로젝트에는 프론트엔드
// 유닛 테스트가 없어서(E2E는 별도로 Playwright를 씁니다), vitest는 지금
// tests/rules/ 아래의 규칙 테스트만을 위해 존재합니다. Firebase 에뮬레이터가
// Node 환경에서 돌아가므로 jsdom 등 브라우저 환경 설정은 필요 없습니다.
export default defineConfig({
  test: {
    include: ["tests/rules/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
