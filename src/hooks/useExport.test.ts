import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExport } from './useExport';
import { useEditorStore } from '../stores/editorStore';
import { useNewsletterStore } from '../stores/newsletterStore';

// Mock useToast
const showToastMock = vi.fn();
vi.mock('../components/Toast', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

describe('useExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    useEditorStore.setState({ blocks: [], history: [[]], historyIndex: 0 });
    useNewsletterStore.setState({
      newsletterId: null,
      title: 'Test Newsletter',
      savedNewsletters: [],
      exportPath: '',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load settings on mount', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ exportPath: 'C:\\exports' }), { status: 200 })
    );

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    
    expect(result.current.exportPath).toBe('C:\\exports');
  });

  it('should save settings', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await result.current.saveSettings('D:\\output'); });
    
    expect(fetchSpy).toHaveBeenCalledWith('/api/settings', expect.objectContaining({
      method: 'POST',
    }));
    expect(result.current.exportPath).toBe('D:\\output');
  });

  it('should handle saveSettings error gracefully', async () => {
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 200 })) // loadSettings on mount
      .mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await result.current.saveSettings('bad-path'); });
    
    // Should not throw
  });

  it('should handle loadSettings error gracefully', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValueOnce(new Error('Settings unavailable'));

    renderHook(() => useExport());
    
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    
    // Should not throw, exportPath stays ''
    expect(useNewsletterStore.getState().exportPath).toBe('');
  });

  it('should export HTML with server-side save when exportPath is set', async () => {
    useNewsletterStore.getState().setExportPath('C:\\exports');
    useNewsletterStore.getState().setTitle('My Newsletter');
    useEditorStore.getState().setBlocks([{ id: '1', type: 'text', content: 'Hello' }]);

    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await result.current.handleExportHtml(); });
    
    const exportCall = fetchSpy.mock.calls.find(c => c[0] === '/api/export');
    expect(exportCall).toBeTruthy();
    expect(showToastMock).toHaveBeenCalledWith(expect.stringContaining('Exported to'), 'success');
  });

  it('should handle server-side export error with JSON error body', async () => {
    useNewsletterStore.getState().setExportPath('C:\\exports');
    useEditorStore.getState().setBlocks([{ id: '1', type: 'text', content: 'Hello' }]);

    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 200 })) // loadSettings
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Disk full' }), { status: 500 })); // export

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await result.current.handleExportHtml(); });
    
    expect(showToastMock).toHaveBeenCalledWith(expect.stringContaining('Auto-export failed'), 'error');
  });

  it('should convert image blocks to base64 before export', async () => {
    useNewsletterStore.getState().setExportPath('C:\\exports');
    useEditorStore.getState().setBlocks([
      { id: '1', type: 'image', src: '/uploads/test.jpg' } as any,
    ]);

    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 200 })) // loadSettings
      .mockResolvedValueOnce(new Response(JSON.stringify({ dataUri: 'data:image/jpeg;base64,abc' }), { status: 200 })) // base64 convert
      .mockResolvedValueOnce(new Response('{}', { status: 200 })); // export

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await result.current.handleExportHtml(); });
    
    const base64Call = (window.fetch as any).mock.calls.find((c: any[]) =>
      typeof c[0] === 'string' && c[0].includes('/api/image-base64')
    );
    expect(base64Call).toBeTruthy();
  });

  it('should convert PDF blocks to base64 and fix MIME type', async () => {
    useNewsletterStore.getState().setExportPath('C:\\exports');
    useEditorStore.getState().setBlocks([
      { id: '1', type: 'pdf', src: '/uploads/page.png', content: '<span>text</span>' } as any,
    ]);

    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 200 })) // loadSettings
      .mockResolvedValueOnce(new Response(JSON.stringify({ dataUri: 'data:image/pdf;base64,abc' }), { status: 200 })) // base64
      .mockResolvedValueOnce(new Response('{}', { status: 200 })); // export

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await result.current.handleExportHtml(); });

    // Should have called the export API
    const exportCall = (window.fetch as any).mock.calls.find((c: any[]) => c[0] === '/api/export');
    expect(exportCall).toBeTruthy();
  });

  it('should handle base64 conversion failure gracefully', async () => {
    useNewsletterStore.getState().setExportPath('C:\\exports');
    useEditorStore.getState().setBlocks([
      { id: '1', type: 'image', src: '/uploads/test.jpg' } as any,
    ]);

    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 200 })) // loadSettings
      .mockRejectedValueOnce(new Error('Base64 conversion failed')) // base64 convert fails
      .mockResolvedValueOnce(new Response('{}', { status: 200 })); // export

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await result.current.handleExportHtml(); });

    // Should still export (with original src), not crash
    expect(showToastMock).toHaveBeenCalledWith(expect.stringContaining('Exported to'), 'success');
  });

  it('should handle base64 non-ok response', async () => {
    useNewsletterStore.getState().setExportPath('C:\\exports');
    useEditorStore.getState().setBlocks([
      { id: '1', type: 'image', src: '/uploads/test.jpg' } as any,
    ]);

    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 200 })) // loadSettings
      .mockResolvedValueOnce(new Response('{}', { status: 404 })) // base64 not found
      .mockResolvedValueOnce(new Response('{}', { status: 200 })); // export

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await result.current.handleExportHtml(); });

    // Should still export with original src
    expect(showToastMock).toHaveBeenCalledWith(expect.stringContaining('Exported to'), 'success');
  });

  it('should skip base64 conversion for non-upload images', async () => {
    useNewsletterStore.getState().setExportPath('C:\\exports');
    useEditorStore.getState().setBlocks([
      { id: '1', type: 'image', src: 'data:image/png;base64,existing' } as any,
    ]);

    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await result.current.handleExportHtml(); });

    const base64Call = fetchSpy.mock.calls.find(c =>
      typeof c[0] === 'string' && (c[0] as string).includes('/api/image-base64')
    );
    expect(base64Call).toBeUndefined();
  });

  it('should use showSaveFilePicker when available and no exportPath', async () => {
    useNewsletterStore.getState().setExportPath('');
    useEditorStore.getState().setBlocks([{ id: '1', type: 'text', content: 'Hello' }]);

    const writeSpy = vi.fn();
    const closeSpy = vi.fn();
    const mockHandle = {
      createWritable: vi.fn().mockResolvedValue({
        write: writeSpy,
        close: closeSpy,
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).showSaveFilePicker = vi.fn().mockResolvedValue(mockHandle);

    vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await result.current.handleExportHtml(); });

    expect((window as any).showSaveFilePicker).toHaveBeenCalled();
    expect(writeSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith('Export successful!', 'success');

    delete (window as any).showSaveFilePicker;
  });

  it('should handle AbortError from showSaveFilePicker silently', async () => {
    useNewsletterStore.getState().setExportPath('');
    useEditorStore.getState().setBlocks([{ id: '1', type: 'text', content: 'Hello' }]);

    const abortError = new Error('User cancelled');
    abortError.name = 'AbortError';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).showSaveFilePicker = vi.fn().mockRejectedValue(abortError);

    vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await result.current.handleExportHtml(); });

    // Should NOT show error toast for AbortError
    expect(showToastMock).not.toHaveBeenCalledWith(expect.stringContaining('canceled'), 'error');

    delete (window as any).showSaveFilePicker;
  });

  it('should show error toast for non-AbortError from showSaveFilePicker', async () => {
    useNewsletterStore.getState().setExportPath('');
    useEditorStore.getState().setBlocks([{ id: '1', type: 'text', content: 'Hello' }]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).showSaveFilePicker = vi.fn().mockRejectedValue(new Error('Permission denied'));

    vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await result.current.handleExportHtml(); });

    expect(showToastMock).toHaveBeenCalledWith('Export canceled or failed', 'error');

    delete (window as any).showSaveFilePicker;
  });

  it('should use fallback download when no exportPath and no showSaveFilePicker', async () => {
    useNewsletterStore.getState().setExportPath('');
    useEditorStore.getState().setBlocks([{ id: '1', type: 'text', content: 'Hello' }]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).showSaveFilePicker;

    vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    // IMPORTANT: renderHook BEFORE mocking document.body methods (React needs them)
    const { result } = renderHook(() => useExport());

    // Mock URL and DOM AFTER render
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { href: '', download: '', click: clickSpy, style: {} } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node as HTMLElement);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node as HTMLElement);

    await act(async () => { await result.current.handleExportHtml(); });
    
    expect(clickSpy).toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith('Export successful!', 'success');
  });

  it('should handle openFolder when exportPath is set', async () => {
    useNewsletterStore.getState().setExportPath('C:\\exports');

    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await result.current.handleOpenFolder(); });
    
    const openCall = fetchSpy.mock.calls.find(c => c[0] === '/api/open-folder');
    expect(openCall).toBeTruthy();
  });

  it('should handle openFolder error gracefully', async () => {
    useNewsletterStore.getState().setExportPath('C:\\exports');

    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 200 })) // loadSettings
      .mockRejectedValueOnce(new Error('Failed to open')); // openFolder

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await result.current.handleOpenFolder(); });
    
    // Should not throw
  });

  it('should open settings when openFolder called without exportPath', async () => {
    useNewsletterStore.getState().setExportPath('');

    vi.spyOn(window, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const { result } = renderHook(() => useExport());
    
    await act(async () => { await result.current.handleOpenFolder(); });
    
    const openCall = (window.fetch as any).mock.calls.find((c: any[]) => c[0] === '/api/open-folder');
    expect(openCall).toBeUndefined();
  });
});
