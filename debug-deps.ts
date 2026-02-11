import sharp from 'sharp';
import { createCanvas } from 'canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';

async function testDeps() {
  console.log('Testing dependencies...');

  try {
    // Test Sharp
    console.log('Testing Sharp...');
    const sharpImage = sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    });
    const buffer = await sharpImage.png().toBuffer();
    console.log('Sharp OK: Generated buffer of size', buffer.length);
  } catch (e) {
    console.error('Sharp Failed:', e);
  }

  try {
    // Test Canvas
    console.log('Testing Canvas...');
    const canvas = createCanvas(200, 200);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, 200, 200);
    console.log('Canvas OK');
  } catch (e) {
    console.error('Canvas Failed:', e);
  }

  try {
    // Test PDF.js
    console.log('Testing PDF.js...');
    // We strictly need to see if it loads
    console.log('PDF.js version:', pdfjsLib.version);
    console.log('PDF.js OK');
  } catch (e) {
    console.error('PDF.js Failed:', e);
  }
}

testDeps().catch(console.error);
