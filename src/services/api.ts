export interface LinkInfo {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SliceInfo {
  imageUrl: string;
  links: LinkInfo[];
}

export interface UploadResponse {
  images: string[];
  slices: SliceInfo[];
}

export const uploadImage = async (file: File, sliceHeight: number): Promise<SliceInfo[]> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sliceHeight', sliceHeight.toString());

  console.log('[Client] Uploading to /api/upload...');
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  console.log(`[Client] Response status: ${response.status}`);

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
      const data: UploadResponse = JSON.parse(text);
      return data.slices;
  } catch {
      throw new Error(`Invalid Server Response: ${text.substring(0, 100)}...`);
  }
};
