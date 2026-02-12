import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { processFile } from './processor';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const TEST_DIR = path.join(__dirname, 'test-output');
const TEST_IMAGE_PATH = path.join(TEST_DIR, 'test_input.png');

describe('Processor', () => {
  beforeAll(async () => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    // Create a 1600x2000 image (matches the standard width we use for processing)
    await sharp({
      create: {
        width: 1600,
        height: 2000,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    })
    .png()
    .toFile(TEST_IMAGE_PATH);
  });

  afterAll(() => {
    // Clean up
    if (fs.existsSync(TEST_IMAGE_PATH)) {
      fs.unlinkSync(TEST_IMAGE_PATH);
    }
    if (fs.existsSync(TEST_DIR)) {
      fs.rmdirSync(TEST_DIR);
    }
  });

  it('should slice a large image correctly', async () => {
    // Slice height 500. Should get 4 slices (2000 / 500 = 4)
    const result = await processFile(TEST_IMAGE_PATH, 'image/png', 500);
    
    expect(result.blocks).toHaveLength(4);
    
    result.blocks.forEach((block) => {
      expect(block.type).toBe('image');
      expect(block.width).toBe(1600);
      expect(block.height).toBe(500);
      // Links should be empty for pure image processing
      expect(block.links).toEqual([]);
    });
  });

  it('should handle small images without slicing if height is large enough', async () => {
    const result = await processFile(TEST_IMAGE_PATH, 'image/png', 3000); // larger than 2000
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].height).toBe(2000);
  });
});
