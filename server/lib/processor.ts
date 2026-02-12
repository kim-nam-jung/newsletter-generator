import { sliceImage, LinkInfo } from './image-slicer';
import fs from 'fs';
import sharp from 'sharp';

export interface ProcessedBlock {
  type: 'image' | 'text' | 'html' | 'pdf' | 'placeholder';
  content?: string;
  buffer?: Buffer;
  src?: string;
  links?: LinkInfo[];
  width?: number;
  height?: number;
  pageIndex?: number;
}

export async function processFile(filePath: string, mimeType: string, sliceHeight: number): Promise<{ blocks: ProcessedBlock[] }> {
  
  const finalBlocks: ProcessedBlock[] = [];
  
  try {
        // Image Processing
        const buffer = fs.readFileSync(filePath);
        // Slice logic
        // If sliceHeight <= 0, we effectively don't slice (pass very large number)
        const effectiveSliceHeight = sliceHeight <= 0 ? 100000 : sliceHeight;
        
        // Get metadata for scaling logic if needed (향후 사용 예정)
        await sharp(buffer).metadata();
        
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

    return { blocks: finalBlocks };

  } catch (err) {
    console.error('[Processor] Error:', err);
    throw err;
  }
}
