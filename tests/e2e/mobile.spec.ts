import { test, expect } from '@playwright/test';

test.describe('모바일 기본 동작', () => {
  test('모바일에서도 가로 스크롤 없이 핵심 콘텐츠가 보인다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test('모바일 메뉴가 존재하고 동작 가능한 경우 열 수 있다', async ({ page }) => {
    await page.goto('/');

    const menuButton = page.getByRole('button', { name: /메뉴|menu/i }).first();
    if (await menuButton.count()) {
      await menuButton.click();
      await expect(page.getByText('교육과정', { exact: true }).first()).toBeVisible();
    } else {
      // Some responsive implementations keep navigation visible without a menu button.
      await expect(page.getByText('교육과정', { exact: true }).first()).toBeVisible();
    }
  });
});
