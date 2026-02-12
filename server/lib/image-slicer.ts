import sharp from 'sharp';

/**
 * LinkInfo 타입 - 프론트엔드(src/types.ts)와 동일한 정의
 * 서버/클라이언트 간 공유 타입으로, 변경 시 양쪽 동기화 필요
 */
export interface LinkInfo {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SliceInfo {
  buffer: Buffer;
  y: number;
  height: number;
  width: number;
  links: LinkInfo[];
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
      height: h,
      width: 1600,
      links: []
    });
    
    y += h;
  }
  
  return slices;
}
