import { describe, it, expect, afterAll } from 'vitest';
import { processFile } from '../lib/processor';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

describe('Upload Logic', () => {
  const testPdfPath = path.join(__dirname, 'test_vitest.pdf');

  it('should process a PDF file successfully', async () => {
    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    page.drawText('Hello Vitest!', { x: 50, y: 350, size: 30, color: rgb(0, 0.53, 0.71) });
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(testPdfPath, pdfBytes);

    // Process
    console.log('Processing test PDF at:', testPdfPath);
    // Note: processFile might expect a path relative to CWD or absolute. using absolute.
    const result = await processFile(testPdfPath, 'application/pdf', 600);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.images).toBeInstanceOf(Array);
    expect(result.images.length).toBeGreaterThan(0);
  });

  afterAll(() => {
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
    }
  });
});
