import { useEffect, useCallback } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useNewsletterStore } from '../stores/newsletterStore';
import { useUIStore } from '../stores/uiStore';
import { useToast } from '../components/Toast';
import { generateHtml } from '../utils/htmlGenerator';

interface UseExportReturn {
  exportPath: string;
  handleExportHtml: () => Promise<void>;
  handleOpenFolder: () => Promise<void>;
  saveSettings: (path: string) => Promise<void>;
  loadSettings: () => Promise<void>;
}

/**
 * Handles HTML export, settings management, and folder opening.
 */
export function useExport(): UseExportReturn {
  const { blocks } = useEditorStore();
  const { title, exportPath, setExportPath } = useNewsletterStore();
  const { setShowSettings } = useUIStore();
  const { showToast } = useToast();

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.exportPath) setExportPath(data.exportPath);
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  }, [setExportPath]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = useCallback(async (path: string) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exportPath: path }),
      });
      setExportPath(path);
    } catch {
      console.error('Failed to save settings');
    }
  }, [setExportPath]);

  const handleExportHtml = useCallback(async () => {
    const filename = `${title.replace(/[^a-z0-9가-힣]/gi, '_') || 'newsletter'}.html`;

    // Convert images to Base64 for standalone HTML
    const blocksWithBase64 = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blocks.map(async (block: any) => {
        if ((block.type === 'image' || block.type === 'pdf') && block.src.startsWith('/uploads/')) {
          try {
            const res = await fetch(`/api/image-base64?path=${encodeURIComponent(block.src)}`);
            if (res.ok) {
              const { dataUri } = await res.json();
              if (block.type === 'pdf') {
                const pdfDataUri = dataUri.replace('image/pdf', 'application/pdf');
                return { ...block, src: pdfDataUri };
              }
              return { ...block, src: dataUri };
            }
          } catch (e) {
            console.error('Failed to convert file to base64', e);
          }
        }
        return block;
      })
    );

    const exportHtml = generateHtml(blocksWithBase64, title);

    // Case 1: Default Export Path is Set (Server-side auto-save)
    if (exportPath) {
      try {
        const res = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: exportHtml,
            path: exportPath,
            filename,
          }),
        });

        if (res.ok) {
          showToast(`Exported to ${exportPath}\\${filename}`, 'success');
        } else {
          const err = await res.json();
          throw new Error(err.error);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(e);
        console.error(`Auto-export failed: ${errorMessage}`);
        showToast(`Auto-export failed: ${errorMessage}`, 'error');
      }
      return;
    }

    // Case 2: No Default Path (Client-side Save As Dialog)
    try {
      // Try Native File System Access API
      if ('showSaveFilePicker' in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'HTML File',
            accept: { 'text/html': ['.html'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(exportHtml);
        await writable.close();
        showToast('Export successful!', 'success');
      }
      // Fallback: Classic Download
      else {
        const blob = new Blob([exportHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Export successful!', 'success');
      }
    } catch (err: unknown) {
      // Ignore 'AbortError' (Cancel button)
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error(err);
        console.error('Export canceled or failed', err);
        showToast('Export canceled or failed', 'error');
      }
    }
  }, [blocks, title, exportPath, showToast]);

  const handleOpenFolder = useCallback(async () => {
    if (!exportPath) {
      setShowSettings(true);
      return;
    }

    try {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: exportPath }),
      });
    } catch (error) {
      console.error(error);
      console.error('Failed to open folder', error);
    }
  }, [exportPath, setShowSettings]);

  return { exportPath, handleExportHtml, handleOpenFolder, saveSettings, loadSettings };
}
