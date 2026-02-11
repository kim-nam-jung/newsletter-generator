import { convertPdfToImages, LinkInfo } from './pdf-converter';
import { sliceImage, SliceInfo } from './image-slicer';
import { generateHtml } from './html-generator';
import fs from 'fs';
import sharp from 'sharp';

export interface ProcessedSlice {
  buffer: Buffer;
  links: LinkInfo[];
}

export async function processFile(filePath: string, mimeType: string, sliceHeight: number) {

  let images: Buffer[] = [];
  let links: LinkInfo[][] = [];

  try {
    if (mimeType === 'application/pdf') {

        const result = await convertPdfToImages(filePath);
        images = result.images;
        links = result.links;


        // Merge pages if there are multiple
        if (images.length > 1) {

            
            // 1. Get metadata for all pages to calculate dimensions
            const pageMetas = await Promise.all(images.map(img => sharp(img).metadata()));
            const totalHeight = pageMetas.reduce((sum, meta) => sum + (meta.height || 0), 0);
            const maxWidth = Math.max(...pageMetas.map(meta => meta.width || 0));

            // 2. Composite images
            const compositeOperations = [];
            let currentY = 0;
            let mergedLinks: LinkInfo[] = [];

            for (let i = 0; i < images.length; i++) {
                const meta = pageMetas[i];
                compositeOperations.push({
                    input: images[i],
                    top: currentY,
                    left: 0
                });

                // Adjust link coordinates
                if (links[i]) {
                    const pageLinks = links[i].map(link => ({
                        ...link,
                        y: link.y + currentY // Offset by previous pages' height
                    }));
                    mergedLinks = mergedLinks.concat(pageLinks);
                }

                currentY += (meta.height || 0);
            }

            // Create blank canvas and composite
            const mergedImage = await sharp({
                create: {
                    width: maxWidth,
                    height: totalHeight,
                    channels: 4,
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                }
            })
            .composite(compositeOperations)
            .png() // Ensure output is PNG
            .toBuffer();

            // Replace images and links with the single merged result
            images = [mergedImage];
            links = [mergedLinks];

        }

    } else {

        images = [fs.readFileSync(filePath)];
        links = [[]];

    }

    // Slice each image

    let finalSlices: ProcessedSlice[] = [];
    
    // If sliceHeight is 0, we still need to process it through our pipeline (resize + link scaling)
    // But sliceImage handles resizing to 800px.
    // If sliceHeight <= 0, we pass a very large number effectively implementation "no slice" but still verify logic.
    // Actually sliceImage function handles logic. But let's check the param.
    const effectiveSliceHeight = sliceHeight <= 0 ? 100000 : sliceHeight;

    for (let i = 0; i < images.length; i++) {
        const imgBuf = images[i];
        const pageLinks = links[i] || [];

        // Get original width to calculate scale
        const meta = await sharp(imgBuf).metadata();
        const originalWidth = meta.width!;
        // Scale to 1600px (Retina)
        const scale = 1600 / originalWidth;

        // Slice (this also resizes to 1600px width)
        const slices = await sliceImage(imgBuf, effectiveSliceHeight);

        for (const slice of slices) {
             // Filter and adjust links
             const sliceLinks = pageLinks.map(link => {
                // Scale link to 1600px width
                const lx = link.x * scale;
                const ly = link.y * scale;
                const lw = link.width * scale;
                const lh = link.height * scale;

                // Relative Y to the slice
                const relativeY = ly - slice.y;

                return {
                   ...link,
                   x: lx,
                   y: relativeY,
                   width: lw,
                   height: lh
                };
             }).filter(link => {
                // Keep if it overlaps with the slice
                // Link vertical range: [y, y + height] (relative to slice)
                // Slice vertical range: [0, slice.height]
                return (link.y + link.height > 0) && (link.y < slice.height);
             });

             finalSlices.push({
                 buffer: slice.buffer,
                 links: sliceLinks
             });
        }
    }


    return { slices: finalSlices };
  } catch (err) {
    console.error('[Processor] Error:', err);
    throw err;
  }
}

