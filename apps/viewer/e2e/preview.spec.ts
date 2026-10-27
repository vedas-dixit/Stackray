import { expect, test } from '@playwright/test';

const OUT = '../../docs';

test('tokens and components preview renders and is captured', async ({ page }) => {
  await page.goto('/#preview');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Stackray, on the desk');

  const stage = page.getByTestId('stage-open');
  await expect(stage.getByRole('heading', { name: /youtube\.com/ })).toBeVisible();
  await expect(stage.getByRole('switch', { name: 'Hide empty' })).toBeVisible();
  await expect(
    page.getByTestId('stage-zen').getByRole('button', { name: 'Open tools' }),
  ).toBeVisible();

  await stage.screenshot({ path: `${OUT}/ui-preview-stage.png` });
  await page.getByTestId('stage-zen').screenshot({ path: `${OUT}/ui-preview-zen.png` });
  await page.screenshot({ path: `${OUT}/ui-preview.png`, fullPage: true });
});

test('stage keys toggle the panes', async ({ page }) => {
  await page.goto('/#preview');
  const stage = page.getByTestId('stage-open');
  await stage.locator('.sr-stage').focus();
  await page.keyboard.press(']');
  await expect(stage.getByRole('button', { name: 'Open tools' })).toBeVisible();
  await page.keyboard.press(']');
  await expect(stage.getByRole('switch', { name: 'Hide empty' })).toBeVisible();
  await page.keyboard.press('z');
  await expect(stage.getByRole('button', { name: 'Open element info' })).toBeVisible();
});
