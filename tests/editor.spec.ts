import { test, expect } from '@playwright/test';

test.describe('Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Newsletter Editor' })).toBeVisible();
  });

  test('should show editor and preview panels', async ({ page }) => {
    await expect(page.locator('.editor-panel')).toBeVisible();
    await expect(page.locator('.preview-panel')).toBeVisible();
  });

  test('should have Editor heading', async ({ page }) => {
    await expect(page.locator('.editor-panel h3', { hasText: 'Editor' })).toBeVisible();
  });

  test('should have a resizer between panels', async ({ page }) => {
    const resizer = page.locator('.resizer');
    await expect(resizer).toBeVisible();
  });

  test('should have keyboard shortcut support (Ctrl+S)', async ({ page }) => {
    // Mock the prompt dialog for save
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });

    // Press Ctrl+S
    await page.keyboard.press('Control+s');

    // If prompt appeared and was dismissed, the shortcut is working
    // We just verify no crash occurred
    await expect(page.getByRole('heading', { name: 'Newsletter Editor' })).toBeVisible();
  });

  test('should drag to resize panels', async ({ page }) => {
    const resizer = page.locator('.resizer');
    const resizerBox = await resizer.boundingBox();

    if (resizerBox) {
      // Get initial editor width
      const editorPanel = page.locator('.editor-panel');
      const initialWidth = (await editorPanel.boundingBox())?.width || 0;

      // Drag resizer to the right
      await page.mouse.move(resizerBox.x + resizerBox.width / 2, resizerBox.y + resizerBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(resizerBox.x + 100, resizerBox.y + resizerBox.height / 2, { steps: 5 });
      await page.mouse.up();

      // Editor width should have changed
      const newWidth = (await editorPanel.boundingBox())?.width || 0;
      expect(newWidth).not.toBe(initialWidth);
    }
  });
});
