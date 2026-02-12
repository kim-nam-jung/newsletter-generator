import React, { useCallback } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useNewsletterStore } from '../stores/newsletterStore';
import { useUIStore } from '../stores/uiStore';
import { useToast } from '../components/Toast';

interface UseNewsletterManagerParams {
  onDraftClear: () => void;
}

interface UseNewsletterManagerReturn {
  savedNewsletters: import('../types').NewsletterSummary[];
  fetchNewsletters: () => Promise<void>;
  handleSave: () => Promise<void>;
  loadNewsletter: (id: string) => Promise<void>;
  handleNewNewsletter: () => void;
  handleDeleteNewsletter: (e: React.MouseEvent, id: string, title: string) => Promise<void>;
}

/**
 * Newsletter CRUD operations: save, load, delete, new.
 */
export function useNewsletterManager({ onDraftClear }: UseNewsletterManagerParams): UseNewsletterManagerReturn {
  const { blocks, setBlocks, reset: resetEditor } = useEditorStore();
  const {
    newsletterId, setNewsletterId,
    title, setTitle,
    savedNewsletters, setSavedNewsletters,
  } = useNewsletterStore();
  const { setActiveTab } = useUIStore();
  const { showToast } = useToast();

  const fetchNewsletters = useCallback(async () => {
    try {
      const res = await fetch('/api/newsletters');
      if (res.ok) {
        const data = await res.json();
        setSavedNewsletters(data);
      }
    } catch {
      console.error('Failed to load list');
    }
  }, [setSavedNewsletters]);

  const handleSave = useCallback(async () => {
    let saveTitle = title;

    if (!newsletterId && title === 'Untitled Newsletter') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firstTextBlock = blocks.find(b => b.type === 'text' && (b as any).content);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (firstTextBlock && (firstTextBlock as any).content) {
        const tempDiv = document.createElement('div');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tempDiv.innerHTML = (firstTextBlock as any).content;
        const plainText = tempDiv.textContent || '';
        const firstSentence = plainText.split(/[.!?]/)[0].trim().substring(0, 30);

        if (firstSentence) {
          saveTitle = firstSentence;
        }
      }

      let uniqueTitle = saveTitle;
      let counter = 1;
      while (savedNewsletters.some(n => n.title === uniqueTitle)) {
        uniqueTitle = `${saveTitle} (${counter})`;
        counter++;
      }
      saveTitle = uniqueTitle;
    }

    if (!newsletterId) {
      const input = window.prompt('Enter newsletter title:', saveTitle);
      if (input === null) return;
      saveTitle = input || saveTitle;
      setTitle(saveTitle);
    }

    try {
      const response = await fetch('/api/newsletters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newsletterId,
          title: saveTitle,
          blocks,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      const data = await response.json();
      setNewsletterId(data.id);
      showToast('Newsletter saved successfully!', 'success');
      fetchNewsletters();
    } catch (error) {
      console.error(error);
      console.error('Failed to save newsletter');
      showToast('Failed to save newsletter', 'error');
    }
  }, [blocks, title, newsletterId, savedNewsletters, showToast, fetchNewsletters, setNewsletterId, setTitle]);

  const loadNewsletter = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/newsletters/${id}`);
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.blocks || []);
        setNewsletterId(data.id);
        setTitle(data.title);
      }
    } catch {
      console.error('Failed to load newsletter');
      showToast('Failed to load newsletter', 'error');
    }
  }, [setBlocks, setNewsletterId, setTitle, showToast]);

  const handleNewNewsletter = useCallback(() => {
    if (window.confirm('Start a new newsletter? Unsaved changes will be lost.')) {
      resetEditor();
      setNewsletterId(null);
      setTitle('Untitled Newsletter');
      setActiveTab('editor');
      onDraftClear();
    }
  }, [resetEditor, setNewsletterId, setTitle, setActiveTab, onDraftClear]);

  const handleDeleteNewsletter = useCallback(async (e: React.MouseEvent, id: string, deleteTitle: string) => {
    e.stopPropagation(); // Prevent loading the newsletter when clicking delete

    if (window.confirm(`Are you sure you want to delete "${deleteTitle}"?`)) {
      try {
        const res = await fetch(`/api/newsletters/${id}`, { method: 'DELETE' });
        if (res.ok) {
          // If deleting the currently loaded one, reset editor
          if (newsletterId === id) {
            handleNewNewsletter();
          }
          fetchNewsletters();
        } else {
          showToast('Failed to delete newsletter', 'error');
        }
      } catch (error) {
        console.error('Failed to delete', error);
        showToast('Failed to delete newsletter', 'error');
      }
    }
  }, [newsletterId, handleNewNewsletter, fetchNewsletters, showToast]);

  return {
    savedNewsletters,
    fetchNewsletters,
    handleSave,
    loadNewsletter,
    handleNewNewsletter,
    handleDeleteNewsletter,
  };
}
