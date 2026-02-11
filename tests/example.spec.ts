import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/newsletter-generator/);
});

test('check header text', async ({ page }) => {
  await page.goto('/');
  
  // Check for Header text
  await expect(page.getByRole('heading', { name: 'Newsletter Editor' })).toBeVisible();
});
