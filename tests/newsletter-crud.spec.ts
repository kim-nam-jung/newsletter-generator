import { test, expect } from '@playwright/test';

test.describe('Newsletter CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Newsletter Editor' })).toBeVisible();
  });

  test('should create, save, load, and delete a newsletter', async ({ page }) => {
    // Step 1: Add a text block
    const addTextBtn = page.locator('button', { hasText: /text/i }).first();
    if (await addTextBtn.isVisible()) {
      await addTextBtn.click();
    }

    // Step 2: Save the newsletter
    // Mock the prompt dialog
    page.on('dialog', async dialog => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('E2E Test Newsletter');
      } else if (dialog.type() === 'confirm') {
        await dialog.accept();
      }
    });

    await page.click('button:has-text("Save")');

    // Wait for save to complete
    await page.waitForTimeout(1000);

    // Step 3: Verify it appears in the sidebar
    const sidebarItem = page.locator('.sidebar-list li', { hasText: 'E2E Test Newsletter' });
    await expect(sidebarItem).toBeVisible({ timeout: 5000 });

    // Step 4: Create a new newsletter to reset state
    await page.click('button:has-text("New Newsletter")');
    await page.waitForTimeout(500);

    // Step 5: Load the saved newsletter by clicking it in sidebar
    await sidebarItem.click();
    await page.waitForTimeout(1000);

    // Verify the newsletter is loaded (check for "Editing" badge)
    await expect(page.locator('text=Editing')).toBeVisible();

    // Step 6: Delete the newsletter
    const deleteBtn = sidebarItem.locator('button[title="Delete"]');
    await deleteBtn.click();

    // Wait for delete to complete
    await page.waitForTimeout(1000);

    // Verify it's removed from sidebar
    await expect(sidebarItem).not.toBeVisible();
  });

  test('should show empty state when no blocks', async ({ page }) => {
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('text=Add content blocks to see preview')).toBeVisible();
  });

  test('should display sidebar with Recent section', async ({ page }) => {
    await expect(page.locator('.sidebar-list h3', { hasText: 'Recent' })).toBeVisible();
  });
});
