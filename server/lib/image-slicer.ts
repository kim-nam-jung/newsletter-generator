import sharp from 'sharp';

export interface SliceInfo {
  buffer: Buffer;
  y: number;
  height: number;
}

export async function sliceImage(imageBuffer: Buffer, targetHeight: number): Promise<SliceInfo[]> {
  const image = sharp(imageBuffer);
  // Resize width to 1600px for Retina quality (displayed as 800px)
  const resized = image.resize({ width: 1600 });
  const resizedBuffer = await resized.toBuffer(); // Commit resize
  
  const resizedMeta = await sharp(resizedBuffer).metadata();
  const rHeight = resizedMeta.height!;
  
  const slices: SliceInfo[] = [];
  let y = 0;
  
  while (y < rHeight) {
    const remaining = rHeight - y;
    const h = Math.min(targetHeight, remaining);
    
    // Extract slice
    const slice = sharp(resizedBuffer).extract({ left: 0, top: y, width: 1600, height: h });
    slices.push({
      buffer: await slice.toBuffer(),
      y: y,
      height: h
    });
    
    y += h;
  }
  
  return slices;
}
