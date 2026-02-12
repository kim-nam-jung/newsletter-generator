import { test, expect } from '@playwright/test';

test.describe('Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Newsletter Editor' })).toBeVisible();
  });

  test('should open settings modal', async ({ page }) => {
    await page.click('button[title="Settings"]');
    await expect(page.locator('.settings-modal-overlay')).toBeVisible();
  });

  test('should close settings modal', async ({ page }) => {
    await page.click('button[title="Settings"]');
    await expect(page.locator('.settings-modal-overlay')).toBeVisible();

    // Close via close button
    await page.locator('.close-btn').click();

    await expect(page.locator('.settings-modal-overlay')).not.toBeVisible({ timeout: 3000 });
  });

  test('should have export button', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export")');
    await expect(exportBtn).toBeVisible();
  });

  test('should have folder open button', async ({ page }) => {
    const folderBtn = page.locator('button[title*="Folder"]');
    await expect(folderBtn).toBeVisible();
  });

  test('should show header actions', async ({ page }) => {
    await expect(page.locator('.header-actions')).toBeVisible();
    // Should have Settings, Export, Save buttons
    await expect(page.locator('button[title="Settings"]')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
    await expect(page.locator('button:has-text("Save")')).toBeVisible();
  });
});
