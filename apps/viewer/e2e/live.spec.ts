import { expect, test } from '@playwright/test';

const OUT = '../../docs';

test('renders the fixture in 3D within the frame budget', async ({ page }) => {
  await page.goto('/?fixture=broken-dropdown');
  await expect(page.getByRole('heading', { name: /broken-dropdown\.html/ })).toBeVisible();
  await page.waitForTimeout(1500);

  const avgMs = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let n = 0;
        const t0 = performance.now();
        const step = () => {
          n += 1;
          if (n < 60) requestAnimationFrame(step);
          else resolve((performance.now() - t0) / 60);
        };
        requestAnimationFrame(step);
      }),
  );
  console.log(`live viewer: ${avgMs.toFixed(2)} ms per frame (headless)`);
  expect(avgMs).toBeLessThan(50);

  await expect(page.getByRole('button', { name: 'Open element info' })).toBeVisible();
  await page.getByRole('button', { name: /^div\.dropdown/ }).click();
  await expect(page.locator('.sr-inspector')).toContainText('div.dropdown');
  await expect(page.locator('.sr-inspector')).toContainText('9999');

  const search = page.getByRole('searchbox', { name: 'Search layers' });
  await search.fill('dd');
  await expect(page.locator('.sr-tree mark').first()).toBeVisible();
  await search.press('Enter');
  await expect(page.locator('.sr-row--selected')).toContainText('div.dropdown');
  await page.screenshot({ path: `${OUT}/ui-preview-live.png` });
  await search.press('Escape');
  await expect(page.locator('.sr-tree mark')).toHaveCount(0);

  const textured = page.getByRole('switch', { name: 'Textured planes' });
  await expect(textured).toBeEnabled();
  await textured.click();
  await expect(textured).toHaveAttribute('aria-checked', 'true');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/ui-preview-textured.png` });
});
