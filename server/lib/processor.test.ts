import { describe, it, expect, vi } from 'vitest';
import { processFile } from './processor';
import sharp from 'sharp';
import path from 'path';

// Mock pdf-converter
vi.mock('./pdf-converter', () => ({
  convertPdfToImages: vi.fn().mockImplementation(async () => {
    // Create two dummy images (100x100 white squares)
    const img1 = await sharp({
      create: { width: 100, height: 100, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } }
    }).png().toBuffer();

    const img2 = await sharp({
      create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } }
    }).png().toBuffer();

    return {
      images: [img1, img2],
      links: [
        [{ url: 'http://p1.com', x: 10, y: 10, width: 20, height: 20, pageIndex: 0 }],
        [{ url: 'http://p2.com', x: 20, y: 20, width: 30, height: 30, pageIndex: 1 }]
      ]
    };
  }),
  LinkInfo: {}
}));

// Mock html-generator (not used in logic test but imported)
vi.mock('./html-generator', () => ({
  generateHtml: vi.fn()
}));

// Mock image-slicer to behave predictably
// But processor uses real image-slicer. Let's not mock it if possible, 
// or verify behavior with real one. 
// image-slicer resizes to 800px width.
// Original images are 100px width. 
// scale = 800 / 100 = 8.
// Page 1 height (100) -> resized height 800.
// Page 2 height (100) -> resized height 800.
// Total merged height = 200 (original) -> 1600 (resized).

// Links:
// P1 link: x=10, y=10. Scaled: x=80, y=80.
// P2 link: x=20, y=20.
// Merged P2 link Y (original) = 100 + 20 = 120.
// Scaled P2 link Y = 120 * 8 = 960.

describe('Processor', () => {
  it('should merge multiple pages and adjust link coordinates', async () => {
    const result = await processFile('dummy.pdf', 'application/pdf', 0);
    
    expect(result.slices).toHaveLength(1); // Should be 1 slice because height is 0 (infinite)
    const sliceBuffer = result.slices[0].buffer;
    const links = result.slices[0].links;

    // Verify links
    expect(links).toHaveLength(2);
    
    // Validating Link 1
    const l1 = links.find(l => l.url === 'http://p1.com');
    expect(l1).toBeDefined();
    // x: 10 * 8 = 80
    // y: 10 * 8 = 80
    expect(Math.round(l1!.x)).toBe(80);
    expect(Math.round(l1!.y)).toBe(80);

    // Validating Link 2
    const l2 = links.find(l => l.url === 'http://p2.com');
    expect(l2).toBeDefined();
    // x: 20 * 8 = 160
    // y: (100 + 20) * 8 = 960
    expect(Math.round(l2!.x)).toBe(160);
    expect(Math.round(l2!.y)).toBe(960);
  });
});
