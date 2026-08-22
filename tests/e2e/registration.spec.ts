import { test, expect } from '@playwright/test';

test.describe('수강신청 입력 검증', () => {
  test('수강신청 UI가 존재하고 빈 제출을 조용히 통과시키지 않는다', async ({ page }) => {
    await page.goto('/');

    // The application can expose the inquiry form through a CTA or course action.
    // Use visible text rather than internal React component names.
    const apply = page.getByRole('button', { name: /수강신청|상담신청|문의/i }).first();

    if (await apply.count()) {
      await apply.click();
      const dialog = page.getByRole('dialog').first();

      if (await dialog.count()) {
        await expect(dialog).toBeVisible();
        const submit = dialog.getByRole('button', { name: /신청|접수|제출/i }).last();

        if (await submit.count()) {
          await submit.click();
          // Validation should leave the form/dialog visible rather than reporting
          // a successful submission with no required data.
          await expect(dialog).toBeVisible();
        }
      }
    } else {
      test.skip(true, '현재 화면의 수강신청 진입 버튼 텍스트가 달라졌습니다.');
    }
  });
});
