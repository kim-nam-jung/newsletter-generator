import { useEffect } from 'react';

interface UseKeyboardShortcutsParams {
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

/**
 * Registers global keyboard shortcuts:
 * - Ctrl/Cmd+S: Save
 * - Ctrl/Cmd+Z: Undo (outside input fields)
 * - Ctrl/Cmd+Y: Redo (outside input fields)
 */
export function useKeyboardShortcuts({ onSave, onUndo, onRedo }: UseKeyboardShortcutsParams): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 기본 브라우저 동작 유지
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.ql-editor'); // Quill 에디터 내부

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          onSave();
        } else if (e.key === 'z' && !isInputField) {
          // 입력 필드가 아닐 때만 전역 undo
          e.preventDefault();
          onUndo();
        } else if (e.key === 'y' && !isInputField) {
          // 입력 필드가 아닐 때만 전역 redo
          e.preventDefault();
          onRedo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onUndo, onRedo]);
}
