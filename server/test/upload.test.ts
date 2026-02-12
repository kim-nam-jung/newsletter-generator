import { describe, it, expect, afterAll } from 'vitest';
import { processFile } from '../lib/processor';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

describe('Upload Logic', () => {
  const testPdfPath = path.join(__dirname, 'test_vitest.pdf');

  it('should process an image file successfully', async () => {
    // Create Test Image
    const testImagePath = path.join(__dirname, 'test_upload.png');
    // Create a simple PNG using sharp
    const sharp = (await import('sharp')).default;
    await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 }
        }
    })
    .png()
    .toFile(testImagePath);

    // Process
    console.log('Processing test Image at:', testImagePath);
    const result = await processFile(testImagePath, 'image/png', 600);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.blocks).toBeInstanceOf(Array);
    expect(result.blocks.length).toBeGreaterThan(0);
    expect(result.blocks[0].type).toBe('image');
    
    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  afterAll(() => {
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
    }
  });
});
