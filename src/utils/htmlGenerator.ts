import type { Block } from '../types';
import { escapeHtml, isValidUrl } from '../utils';

export const generateHtml = (blockList: Block[], title: string = 'Newsletter') => {
    const rows = blockList.map(block => {
      if (block.type === 'image') {
        const safeLink = block.link && isValidUrl(block.link) ? escapeHtml(block.link) : '';
        // 단일 링크 (전체 이미지 클릭)
        const linkStart = safeLink ? `<a href="${safeLink}" target="_blank" style="text-decoration: none; display: block;">` : '';
        const linkEnd = safeLink ? '</a>' : '';

        // PDF에서 추출된 오버레이 링크들
        // 서버에서 1600px 기준으로 좌표가 계산되어 있고, display는 800px이므로 0.5 스케일
        const displayScale = 0.5;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const overlayLinks = (block.links || []).map((link: any) => {
            if (!isValidUrl(link.url)) return '';
            const safeUrl = escapeHtml(link.url);
            return `
          <a href="${safeUrl}" target="_blank" style="
            position: absolute;
            left: ${link.x * displayScale}px;
            top: ${link.y * displayScale}px;
            width: ${link.width * displayScale}px;
            height: ${link.height * displayScale}px;
            z-index: 10;
            cursor: pointer;
          " title="${safeUrl}"></a>
        `}).join('');

        // 오버레이 링크가 있으면 position: relative 컨테이너 필요
        if (overlayLinks) {
          return `
            <tr>
              <td align="center" style="padding: 0;">
                <div style="position: relative; display: inline-block; width: 100%; max-width: 800px;">
                  <img src="${block.src}" alt="${block.alt || ''}" style="display: block; width: 100%; max-width: 800px; height: auto; border: 0;" />
                  ${overlayLinks}
                </div>
              </td>
            </tr>
          `;
        }

        return `
          <tr>
            <td align="center" style="padding: 0;">
              ${linkStart}<img src="${block.src}" alt="${block.alt || ''}" style="display: block; width: 100%; max-width: 800px; height: auto; border: 0;" />${linkEnd}
            </td>
          </tr>
        `;
      } else if (block.type === 'text') {
        return `
          <tr>
            <td style="padding: 20px; font-family: sans-serif; font-size: 16px; line-height: 1.5; color: #333;">
              ${block.content}
            </td>
          </tr>
        `;
      } else if (block.type === 'pdf') {
          // Export with Image Map for maximum email client compatibility (Outlook, etc.)
          // Text Layer for text selection and searchability
          // Hidden from Outlook (mso) to prevent layout issues, visible to others
          const textLayer = block.content ? 
              `<!--[if !mso]><!--><div class="textLayer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">${block.content}</div><!--<![endif]-->` 
              : '';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapName = `map-${block.id}`;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const areas = (block.links || []).map((link: any) => {
             if (!isValidUrl(link.url)) return '';
             const safeUrl = escapeHtml(link.url);
             // Calculate coordinates based on natural PDF dimensions (block.width/height)
             // Strategy: We will set coords assuming a fixed width of 800px (our max-width).
             
             // Scale from PDF point size to 800px width
             const scale = 800 / (block.width || 800);
             const x1 = Math.round(link.x * scale);
             const y1 = Math.round(link.y * scale);
             const x2 = Math.round((link.x + link.width) * scale);
             const y2 = Math.round((link.y + link.height) * scale);
             
             return `<area shape="rect" coords="${x1},${y1},${x2},${y2}" href="${safeUrl}" target="_blank" alt="Link" />`;
          }).join('');

          return `
            <tr>
               <td align="center" style="padding: 0;">
                  <div class="pdf-container" style="position: relative; width: 100%; max-width: 800px;">
                    <img src="${block.src}" width="800" usemap="#${mapName}" style="width: 100%; height: auto; display: block;" border="0" />
                    ${textLayer}
                    <map name="${mapName}">
                        ${areas}
                    </map>
                  </div>
               </td>
            </tr>
          `;
      } else if (block.type === 'html') {
          return `
            <tr>
               <td align="center" style="padding: 0;">
                  ${block.content}
               </td>
            </tr>
          `;
      }
      return '';
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; }
    /* Minimal PDF Text Layer CSS */
    .textLayer {
      position: absolute;
      text-align: initial;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
      opacity: 0.2; /* Debug: set to 1 to see text, usually transparent */
      opacity: 1; /* For selection, we want visible selection highlight but transparent text color */
      line-height: 1.0;
      pointer-events: none; /* Let clicks pass through to links if any? Text selection needs events. */
    }
    .textLayer span {
      color: transparent;
      position: absolute;
      white-space: pre;
      cursor: text;
      transform-origin: 0% 0%;
      pointer-events: auto; /* Allow text selection */
    }
    .textLayer ::selection {
      background: rgba(0, 0, 255, 0.3);
      color: transparent;
    }
    /* Link overlay style */
    .link-overlay {
      position: absolute;
      z-index: 20;
      cursor: pointer;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 800px; background-color: #ffffff; margin: 0 auto;">
    ${rows}
  </table>
</body>
</html>
    `;
  };
