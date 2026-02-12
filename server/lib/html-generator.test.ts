import { describe, it, expect } from 'vitest';
import { generateHtml } from './html-generator';
import { ProcessedBlock } from './processor';

describe('HTML Generator', () => {
    it('should generate valid HTML structure', () => {
        const blocks: (ProcessedBlock & { imageUrl?: string })[] = [
            { type: 'image', buffer: Buffer.from('slice1'), links: [], imageUrl: '/path/to/img.png', width: 800, height: 100 },
            { 
              type: 'image',
              buffer: Buffer.from('slice2'), 
              // Links are in 1600px coordinates
              links: [{ url: 'https://example.com', x: 20, y: 20, width: 200, height: 40 }],
              width: 800,
              height: 100
            }
        ];
        const html = generateHtml(blocks);

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
        expect(html).not.toContain('<img src=');
    });

    it('should handle block with no buffer and no imageUrl', () => {
        const blocks: (ProcessedBlock & { imageUrl?: string })[] = [
            { type: 'image', width: 800, height: 100 },
        ];
        const html = generateHtml(blocks);
        // src should be empty string
        expect(html).toContain('<img src=""');
    });

    it('should handle block with no links', () => {
        const blocks: (ProcessedBlock & { imageUrl?: string })[] = [
            { type: 'image', buffer: Buffer.from('test'), width: 800, height: 100 },
        ];
        const html = generateHtml(blocks);
        // Should NOT contain link overlays
        expect(html).not.toContain('<a href=');
        expect(html).toContain('<img src="data:image/png;base64,');
    });

    it('should use buffer base64 when imageUrl not provided', () => {
        const blocks: (ProcessedBlock & { imageUrl?: string })[] = [
            { type: 'image', buffer: Buffer.from('hello'), width: 800, height: 100 },
        ];
        const html = generateHtml(blocks);
        expect(html).toContain('data:image/png;base64,aGVsbG8=');
    });
});
