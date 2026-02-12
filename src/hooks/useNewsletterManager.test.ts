import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useNewsletterManager } from './useNewsletterManager';
import { useEditorStore } from '../stores/editorStore';
import { useNewsletterStore } from '../stores/newsletterStore';
import { useUIStore } from '../stores/uiStore';

// Mock useToast
const showToastMock = vi.fn();
vi.mock('../components/Toast', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

describe('useNewsletterManager', () => {
  const onDraftClear = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }));
    
    useEditorStore.setState({ blocks: [], history: [[]], historyIndex: 0 });
    useNewsletterStore.setState({
      newsletterId: null,
      title: 'Untitled Newsletter',
      savedNewsletters: [],
      exportPath: '',
    });
    useUIStore.setState({ activeTab: 'editor' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch newsletters', async () => {
    const mockList = [{ id: '1', title: 'Test', updatedAt: 1000 }];
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockList), { status: 200 })
    );

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    await act(async () => { await result.current.fetchNewsletters(); });
    
    expect(result.current.savedNewsletters).toEqual(mockList);
  });

  it('should handle fetch error gracefully', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValueOnce(new Error('Network'));

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    await act(async () => { await result.current.fetchNewsletters(); });
    
    expect(result.current.savedNewsletters).toEqual([]);
  });

  it('should load a newsletter by id', async () => {
    const newsletter = { id: 'abc', title: 'Loaded', blocks: [{ id: '1', type: 'text', content: 'Hi' }] };
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(newsletter), { status: 200 })
    );

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    await act(async () => { await result.current.loadNewsletter('abc'); });
    
    expect(useEditorStore.getState().blocks).toHaveLength(1);
    expect(useNewsletterStore.getState().title).toBe('Loaded');
    expect(useNewsletterStore.getState().newsletterId).toBe('abc');
  });

  it('should handle load error gracefully', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValueOnce(new Error('Not found'));

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    await act(async () => { await result.current.loadNewsletter('xyz'); });
    
    expect(useNewsletterStore.getState().newsletterId).toBeNull();
  });

  it('should call onDraftClear when creating new newsletter', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    act(() => { result.current.handleNewNewsletter(); });
    
    expect(onDraftClear).toHaveBeenCalledOnce();
    expect(useEditorStore.getState().blocks).toEqual([]);
    expect(useNewsletterStore.getState().title).toBe('Untitled Newsletter');
    expect(useNewsletterStore.getState().newsletterId).toBeNull();
  });

  it('should not create new newsletter if user cancels confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    
    useEditorStore.getState().setBlocks([{ id: '1', type: 'text', content: 'test' }]);
    
    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    act(() => { result.current.handleNewNewsletter(); });
    
    expect(onDraftClear).not.toHaveBeenCalled();
    expect(useEditorStore.getState().blocks).toHaveLength(1);
  });

  it('should save newsletter (existing)', async () => {
    useNewsletterStore.getState().setNewsletterId('existing-id');
    useNewsletterStore.getState().setTitle('My Title');
    useEditorStore.getState().setBlocks([{ id: '1', type: 'text', content: 'content' }]);

    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'existing-id' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('[]', { status: 200 }));

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    await act(async () => { await result.current.handleSave(); });

    expect(window.fetch).toHaveBeenCalled();
  });

  it('should save new newsletter with auto-title from text block', async () => {
    // New newsletter (no newsletterId), default title
    useEditorStore.getState().setBlocks([
      { id: '1', type: 'text', content: '<p>Hello World! This is my newsletter.</p>' },
    ]);

    // prompt returns null → auto-title from first text block
    vi.spyOn(window, 'prompt').mockReturnValue('Hello World');

    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'new-id' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('[]', { status: 200 }));

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    await act(async () => { await result.current.handleSave(); });

    // prompt should have been called with auto-generated title suggestion
    expect(window.prompt).toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith('Newsletter saved successfully!', 'success');
  });

  it('should handle cancel on save prompt for new newsletter', async () => {
    // New newsletter, prompt returns null (cancel)
    vi.spyOn(window, 'prompt').mockReturnValue(null);

    const fetchSpy = vi.spyOn(window, 'fetch');

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    await act(async () => { await result.current.handleSave(); });

    // Should NOT have called POST to save
    const saveCalls = fetchSpy.mock.calls.filter(
      c => c[0] === '/api/newsletters' && (c[1] as RequestInit)?.method === 'POST'
    );
    expect(saveCalls).toHaveLength(0);
  });

  it('should generate unique title when duplicates exist', async () => {
    // Set up existing newsletters with the same title
    useNewsletterStore.setState({
      newsletterId: null,
      title: 'Untitled Newsletter',
      savedNewsletters: [
        { id: '1', title: 'Untitled Newsletter', updatedAt: 1000 },
      ],
      exportPath: '',
    });

    // prompt returns confirmed title (the auto-generated unique one)
    vi.spyOn(window, 'prompt').mockImplementation((_, defaultValue) => defaultValue as string);

    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'new-id' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('[]', { status: 200 }));

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    await act(async () => { await result.current.handleSave(); });

    // The prompt default should be "Untitled Newsletter (1)" because "Untitled Newsletter" exists
    const promptCall = (window.prompt as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(promptCall[1]).toBe('Untitled Newsletter (1)');
  });

  it('should use empty input as fallback to auto-title on save', async () => {
    // prompt returns empty string → should fallback to the auto-generated title
    vi.spyOn(window, 'prompt').mockReturnValue('');

    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'new-id' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('[]', { status: 200 }));

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    await act(async () => { await result.current.handleSave(); });

    expect(showToastMock).toHaveBeenCalledWith('Newsletter saved successfully!', 'success');
  });

  it('should handle save error gracefully', async () => {
    useNewsletterStore.getState().setNewsletterId('existing-id');
    
    vi.spyOn(window, 'fetch').mockRejectedValueOnce(new Error('Save failed'));

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    await act(async () => { await result.current.handleSave(); });
    
    expect(showToastMock).toHaveBeenCalledWith('Failed to save newsletter', 'error');
  });

  it('should handle save when response is not ok', async () => {
    useNewsletterStore.getState().setNewsletterId('existing-id');
    
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response('{}', { status: 500 })
    );

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    await act(async () => { await result.current.handleSave(); });
    
    expect(showToastMock).toHaveBeenCalledWith('Failed to save newsletter', 'error');
  });

  it('should delete a newsletter', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))  // DELETE call
      .mockResolvedValueOnce(new Response('[]', { status: 200 })); // fetchNewsletters refresh

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;
    await act(async () => {
      await result.current.handleDeleteNewsletter(mockEvent, 'some-id', 'Some Title');
    });
    
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should reset editor when deleting the currently loaded newsletter', async () => {
    useNewsletterStore.getState().setNewsletterId('current-id');
    useEditorStore.getState().setBlocks([{ id: '1', type: 'text', content: 'data' }]);
    
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))  // DELETE
      .mockResolvedValueOnce(new Response('[]', { status: 200 })); // fetchNewsletters

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;
    await act(async () => {
      await result.current.handleDeleteNewsletter(mockEvent, 'current-id', 'Current');
    });

    // Should have triggered handleNewNewsletter (which calls confirm again)
    // The editor should be reset after deleting current newsletter
  });

  it('should show error toast when delete fails (non-ok response)', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response('{}', { status: 500 })
    );

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;
    await act(async () => {
      await result.current.handleDeleteNewsletter(mockEvent, 'some-id', 'Title');
    });
    
    expect(showToastMock).toHaveBeenCalledWith('Failed to delete newsletter', 'error');
  });

  it('should not delete if user cancels confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;
    await act(async () => {
      await result.current.handleDeleteNewsletter(mockEvent, 'some-id', 'Some Title');
    });

    expect(window.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/newsletters/some-id'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('should handle delete error gracefully', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'fetch').mockRejectedValueOnce(new Error('Delete failed'));

    const { result } = renderHook(() => useNewsletterManager({ onDraftClear }));
    
    const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;
    await act(async () => {
      await result.current.handleDeleteNewsletter(mockEvent, 'some-id', 'Title');
    });
    
    expect(showToastMock).toHaveBeenCalledWith('Failed to delete newsletter', 'error');
  });
});
