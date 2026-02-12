import { useEffect, useCallback } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useNewsletterStore } from '../stores/newsletterStore';
import { useDebounce } from '../utils/useDebounce';

interface UseAutoSaveParams {
  debounceMs?: number;
}

interface UseAutoSaveReturn {
  restoreDraft: () => void;
  clearDraft: () => void;
}

const DRAFT_KEY = 'newsletter_draft';

/**
 * Handles debounced sessionStorage draft persistence and restoration.
 */
export function useAutoSave({ debounceMs = 1000 }: UseAutoSaveParams = {}): UseAutoSaveReturn {
  const { blocks, setBlocks, reset: resetEditor } = useEditorStore();
  const { title, newsletterId, setNewsletterId, setTitle } = useNewsletterStore();

  const debouncedBlocks = useDebounce(blocks, debounceMs);
  const debouncedTitle = useDebounce(title, debounceMs);

  // Persist draft to sessionStorage (debounced)
  useEffect(() => {
    if (debouncedBlocks.length > 0 || debouncedTitle !== 'Untitled Newsletter') {
      const newsletter = {
        id: newsletterId || Date.now().toString(),
        title: debouncedTitle,
        blocks: debouncedBlocks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(newsletter));
    }
  }, [debouncedBlocks, debouncedTitle, newsletterId]);

  const restoreDraft = useCallback(() => {
    const savedDraft = sessionStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const { id, title: savedTitle, blocks: savedBlocks } = JSON.parse(savedDraft);
        if (savedBlocks && savedBlocks.length > 0) {
          // 히스토리 초기화 후 블록 설정
          resetEditor();
          setBlocks(savedBlocks);
          setNewsletterId(id || null);
          setTitle(savedTitle || 'Untitled Newsletter');
        }
      } catch (e) {
        console.error('Failed to restore draft', e);
      }
    }
  }, [resetEditor, setBlocks, setNewsletterId, setTitle]);

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(DRAFT_KEY);
  }, []);

  // Auto-restore on mount
  useEffect(() => {
    restoreDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 1회만 실행

  return { restoreDraft, clearDraft };
}
