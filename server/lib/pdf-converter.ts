// Polyfills for PDF.js in Node environment
import './pdf-polyfills'; // Must be imported before pdfjs-dist
import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';

export interface LinkInfo {
  url: string;
  x: number;      // Canvas coordinates (Top-Left origin)
  y: number;
  width: number;
  height: number;
  pageIndex: number;
}

export async function convertPdfToImages(filePath: string): Promise<{ images: Buffer[], links: LinkInfo[][] }> {
  // Dynamically import pdfjs to ensure polyfills are applied first
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  console.log('[pdf-converter] Using @napi-rs/canvas');

  // Configure worker for Node.js environment
  const standardFontDataUrl = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts').split(path.sep).join('/') + '/';
  // @ts-ignore
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';

  const data = new Uint8Array(fs.readFileSync(filePath));
  // @ts-ignore
  const loadingTask = pdfjsLib.getDocument({
    data: data,
    standardFontDataUrl: standardFontDataUrl,
    // canvasFactory 제거 - pdf.js 내장 NodeCanvasFactory가 @napi-rs/canvas 사용
  });
  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  const images: Buffer[] = [];
  const links: LinkInfo[][] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // High quality 2x

    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context as any,
      viewport: viewport,
    }).promise;

    images.push(canvas.toBuffer('image/png'));

    // Extract annotations
    const annotations = await page.getAnnotations();
    const pageLinks: LinkInfo[] = annotations
      .filter((ann: any) => ann.subtype === 'Link' && ann.url)
      .map((ann: any) => {
        // PDF rect is [x1, y1, x2, y2] where (0,0) is bottom-left
        // Viewport conversion handles the coordinate transform
        const rect = viewport.convertToViewportRectangle(ann.rect);
        // rect is now [x1, y1, x2, y2] in top-left coordinates BUT:
        // convertToViewportRectangle returns [xMin, yMin, xMax, yMax] ? 
        // Let's verify standard behavior: usually it transforms the rect.
        // If scale is 2.0, coordinates are scaled.
        // PDF JS convertToViewportRectangle returns [x1, y1, x2, y2] normalized to the viewport.
        
        // Let's manually calculate width/height from the transformed rect
        // The rect output from convertToViewportRectangle is [xMin, yMin, xMax, yMax]
        // Note: PDF coordinates y increases UPWARDS. Canvas y increases DOWNWARDS.
        // convertToViewportRectangle handles the flipping.
        
        const x = rect[0];
        const y = rect[1]; // Top-left y?
        // Actually, let's normalize. 
        // rect usually comes out as [x_min, y_min, x_max, y_max] relative to the canvas.
        // But let's be safe and check min/max.
        
        const xMin = Math.min(rect[0], rect[2]);
        const xMax = Math.max(rect[0], rect[2]);
        const yMin = Math.min(rect[1], rect[3]); // Top-most y in canvas coords
        const yMax = Math.max(rect[1], rect[3]); // Bottom-most y in canvas coords

        return {
          url: ann.url,
          x: xMin,
          y: yMin,
          width: xMax - xMin,
          height: yMax - yMin,
          pageIndex: i - 1
        };
      });
      
    links.push(pageLinks);
  }

  return { images, links };
}
