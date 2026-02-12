
import React from 'react';
import type { PdfBlock } from '../../types';

interface PdfPageRendererProps {
  block: PdfBlock;
}

const PdfPageRenderer: React.FC<PdfPageRendererProps> = ({ block }) => {
  const { src, content, width, height } = block;

  return (
    <div
        className="pdf-page-block relative shadow-sm border border-gray-100"
        style={{
            maxWidth: '100%',
            lineHeight: 0,
        }}
    >
        {/* 배경 이미지 (PDF 페이지를 래스터화) */}
        <img
            src={src}
            alt="PDF Page"
            style={{ width: '100%', height: 'auto', display: 'block' }}
        />

        {/* 텍스트 레이어 (투명 텍스트 - 선택/복사 가능) */}
        {content && (
             <div
                className="textLayer absolute top-0 left-0 origin-top-left"
                style={{
                    width: width ? `${width}px` : '100%',
                    height: height ? `${height}px` : '100%',
                    transform: 'scale(var(--scale-factor, 1))',
                    pointerEvents: 'auto',
                }}
                dangerouslySetInnerHTML={{ __html: content }}
             />
        )}

        {/* 텍스트 레이어 스케일 조정 */}
        <ScaleHandler originalWidth={width || 800} />
    </div>
  );
};

// Helper to keep the text layer aligned with the responsive image
const ScaleHandler = ({ originalWidth }: { originalWidth: number }) => {
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const updateScale = () => {
            if (ref.current && ref.current.parentElement) {
                const parentWidth = ref.current.parentElement.clientWidth;
                const scale = parentWidth / originalWidth;
                ref.current.parentElement.style.setProperty('--scale-factor', scale.toString());
                
                // Also scale the text layer container size effective? 
                // Actually pdfjs text tokens are absolutely positioned in pixels.
                // So we need to scale the CONTAINER.
                const textLayer = ref.current.parentElement.querySelector('.textLayer') as HTMLElement;
                if (textLayer) {
                    textLayer.style.transform = `scale(${scale})`;
                    textLayer.style.transformOrigin = '0 0';
                }
            }
        };

        const resizeObserver = new ResizeObserver(updateScale);
        if (ref.current?.parentElement) {
            resizeObserver.observe(ref.current.parentElement);
        }
        
        // Initial call (delay slightly for layout)
        setTimeout(updateScale, 100);

        return () => resizeObserver.disconnect();
    }, [originalWidth]);

    return <div ref={ref} style={{ display: 'none' }} />;
};

export default PdfPageRenderer;
