import { useEffect, useCallback } from 'react';
import { useUIStore } from '../stores/uiStore';

interface UseResizableParams {
  containerSelector?: string;
  minWidth?: number;
  maxWidth?: number;
}

interface UseResizableReturn {
  editorWidth: number;
  isResizing: boolean;
  startResizing: () => void;
  stopResizing: () => void;
}

/**
 * Handles drag-resize logic for the editor/preview panel split.
 */
export function useResizable({
  containerSelector = '.main-layout',
  minWidth = 20,
  maxWidth = 80,
}: UseResizableParams = {}): UseResizableReturn {
  const { editorWidth, setEditorWidth, isResizing, setIsResizing } = useUIStore();

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, [setIsResizing]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, [setIsResizing]);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const mainLayout = document.querySelector(containerSelector);
      if (mainLayout) {
        const { left, width } = mainLayout.getBoundingClientRect();
        const newEditorWidth = ((mouseMoveEvent.clientX - left) / width) * 100;
        if (newEditorWidth > minWidth && newEditorWidth < maxWidth) {
          setEditorWidth(newEditorWidth);
        }
      }
    }
  }, [isResizing, setEditorWidth, containerSelector, minWidth, maxWidth]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return { editorWidth, isResizing, startResizing, stopResizing };
}
