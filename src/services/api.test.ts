import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadImage } from './api';

describe('API Service', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('uploadImage should return blocks on success', async () => {
        const mockResponse = { 
            blocks: [
                { type: 'image', src: '/uploads/image1.png', width: 800, height: 600 }
            ] 
        };
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => JSON.stringify(mockResponse),
            status: 200,
        } as Response);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        const result = await uploadImage(file, 0);

        expect(result).toEqual(mockResponse.blocks);
        expect(global.fetch).toHaveBeenCalledWith('/api/upload', expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
        }));
    });

    it('uploadImage should throw parsed error from JSON error response', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValue({
            ok: false,
            text: async () => JSON.stringify({ error: 'Upload failed' }),
            status: 500,
        } as Response);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        await expect(uploadImage(file, 0)).rejects.toThrow('Upload failed');
    });

    it('uploadImage should throw with details field', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValue({
            ok: false,
            text: async () => JSON.stringify({ details: 'Detailed error info' }),
            status: 400,
        } as Response);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        await expect(uploadImage(file, 0)).rejects.toThrow('Detailed error info');
    });

    it('uploadImage should throw on empty error response body', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValue({
            ok: false,
            text: async () => '',
            status: 500,
        } as Response);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        await expect(uploadImage(file, 0)).rejects.toThrow('Server Error (500): Empty response body');
    });

    it('uploadImage should throw on non-JSON error response', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValue({
            ok: false,
            text: async () => '<html>Internal Server Error</html>',
            status: 502,
        } as Response);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        await expect(uploadImage(file, 0)).rejects.toThrow('Server Error (502)');
    });

    it('uploadImage should throw on invalid JSON success response', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => 'not valid json',
            status: 200,
        } as Response);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        await expect(uploadImage(file, 0)).rejects.toThrow('Invalid Server Response');
    });

    it('uploadImage should throw error on network failure', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockRejectedValue(new Error('Network error'));

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        await expect(uploadImage(file, 0)).rejects.toThrow('Network error');
    });

    it('should send sliceHeight in formData', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => JSON.stringify({ blocks: [] }),
            status: 200,
        } as Response);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        await uploadImage(file, 500);

        const calledFormData = mockFetch.mock.calls[0][1]?.body as FormData;
        expect(calledFormData.get('sliceHeight')).toBe('500');
    });

    it('uploadImage should throw details from JSON error response', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValue({
            ok: false,
            text: async () => JSON.stringify({ details: 'File too large' }),
            status: 413,
        } as Response);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        await expect(uploadImage(file, 0)).rejects.toThrow('File too large');
    });

    it('uploadImage should throw error field from JSON error response', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValue({
            ok: false,
            text: async () => JSON.stringify({ error: 'Invalid format' }),
            status: 400,
        } as Response);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        await expect(uploadImage(file, 0)).rejects.toThrow('Invalid format');
    });

    it('uploadImage should throw fallback "Upload failed" from empty JSON error', async () => {
        const mockFetch = vi.mocked(global.fetch);
        mockFetch.mockResolvedValue({
            ok: false,
            text: async () => JSON.stringify({}),
            status: 422,
        } as Response);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        await expect(uploadImage(file, 0)).rejects.toThrow('Upload failed');
    });
});
