import { describe, it, expect } from 'vitest';
import { generateHtml } from './html-generator';
import { ProcessedSlice } from './processor';

describe('HTML Generator', () => {
    it('should generate valid HTML structure', () => {
        const slices: (ProcessedSlice & { imageUrl?: string })[] = [
            { buffer: Buffer.from('slice1'), links: [], imageUrl: '/path/to/img.png' },
            { 
              buffer: Buffer.from('slice2'), 
              // Links are in 1600px coordinates
              links: [{ url: 'https://example.com', x: 20, y: 20, width: 200, height: 40, pageIndex: 0 }] 
            }
        ];
        const html = generateHtml(slices);

        expect(html).toContain('<!DOCTYPE html>');
        
        // Should use imageUrl if present
        expect(html).toContain('<img src="/path/to/img.png"');
        
        // Fallback to base64
        expect(html).toContain('<img src="data:image/png;base64,c2xpY2Uy"'); 
        
        // Check for link overlay with SCALED coordinates (0.5x)
        expect(html).toContain('<a href="https://example.com"');
        expect(html).toContain('left: 10px;');   // 20 * 0.5
        expect(html).toContain('top: 10px;');    // 20 * 0.5
        expect(html).toContain('width: 100px;'); // 200 * 0.5
        expect(html).toContain('height: 20px;'); // 40 * 0.5
    });

    it('should handle empty slices', () => {
        const html = generateHtml([]);
        expect(html).toContain('<!DOCTYPE html>');
        // Should have table but no rows
        expect(html).not.toContain('<img src=');
    });
});
