import { test, expect } from '@playwright/test';

test.describe('공개 API 기본 보안', () => {
  test('health endpoint가 응답한다', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('자료 다운로드 API는 인증 없이 임의 파일을 내려주지 않는다', async ({ request }) => {
    const response = await request.post('/api/download-material', {
      data: { materialId: 'playwright-unauthenticated-test' },
    });

    // 401/403 are expected. A 2xx response would indicate a serious regression.
    expect([401, 403]).toContain(response.status());
  });
});
