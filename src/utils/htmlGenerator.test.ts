import { describe, it, expect } from 'vitest';
import { generateHtml } from './htmlGenerator';
import { Block } from '../types';

describe('generateHtml', () => {
    it('should generate an image map for PDF blocks', () => {
        const mockPdfBlock: Block = {
            id: 'test-block-123',
            type: 'pdf',
            src: 'https://example.com/doc.pdf',
            width: 800,
            height: 1000,
            content: '<span>Hello World</span>',
            links: [
                { url: 'https://google.com', x: 100, y: 100, width: 200, height: 50 },
                { url: 'https://naver.com', x: 400, y: 500, width: 100, height: 100 }
            ]
        } as any; // Cast for missing properties if any

        const html = generateHtml([mockPdfBlock], 'Test Newsletter');

        // Check for map and area tags
        expect(html).toContain('<map name="map-test-block-123">');
        expect(html).toContain('<area shape="rect"');
        expect(html).toContain('href="https://google.com"');
        expect(html).toContain('href="https://naver.com"');

        // Check for usemap attribute on image
        expect(html).toContain('usemap="#map-test-block-123"');

        // Check for Text Layer presence with Outlook hiding (mso)
        expect(html).toContain('<!--[if !mso]><!--><div class="textLayer"');
        expect(html).toContain('Hello World');
        expect(html).toContain('</div><!--<![endif]-->');

        // Verify NO absolute positioning overlay divs (old method) for the LINKS
        expect(html).not.toContain('class="link-overlay"');
        
        // We can't simple check for "position: absolute" globally because it exists in the <style> block
        // Instead, we verify that NO <a ...> tag contains "position: absolute"
        const absolutePositionLinkRegex = /<a[^>]+style="[^"]*position:\s*absolute/i;
        expect(absolutePositionLinkRegex.test(html)).toBe(false);
    });

    it('should calculate correct coordinates for image map', () => {
        const mockPdfBlock: Block = {
            id: 'coords-test',
            type: 'pdf',
            src: 'img.png',
            width: 1600, // Double the display width (800)
            height: 2000,
            links: [
                { url: 'http://link.com', x: 200, y: 200, width: 200, height: 200 }
            ]
        } as any;

        const html = generateHtml([mockPdfBlock]);

        // Display width is fixed at 800px.
        // Scale = 800 / 1600 = 0.5
        // Expected Coords: 
        // x1 = 200 * 0.5 = 100
        // y1 = 200 * 0.5 = 100
        // x2 = (200+200) * 0.5 = 200
        // y2 = (200+200) * 0.5 = 200
        // Coords string: "100,100,200,200"

        expect(html).toContain('coords="100,100,200,200"');
    });

    it('should handle standard image blocks with single link', () => {
        const mockImageBlock: Block = {
            id: 'img-1',
            type: 'image',
            src: 'img.jpg',
            link: 'https://example.com'
        } as any;

        const html = generateHtml([mockImageBlock]);
        
        expect(html).toContain('<a href="https://example.com"');
        expect(html).not.toContain('<map'); // Standard images use <a> wrapper
    });
});
