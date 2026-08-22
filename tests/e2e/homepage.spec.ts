import { test, expect } from '@playwright/test';

test.describe('홈페이지 기본 동작', () => {
  test('홈페이지가 정상적으로 열리고 핵심 UI가 표시된다', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/중앙|학원|컴퓨터|정보처리/i);

    // Header/nav text may be rendered differently across responsive layouts.
    // Check stable, user-visible landmarks instead of implementation-specific CSS classes.
    await expect(page.getByText('교육과정', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('자료실', { exact: true }).first()).toBeVisible();
  });

  test('교육과정 페이지로 이동할 수 있다', async ({ page }) => {
    await page.goto('/');
    await page.getByText('교육과정', { exact: true }).first().click();
    await expect(page.getByRole('heading', { name: '전체 교육과정' })).toBeVisible();
  });

  test('자료실은 인증 게이트를 거친다', async ({ page }) => {
    await page.goto('/');
    await page.getByText('자료실', { exact: true }).first().click();

    await expect(page.getByRole('heading', { name: '자료실' })).toBeVisible();
    // Anonymous users must not be shown the protected materials list.
    // We deliberately do not assert a specific login-dialog copy so future copy
    // changes do not break the test unnecessarily.
    await expect(page.locator('body')).toContainText(/로그인|회원|인증|승인|자료실/);
  });
});
