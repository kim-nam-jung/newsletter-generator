import { processFile } from './server/lib/processor';
import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

async function test() {
  const canvas = createCanvas(800, 1200);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 800, 1200);
  ctx.fillStyle = 'red';
  ctx.fillRect(100, 100, 600, 1000); // Content
  
  const buffer = canvas.toBuffer('image/png');
  const testFilePath = path.join(process.cwd(), 'test-image.png');
  fs.writeFileSync(testFilePath, buffer);
  
  console.log(`Test image created: ${testFilePath}`);
  
  try {
    console.log('Processing test image...');
    const result = await processFile(testFilePath, 'image/png', 600);
    console.log('Processing successful!');
    console.log(`Number of slices: ${result.images.length}`);
  } catch (error) {
    console.error('Processing failed:', error);
    process.exit(1);
  }
}

test();
