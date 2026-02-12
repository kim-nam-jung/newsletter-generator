import { ProcessedBlock } from './processor';

export function generateHtml(blocks: (ProcessedBlock & { imageUrl?: string })[]): string {
  const rows = blocks.map(block => {
    // Start with base64 as fallback
    let src = '';
    if (block.buffer) {
        src = `data:image/png;base64,${block.buffer.toString('base64')}`;
    }
    
    // Use URL if provided (better for invalidating cache/performance)
    if (block.imageUrl) {
        src = block.imageUrl;
    }

    // Generate link overlays
    // NOTE: Links are calculated for 1600px width (Retina).
    // The HTML displays at max-width 800px.
    // So we must scale everything by 0.5 for CSS pixels.
    const displayScale = 0.5;

    const linksHtml = (block.links || []).map(link => {
      return `
        <a href="${link.url}" target="_blank" style="
          position: absolute;
          left: ${link.x * displayScale}px;
          top: ${link.y * displayScale}px;
          width: ${link.width * displayScale}px;
          height: ${link.height * displayScale}px;
          z-index: 10;
          cursor: pointer;
          background-color: rgba(0,0,0,0); /* transparent clickable area */
        " title="${link.url}"></a>
      `;
    }).join('');

    return `
      <tr>
        <td align="center" style="padding: 0;">
          <div style="position: relative; width: 100%; max-width: 800px; margin: 0 auto;">
            <img src="${src}" alt="" style="display: block; width: 100%; max-width: 800px; height: auto; border: 0;" />
            ${linksHtml}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Newsletter</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 800px; background-color: #ffffff; margin: 0 auto;">
    ${rows}
  </table>
</body>
</html>
  `;
}
