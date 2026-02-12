import { describe, it, expect } from 'vitest';
import { generateHtml } from './htmlGenerator';
import type { PdfBlock, ImageBlock, TextBlock, HtmlBlock } from '../types';

describe('generateHtml', () => {
    describe('text blocks', () => {
        it('should render text block content', () => {
            const block: TextBlock = { id: 't1', type: 'text', content: '<p>Hello World</p>' };
            const html = generateHtml([block], 'Test');
            expect(html).toContain('<p>Hello World</p>');
            expect(html).toContain('font-family: sans-serif');
        });
    });

    describe('html blocks', () => {
        it('should render html block content', () => {
            const block: HtmlBlock = { id: 'h1', type: 'html', content: '<div>Custom HTML</div>' };
            const html = generateHtml([block], 'Test');
            expect(html).toContain('<div>Custom HTML</div>');
        });
    });

    describe('image blocks', () => {
        it('should render image with single link', () => {
            const block: ImageBlock = { id: 'img-1', type: 'image', src: 'img.jpg', link: 'https://example.com' };
            const html = generateHtml([block]);
            expect(html).toContain('<a href="https://example.com"');
            expect(html).not.toContain('<map');
        });

        it('should render image without link', () => {
            const block: ImageBlock = { id: 'img-2', type: 'image', src: 'img.jpg' };
            const html = generateHtml([block]);
            expect(html).toContain('<img src="img.jpg"');
            expect(html).not.toContain('<a href');
        });

        it('should reject invalid link URL', () => {
            const block: ImageBlock = { id: 'img-3', type: 'image', src: 'img.jpg', link: 'javascript:alert(1)' };
            const html = generateHtml([block]);
            expect(html).not.toContain('javascript:');
            expect(html).not.toContain('<a href');
        });

        it('should use image map for overlay links', () => {
            const block: ImageBlock = {
                id: 'img-map',
                type: 'image',
                src: 'img.jpg',
                width: 800,
                links: [
                    { url: 'https://example.com', x: 100, y: 100, width: 200, height: 50 },
                ],
            };
            const html = generateHtml([block]);
            expect(html).toContain('usemap="#map-img-map"');
            expect(html).toContain('<map name="map-img-map">');
            expect(html).toContain('<area shape="rect"');
            expect(html).toContain('href="https://example.com"');
        });

        it('should filter out invalid URLs in image map links', () => {
            const block: ImageBlock = {
                id: 'img-filter',
                type: 'image',
                src: 'img.jpg',
                width: 800,
                links: [
                    { url: 'javascript:void(0)', x: 0, y: 0, width: 100, height: 100 },
                    { url: 'https://valid.com', x: 200, y: 200, width: 100, height: 100 },
                ],
            };
            const html = generateHtml([block]);
            expect(html).not.toContain('javascript:');
            expect(html).toContain('href="https://valid.com"');
        });

        it('should scale coordinates based on width', () => {
            const block: ImageBlock = {
                id: 'img-scale',
                type: 'image',
                src: 'img.jpg',
                width: 1600,
                links: [
                    { url: 'https://example.com', x: 200, y: 200, width: 200, height: 200 },
                ],
            };
            const html = generateHtml([block]);
            // Scale = 800/1600 = 0.5
            expect(html).toContain('coords="100,100,200,200"');
        });
    });

    describe('pdf blocks', () => {
        it('should generate image map for PDF blocks', () => {
            const block: PdfBlock = {
                id: 'pdf-1',
                type: 'pdf',
                src: 'doc.pdf',
                width: 800,
                height: 1000,
                content: '<span>Hello World</span>',
                links: [
                    { url: 'https://google.com', x: 100, y: 100, width: 200, height: 50 },
                    { url: 'https://naver.com', x: 400, y: 500, width: 100, height: 100 }
                ]
            };
            const html = generateHtml([block], 'Test Newsletter');

            expect(html).toContain('<map name="map-pdf-1">');
            expect(html).toContain('<area shape="rect"');
            expect(html).toContain('href="https://google.com"');
            expect(html).toContain('href="https://naver.com"');
            expect(html).toContain('usemap="#map-pdf-1"');
        });

        it('should include text layer with mso conditional', () => {
            const block: PdfBlock = {
                id: 'pdf-tl',
                type: 'pdf',
                src: 'doc.pdf',
                content: '<span>Text</span>',
            };
            const html = generateHtml([block]);

            expect(html).toContain('<!--[if !mso]><!--><div class="textLayer"');
            expect(html).toContain('Text');
            expect(html).toContain('</div><!--<![endif]-->');
        });

        it('should handle PDF without text layer', () => {
            const block: PdfBlock = {
                id: 'pdf-notext',
                type: 'pdf',
                src: 'doc.pdf',
            };
            const html = generateHtml([block]);

            expect(html).toContain('<img');
            // The textLayer div should NOT appear in the row (only in CSS styles)
            expect(html).not.toContain('<!--[if !mso]><!--><div class="textLayer"');
        });

        it('should handle PDF without links', () => {
            const block: PdfBlock = {
                id: 'pdf-nolinks',
                type: 'pdf',
                src: 'doc.pdf',
            };
            const html = generateHtml([block]);
            
            expect(html).toContain('<map name="map-pdf-nolinks">');
            // Empty map - no areas
        });

        it('should calculate correct coordinates for PDF image map', () => {
            const block: PdfBlock = {
                id: 'coords-test',
                type: 'pdf',
                src: 'img.png',
                width: 1600,
                height: 2000,
                links: [
                    { url: 'http://link.com', x: 200, y: 200, width: 200, height: 200 }
                ]
            };
            const html = generateHtml([block]);
            expect(html).toContain('coords="100,100,200,200"');
        });

        it('should filter invalid URLs in PDF links', () => {
            const block: PdfBlock = {
                id: 'pdf-filter',
                type: 'pdf',
                src: 'doc.pdf',
                width: 800,
                links: [
                    { url: 'ftp://bad.com', x: 0, y: 0, width: 100, height: 100 },
                ],
            };
            const html = generateHtml([block]);
            expect(html).not.toContain('ftp://');
        });
    });

    describe('general', () => {
        it('should use default title', () => {
            const html = generateHtml([]);
            expect(html).toContain('<title>Newsletter</title>');
        });

        it('should use custom title', () => {
            const html = generateHtml([], 'My Custom Title');
            expect(html).toContain('<title>My Custom Title</title>');
        });

        it('should handle empty block list', () => {
            const html = generateHtml([]);
            expect(html).toContain('<table');
            expect(html).toContain('</table>');
        });

        it('should handle unknown block types gracefully', () => {
            const block = { id: 'unknown', type: 'placeholder' } as any;
            const html = generateHtml([block]);
            // Should return empty string for unknown types
            expect(html).toContain('<table');
        });

        it('should render multiple blocks in order', () => {
            const blocks = [
                { id: 't1', type: 'text', content: 'First' } as TextBlock,
                { id: 'img1', type: 'image', src: 'img.jpg' } as ImageBlock,
                { id: 't2', type: 'text', content: 'Last' } as TextBlock,
            ];
            const html = generateHtml(blocks);
            const firstIdx = html.indexOf('First');
            const imgIdx = html.indexOf('img.jpg');
            const lastIdx = html.indexOf('Last');
            expect(firstIdx).toBeLessThan(imgIdx);
            expect(imgIdx).toBeLessThan(lastIdx);
        });

        it('should include textLayer CSS styles', () => {
            const html = generateHtml([]);
            expect(html).toContain('.textLayer');
            expect(html).toContain('color: transparent');
        });

        it('should use default width fallback for image link scaling', () => {
            const block: ImageBlock = {
                id: 'img-no-width',
                type: 'image',
                src: 'img.jpg',
                // no width — should default to 800
                links: [
                    { url: 'https://example.com', x: 100, y: 100, width: 200, height: 50 },
                ],
            };
            const html = generateHtml([block]);
            // Scale = 800 / 800 = 1, so coords should be unchanged
            expect(html).toContain('coords="100,100,300,150"');
        });

        it('should use default width fallback for PDF link scaling', () => {
            const block: PdfBlock = {
                id: 'pdf-no-width',
                type: 'pdf',
                src: 'doc.pdf',
                // no width — should default to 800
                links: [
                    { url: 'https://example.com', x: 100, y: 200, width: 300, height: 100 },
                ],
            };
            const html = generateHtml([block]);
            // Scale = 800 / 800 = 1
            expect(html).toContain('coords="100,200,400,300"');
        });
    });
});
