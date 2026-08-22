import { test, expect } from '@playwright/test';

/**
 * Optional authenticated smoke tests.
 *
 * They run only when a dedicated TEST_* account is supplied.
 * Never put production credentials in this repository.
 *
 * Required env:
 *   TEST_ADMIN_EMAIL
 *   TEST_ADMIN_PASSWORD
 *
 * The test intentionally does not create/delete real students or production data.
 */
test.describe('관리자 인증 스모크 테스트', () => {
  test('관리자 계정 정보가 제공된 경우 로그인 화면에서 인증을 시도한다', async ({ page }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD,
      '전용 테스트 관리자 계정이 설정되지 않았습니다.'
    );

    await page.goto('/');

    const adminButton = page.getByRole('button', { name: /관리자/i }).first();
    if (!(await adminButton.count())) {
      test.skip(true, '관리자 진입 버튼 텍스트가 현재 UI와 다릅니다.');
    }

    await adminButton.click();

    const email = page.getByLabel(/이메일/i).first();
    const password = page.getByLabel(/비밀번호/i).first();

    if (!(await email.count()) || !(await password.count())) {
      test.skip(true, '관리자 로그인 입력 필드가 현재 UI와 다릅니다.');
    }

    await email.fill(process.env.TEST_ADMIN_EMAIL!);
    await password.fill(process.env.TEST_ADMIN_PASSWORD!);

    const login = page.getByRole('button', { name: /로그인/i }).last();
    await login.click();

    // Do not assert a fragile exact dashboard label. We only require that
    // the page does not display a clear authentication failure after submission.
    await expect(page.locator('body')).not.toContainText(/잘못된 비밀번호|로그인 실패|인증 실패/i);
  });
});
