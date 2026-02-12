import { LinkInfo } from './pdf-converter';
import './pdf-polyfills'; // Polyfills must be loaded
import { Canvas, createCanvas, Image } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

// Define the structure for our output blocks
export type BlockType = 'text' | 'image' | 'header';

export interface ExtractedBlock {
  type: BlockType;
  content: string | Buffer; // HTML string or Image Buffer
  y: number; // Vertical position for sorting
  x: number;
  width?: number;
  height?: number;
  order?: number;
}

export interface ParsedPage {
  pageIndex: number;
  width: number;
  height: number;
  blocks: ExtractedBlock[];
  links: LinkInfo[];
}

export class PdfStructureParser {
  private pdfLib: any;
  private standardFontDataUrl: string = '';

  constructor() {
    this.init();
  }

  private async init() {
    console.log('[PdfStructureParser] Initializing PDF library...');
    this.pdfLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // Calculate paths correctly
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    const fontDir = path.join(nodeModulesPath, 'pdfjs-dist', 'standard_fonts');
    const workerPath = path.join(nodeModulesPath, 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');

    // Ensure forward slashes and trailing slash for pdfjs-dist standard font URL
    // Standard font data url requires a string path, often relative or http/file url.
    // In node, it often works with just a path, but let's be safe.
    this.standardFontDataUrl = fontDir.replace(/\\/g, '/') + '/';
    
    // Set worker path to avoid "No workerSrc specified" error
    // IMPORTANT: On Windows ESM, this MUST be a file:// URL
    this.pdfLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();
    
    console.log('[PdfStructureParser] PDF library initialized.');
    console.log(`[PdfStructureParser] Worker Src: ${this.pdfLib.GlobalWorkerOptions.workerSrc}`);
  }

  async parsePdf(filePath: string): Promise<ParsedPage[]> {
    console.log('[PdfStructureParser] Starting PDF parse:', filePath);
    if (!this.pdfLib) await this.init();

    try {
        const data = new Uint8Array(fs.readFileSync(filePath));
        const loadingTask = this.pdfLib.getDocument({
          data,
          standardFontDataUrl: this.standardFontDataUrl,
        });

        const doc = await loadingTask.promise;
        const numPages = doc.numPages;
        console.log(`[PdfStructureParser] Document loaded. Pages: ${numPages}`);
        const parsedPages: ParsedPage[] = [];

        for (let i = 1; i <= numPages; i++) {
            console.log(`[PdfStructureParser] Processing page ${i}/${numPages}...`);
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 }); 
            
            // 1. Render Page to Canvas
            console.log(`[PdfStructureParser] Rendering page ${i} to canvas...`);
            const canvas = createCanvas(viewport.width, viewport.height);
            const context = canvas.getContext('2d');
            
            await page.render({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                canvasContext: context as any,
                viewport: viewport,
            }).promise;
            console.log(`[PdfStructureParser] Page ${i} rendered.`);

            // 2. Extract Links FIRST (to embed in text)
            const annotations = await page.getAnnotations();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const links: LinkInfo[] = annotations
               // eslint-disable-next-line @typescript-eslint/no-explicit-any
               .filter((a: any) => a.subtype === 'Link' && a.url)
               // eslint-disable-next-line @typescript-eslint/no-explicit-any
               .map((a: any) => {
                    const rect = viewport.convertToViewportRectangle(a.rect);
                    const x1 = rect[0]; const y1 = rect[1]; 
                    const x2 = rect[2]; const y2 = rect[3];
                    return {
                        url: a.url,
                        x: Math.min(x1, x2),
                        y: Math.min(y1, y2),
                        width: Math.abs(x2 - x1),
                        height: Math.abs(y2 - y1),
                        pageIndex: i - 1
                    };
               });

            // 3. Extract Text Items
            console.log(`[PdfStructureParser] Extracting text content for page ${i}...`);
            const textContent = await page.getTextContent();
            
            // Normalize Text Items to Viewport
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const textItems = textContent.items.map((item: any) => {
                const tx = item.transform[4];
                const ty = item.transform[5];
                const [vx, vy] = viewport.convertToViewportPoint(tx, ty);
                const fontSize = Math.sqrt(item.transform[0]*item.transform[0] + item.transform[1]*item.transform[1]);
                const scaledFontSize = fontSize * viewport.scale; 
                
                return {
                    text: item.str,
                    x: vx,
                    y: vy - scaledFontSize, // Top
                    bottom: vy,             // Bottom
                    width: item.width * viewport.scale, 
                    height: scaledFontSize
                };
            });
            
            // 3b. Embed Links in Text Items
            for (const item of textItems) {
                const cx = item.x + item.width / 2;
                const cy = item.y + item.height / 2;
                const link = links.find((l) => 
                    cx >= l.x && cx <= l.x + l.width &&
                    cy >= l.y && cy <= l.y + l.height
                );
                
                if (link) {
                    const safeText = item.text
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;");
                    item.text = `<a href="${link.url}" style="color: blue; text-decoration: underline;">${safeText}</a>`;
                }
            }

            // 4. Group Text into "Regions"
            console.log(`[PdfStructureParser] Grouping text regions for page ${i}...`);
            textItems.sort((a: any, b: any) => a.y - b.y);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const textRegions: { min: number, max: number, items: any[] }[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let currentRegion: { min: number, max: number, items: any[] } | null = null;
            
            for (const item of textItems) {
                const rawText = item.text.replace(/<[^>]*>/g, '');
                if (!rawText.trim()) continue; 

                if (currentRegion) {
                    if (item.y < currentRegion.max + 10) { 
                         currentRegion.max = Math.max(currentRegion.max, item.bottom);
                         currentRegion.items.push(item);
                    } else {
                         textRegions.push(currentRegion);
                         currentRegion = {
                             min: item.y,
                             max: item.bottom,
                             items: [item]
                         };
                    }
                } else {
                     currentRegion = {
                         min: item.y,
                         max: item.bottom,
                         items: [item]
                     };
                }
            }
            if (currentRegion) textRegions.push(currentRegion);
            console.log(`[PdfStructureParser] Found ${textRegions.length} text regions.`);

            // 5. Identify "Image Gaps" and Extract Blocks
            console.log(`[PdfStructureParser] Extracting image gaps for page ${i}...`);
            const blocks: ExtractedBlock[] = [];
            let lastY = 0;
            
            const isRegionEmpty = (y: number, h: number, w: number) => {
                 if (h <= 5 || w <= 0) return true; 
                 try {
                    // Sampling resolution
                    const stride = 10;
                    const imgData = context.getImageData(0, y, w, h);
                    const data = imgData.data;
                    // Optimization: Early exit if non-white pixel found
                    for (let k = 0; k < data.length; k += 4 * stride) {
                        if (data[k+3] > 0) { // Alpha > 0
                            // Check if NOT almost white
                            if (data[k] < 250 || data[k+1] < 250 || data[k+2] < 250) {
                                return false; 
                            }
                        }
                    }
                    return true; 
                 } catch (e) {
                     console.error('[PdfStructureParser] Error checking region empty:', e);
                     return true; 
                 }
            };

            for (const region of textRegions) {
                const gapY = lastY;
                const gapH = region.min - lastY;
                
                if (gapH > 5 && !isRegionEmpty(gapY, gapH, viewport.width)) {
                    try {
                        const gapCanvas = createCanvas(viewport.width, gapH);
                        const gapCtx = gapCanvas.getContext('2d');
                        gapCtx.drawImage(canvas, 0, gapY, viewport.width, gapH, 0, 0, viewport.width, gapH);
                        
                        blocks.push({
                            type: 'image',
                            content: gapCanvas.toBuffer('image/png'),
                            y: gapY,
                            x: 0,
                            width: viewport.width,
                            height: gapH
                        });
                    } catch (err) {
                        console.error('[PdfStructureParser] Error extracting image block:', err);
                    }
                }

                // Create Text Block
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const regionItems = region.items.sort((a: any, b: any) => {
                     const yDiff = Math.abs(a.y - b.y);
                     if (yDiff < 5) return a.x - b.x;
                     return a.y - b.y;
                });
                
                let htmlBuffer = '';
                let currentLineY = -1;
                let currentLineText = '';

                for (const item of regionItems) {
                     if (currentLineY === -1) {
                          currentLineY = item.y;
                          currentLineText = item.text;
                     } else if (Math.abs(item.y - currentLineY) < 8) { 
                          currentLineText += ' ' + item.text;
                     } else {
                          htmlBuffer += `<p style="margin: 0; line-height: 1.4;">${currentLineText}</p>`;
                          currentLineY = item.y;
                          currentLineText = item.text;
                     }
                }
                if (currentLineText) {
                    htmlBuffer += `<p style="margin: 0; line-height: 1.4;">${currentLineText}</p>`;
                }

                blocks.push({
                    type: 'text',
                    content: htmlBuffer,
                    y: region.min,
                    x: 0,
                    height: region.max - region.min
                });

                lastY = region.max;
            }

            // Final gap
            const finalGapH = viewport.height - lastY;
            if (finalGapH > 5 && !isRegionEmpty(lastY, finalGapH, viewport.width)) {
                 try {
                     const gapCanvas = createCanvas(viewport.width, finalGapH);
                     const gapCtx = gapCanvas.getContext('2d');
                     gapCtx.drawImage(canvas, 0, lastY, viewport.width, finalGapH, 0, 0, viewport.width, finalGapH);
                     
                     blocks.push({
                         type: 'image',
                         content: gapCanvas.toBuffer('image/png'),
                         y: lastY,
                         x: 0,
                         width: viewport.width,
                         height: finalGapH
                     });
                 } catch (err) {
                     console.error('[PdfStructureParser] Error extracting final image block:', err);
                 }
            }
                
            parsedPages.push({
                pageIndex: i - 1,
                width: viewport.width,
                height: viewport.height,
                blocks,
                links
            });
            console.log(`[PdfStructureParser] Page ${i} processed. Blocks: ${blocks.length}`);
        }

        console.log('[PdfStructureParser] Cleaning up document...');
        try {
            await doc.destroy();
            console.log('[PdfStructureParser] Document destroyed.');
        } catch (e) {
            console.error('[PdfStructureParser] Error destroying document:', e);
        }

        console.log('[PdfStructureParser] PDF Parse Complete');
        return parsedPages;
    } catch (err) {
        console.error('[PdfStructureParser] Fatal Error:', err);
        throw err;
    }
  }
}
