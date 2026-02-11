import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadImage } from './api';

describe('API Service', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('uploadImage should return image URLs on success', async () => {
        const mockResponse = { images: ['/uploads/image1.png'] };
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => JSON.stringify(mockResponse),
            status: 200,
        } as Response);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        const result = await uploadImage(file, 0);

        expect(result).toEqual(mockResponse.images);
        expect(global.fetch).toHaveBeenCalledWith('/api/upload', expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
        }));
    });

    it('uploadImage should throw error on server failure', async () => {
        const mockError = { error: 'Upload failed' };
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValue({
            ok: false,
            text: async () => JSON.stringify(mockError),
            status: 500,
        } as Response);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        
        await expect(uploadImage(file, 0)).rejects.toThrow('Upload failed');
    });

    it('uploadImage should throw error on network failure', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockRejectedValue(new Error('Network error'));

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        
        await expect(uploadImage(file, 0)).rejects.toThrow('Network error');
    });
});
