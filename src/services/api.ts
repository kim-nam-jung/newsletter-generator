// src/services/api.ts
import type { LinkInfo } from '../types';

export interface SliceInfo {
  imageUrl: string;
  links: LinkInfo[];
}

export interface BlockResponse {
    type: 'image' | 'text' | 'pdf' | 'html';
    content?: string; // HTML content for text/html blocks
    src?: string;     // URL for image/pdf blocks
    links?: LinkInfo[];
    width?: number;
    height?: number;
    pageIndex?: number;
}

export interface UploadResponse {
  blocks: BlockResponse[];
}

export const uploadImage = async (file: File, sliceHeight: number): Promise<BlockResponse[]> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sliceHeight', sliceHeight.toString());

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    if (!text) {
        throw new Error(`Server Error (${response.status}): Empty response body`);
    }
    try {
      const errorData = JSON.parse(text);
      throw new Error(errorData.details || errorData.error || 'Upload failed');
    } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        if (err.message && !err.message.includes('Unexpected token') && !err.message.includes('Unexpected end of JSON input')) {
            throw err;
        } 
        throw new Error(`Server Error (${response.status}): ${text.substring(0, 100)}...`);
    }
  }

  const text = await response.text();
  try {
      // The server now returns { blocks: [...] }
      const data: UploadResponse = JSON.parse(text);
      return data.blocks;
  } catch {
      throw new Error(`Invalid Server Response: ${text.substring(0, 100)}...`);
  }
};
