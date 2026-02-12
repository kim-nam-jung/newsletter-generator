import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';
import { useEditorStore } from '../stores/editorStore';
import { useNewsletterStore } from '../stores/newsletterStore';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    useEditorStore.setState({ blocks: [], history: [[]], historyIndex: 0 });
    useNewsletterStore.setState({
      newsletterId: null,
      title: 'Untitled Newsletter',
      savedNewsletters: [],
      exportPath: '',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should restore draft from sessionStorage on mount', () => {
    const draft = {
      id: 'test-id',
      title: 'Saved Title',
      blocks: [{ id: '1', type: 'text', content: 'Hello' }],
    };
    sessionStorage.setItem('newsletter_draft', JSON.stringify(draft));

    renderHook(() => useAutoSave());

    const editorState = useEditorStore.getState();
    const nlState = useNewsletterStore.getState();
    expect(editorState.blocks).toHaveLength(1);
    expect(nlState.title).toBe('Saved Title');
    expect(nlState.newsletterId).toBe('test-id');
  });

  it('should not crash on invalid sessionStorage data', () => {
    sessionStorage.setItem('newsletter_draft', 'not json');
    
    expect(() => {
      renderHook(() => useAutoSave());
    }).not.toThrow();
  });

  it('should not restore empty blocks', () => {
    const draft = { id: null, title: 'Empty', blocks: [] };
    sessionStorage.setItem('newsletter_draft', JSON.stringify(draft));

    renderHook(() => useAutoSave());

    const editorState = useEditorStore.getState();
    expect(editorState.blocks).toEqual([]);
  });

  it('should save draft to sessionStorage after debounce', () => {
    useEditorStore.getState().setBlocks([{ id: '1', type: 'text', content: 'Hello' }]);
    useNewsletterStore.getState().setTitle('Test');

    renderHook(() => useAutoSave({ debounceMs: 500 }));

    // Advance past debounce
    act(() => { vi.advanceTimersByTime(600); });

    const saved = sessionStorage.getItem('newsletter_draft');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.title).toBe('Test');
    expect(parsed.blocks).toHaveLength(1);
  });

  it('should clear draft on clearDraft call', () => {
    sessionStorage.setItem('newsletter_draft', 'test');
    
    const { result } = renderHook(() => useAutoSave());
    
    act(() => { result.current.clearDraft(); });
    
    expect(sessionStorage.getItem('newsletter_draft')).toBeNull();
  });

  it('should restore draft with missing id and title fields', () => {
    const draft = {
      blocks: [{ id: '1', type: 'text', content: 'Hello' }],
    };
    sessionStorage.setItem('newsletter_draft', JSON.stringify(draft));

    renderHook(() => useAutoSave());

    const nlState = useNewsletterStore.getState();
    // Missing id → null, missing title → 'Untitled Newsletter'
    expect(nlState.newsletterId).toBeNull();
    expect(nlState.title).toBe('Untitled Newsletter');
    expect(useEditorStore.getState().blocks).toHaveLength(1);
  });

  it('should save draft when only title changes', () => {
    useNewsletterStore.getState().setTitle('Custom Title');

    renderHook(() => useAutoSave({ debounceMs: 500 }));

    act(() => { vi.advanceTimersByTime(600); });

    const saved = sessionStorage.getItem('newsletter_draft');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.title).toBe('Custom Title');
  });
});
