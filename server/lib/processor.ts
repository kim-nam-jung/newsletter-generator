import { convertPdfToImages, LinkInfo } from './pdf-converter';
import { sliceImage } from './image-slicer';
import { PdfStructureParser, ExtractedBlock, ParsedPage } from './pdf-structure-parser';
import fs from 'fs';
import sharp from 'sharp';
import path from 'path';

export interface ProcessedBlock {
  type: 'image' | 'text';
  content?: string; // For text (HTML)
  buffer?: Buffer; // For image
  links?: LinkInfo[];
  width?: number;
  height?: number;
}

export async function processFile(filePath: string, mimeType: string, sliceHeight: number): Promise<{ blocks: ProcessedBlock[] }> {
  
  const finalBlocks: ProcessedBlock[] = [];
  
  try {
    if (mimeType === 'application/pdf') {
        const parser = new PdfStructureParser();
        const parsedPages = await parser.parsePdf(filePath);
        console.log(`[Processor] Parser returned ${parsedPages.length} pages`);
        
        let totalBlocks = 0;
        for (const page of parsedPages) {
             console.log(`[Processor] Processing page ${page.pageIndex} blocks (${page.blocks.length})`);

             // Iterate blocks in page
             for (const block of page.blocks) {
                 if (block.type === 'text') {
                     finalBlocks.push({
                         type: 'text',
                         content: block.content as string,
                         links: [] // Should likely parse links from HTML or attach page links?
                     });
                 } else if (block.type === 'image') {
                     // Find links that intersect with this image block
                     // Block Y is in viewport coords (0 at top)
                     const blockY = block.y;
                     const blockH = block.height || 0;
                     
                     const pageLinks = page.links || [];
                     const blockLinks: LinkInfo[] = [];
                     
                     for (const link of pageLinks) {
                         // Check overlap vertically
                         // Link: [y, y+h]
                         // Block: [blockY, blockY + blockH]
                         // We want links fully contained or intersecting significantly?
                         // Intersection logic:
                         const intersectionStart = Math.max(link.y, blockY);
                         const intersectionEnd = Math.min(link.y + link.height, blockY + blockH);
                         
                         if (intersectionEnd > intersectionStart) {
                             // It intersects.
                             // Add link relative to the block top
                             blockLinks.push({
                                 ...link,
                                 y: link.y - blockY
                             });
                         }
                     }

                     finalBlocks.push({
                         type: 'image',
                         buffer: block.content as Buffer,
                         links: blockLinks,
                         width: block.width,
                         height: block.height
                     });
                 }
                 totalBlocks++;
             }
        }
        console.log(`[Processor] Finished processing blocks. Total: ${totalBlocks}`);
        
    } else {
        // Legacy Image Processing
        const buffer = fs.readFileSync(filePath);
        // Slice logic
        // If sliceHeight <= 0, we effectively don't slice (pass very large number)
        const effectiveSliceHeight = sliceHeight <= 0 ? 100000 : sliceHeight;
        
        // Get metadata for scaling logic if needed (slicer handles resize to 800px usually)
        // But let's clarify: existing sliceImage resized to 1600px width (implied in old code comments)
        // Actually, let's verify sliceImage behavior but assume it works.
        const meta = await sharp(buffer).metadata();
        const originalWidth = meta.width!;
        
        // sliceImage logic:
        const slices = await sliceImage(buffer, effectiveSliceHeight);
        
        for (const slice of slices) {
             finalBlocks.push({
                 type: 'image',
                 buffer: slice.buffer,
                 links: slice.links || [], 
                 height: slice.height,
                 width: slice.width
             });
        }
    }

    return { blocks: finalBlocks };

  } catch (err) {
    console.error('[Processor] Error:', err);
    throw err;
  }
}
