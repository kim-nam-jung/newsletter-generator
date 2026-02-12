

import * as pdfjsLib from 'pdfjs-dist';
import { uploadImage } from './api';
import type { LinkInfo } from '../types';
import { escapeHtml } from '../utils';

// Config Worker - pdfjs-dist v5+
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface MyProcessedPage {
    src: string;
    content: string;
    links: LinkInfo[];
    width: number;
    height: number;
}

/** 텍스트 아이템 타입 (pdfjs-dist 내부 타입과 호환) */
interface PdfTextItem {
    str: string;
    transform: number[];
    width?: number;
}

/**
 * 텍스트 레이어 HTML 생성 (pdfjs-dist v5+ 호환)
 * TextLayerBuilder 대신 직접 getTextContent() 사용
 */
/**
 * 텍스트 레이어 HTML 생성 (pdfjs-dist v5+ 호환)
 * TextLayerBuilder 대신 직접 getTextContent() 사용
 */
const buildTextLayerHtml = async (
    page: pdfjsLib.PDFPageProxy,
    viewport: pdfjsLib.PageViewport,
    links: LinkInfo[]
): Promise<string> => {
    const textContent = await page.getTextContent();

    const spans: string[] = [];

    for (const rawItem of textContent.items) {
        // TextMarkedContent가 아닌 TextItem만 처리
        if (!('str' in rawItem) || !('transform' in rawItem)) continue;

        const item = rawItem as unknown as PdfTextItem;

        // 빈 텍스트 건너뛰기
        if (!item.str || item.str.trim() === '') continue;

        const tx = item.transform[4];
        const ty = item.transform[5];

        // PDF 좌표 → 뷰포트 좌표 변환
        const [vx, vy] = viewport.convertToViewportPoint(tx, ty);

        // 폰트 높이 계산 (transform matrix에서)
        const fontHeight = Math.hypot(item.transform[0], item.transform[1]);

        // 텍스트 너비 (있으면 사용. 없으면 추정하지 않음 - 정확도 문제)
        // item.width는 PDF 좌표계의 너비이므로 scale을 곱해야 함
        const width = item.width ? item.width * viewport.scale : 0;

        // 텍스트 아이템의 대략적인 Bounding Box (Viewport 좌표계)
        // Top-Left 기준: x=vx, y=vy-fontHeight
        const textRect = {
            x: vx,
            y: vy - fontHeight,
            width: width,
            height: fontHeight
        };

        // 링크와의 교차 확인
        // 텍스트의 중심점이 링크 영역 안에 있는지 확인하는 방식이 가장 안전함 (단순 교차는 오탐지 가능)
        // 혹은 텍스트 영역과 링크 영역이 일정 부분 겹치는지 확인
        const link = links.find(l => {
            // Check if text center is inside link rect
            const centerX = textRect.x + (textRect.width / 2);
            const centerY = textRect.y + (textRect.height / 2);
            
            return (
                centerX >= l.x && 
                centerX <= l.x + l.width &&
                centerY >= l.y && 
                centerY <= l.y + l.height
            );
        });

        const style = `
            position: absolute;
            left: ${vx.toFixed(2)}px;
            top: ${(vy - fontHeight).toFixed(2)}px;
            font-size: ${fontHeight.toFixed(2)}px;
            font-family: sans-serif;
            color: transparent;
            white-space: pre;
            pointer-events: auto;
            ${width > 0 ? `width: ${width.toFixed(2)}px;` : ''}
        `;

        const content = escapeHtml(item.str);
        spans.push(`<span style="${style}">${content}</span>`);
    }

    return spans.join('\n');
};

export const processPdfFile = async (file: File): Promise<MyProcessedPage[]> => {
    console.log('[PDF-CLIENT] Starting PDF processing...');

    // 1. Load PDF
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const doc = await loadingTask.promise;

    console.log(`[PDF-CLIENT] PDF loaded. Pages: ${doc.numPages}`);

    const processedPages: MyProcessedPage[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
        console.log(`[PDF-CLIENT] Processing page ${i}/${doc.numPages}...`);

        const page = await doc.getPage(i);
        const scale = 1.5; // 고해상도 렌더링
        const viewport = page.getViewport({ scale });

        // -- 1. 이미지 렌더링 --
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        if (!context) {
            console.error(`[PDF-CLIENT] Failed to get canvas context for page ${i}`);
            continue;
        }

        await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas,
        }).promise;

        // Canvas → JPEG Blob → File
        const blob = await new Promise<Blob | null>(resolve =>
            canvas.toBlob(resolve, 'image/jpeg', 0.92)
        );

        if (!blob) {
            console.error(`[PDF-CLIENT] Failed to create blob for page ${i}`);
            continue;
        }

        // 서버에 업로드
        const imageFile = new File([blob], `page-${i}.jpg`, { type: 'image/jpeg' });
        const uploadedBlocks = await uploadImage(imageFile, 0);
        const imageSrc = uploadedBlocks[0]?.src || '';

        console.log(`[PDF-CLIENT] Page ${i} image uploaded: ${imageSrc}`);

        // -- 2. 링크(Annotation) 추출 (Text Layer 생성 전 수행) --
        const links: LinkInfo[] = [];
        try {
            const annotations = await page.getAnnotations();
            for (const annotation of annotations) {
                if (annotation.subtype === 'Link' && annotation.url) {
                    const [x1, y1] = viewport.convertToViewportPoint(annotation.rect[0], annotation.rect[1]);
                    const [x2, y2] = viewport.convertToViewportPoint(annotation.rect[2], annotation.rect[3]);

                    const minX = Math.min(x1, x2);
                    const maxX = Math.max(x1, x2);
                    const minY = Math.min(y1, y2);
                    const maxY = Math.max(y1, y2);

                    links.push({
                        url: annotation.url,
                        x: minX,
                        y: minY,
                        width: maxX - minX,
                        height: maxY - minY
                    });
                }
            }
            console.log(`[PDF-CLIENT] Page ${i} links extracted: ${links.length}`);
        } catch (err) {
            console.error(`[PDF-CLIENT] Link extraction failed for page ${i}:`, err);
        }

        // -- 3. 텍스트 레이어 생성 (링크 정보 주입) --
        let textLayerHtml = '';
        try {
            textLayerHtml = await buildTextLayerHtml(page, viewport, links);
            console.log(`[PDF-CLIENT] Page ${i} text layer created. Length: ${textLayerHtml.length}`);
        } catch (err) {
            console.error(`[PDF-CLIENT] Text layer failed for page ${i}:`, err);
        }

        processedPages.push({
            src: imageSrc,
            content: textLayerHtml,
            links: links, // 링크 정보를 전달하여 App.tsx에서 오버레이 생성
            width: viewport.width,
            height: viewport.height
        });
    }

    return processedPages;
};



