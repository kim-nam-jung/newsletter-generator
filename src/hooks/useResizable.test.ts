import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResizable } from './useResizable';
import { useUIStore } from '../stores/uiStore';

describe('useResizable', () => {
  beforeEach(() => {
    useUIStore.setState({
      editorWidth: 50,
      isResizing: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial editor width and isResizing state', () => {
    const { result } = renderHook(() => useResizable());
    expect(result.current.editorWidth).toBe(50);
    expect(result.current.isResizing).toBe(false);
  });

  it('should set isResizing to true on startResizing', () => {
    const { result } = renderHook(() => useResizable());
    
    act(() => { result.current.startResizing(); });
    expect(result.current.isResizing).toBe(true);
  });

  it('should set isResizing to false on stopResizing', () => {
    const { result } = renderHook(() => useResizable());
    
    act(() => { result.current.startResizing(); });
    act(() => { result.current.stopResizing(); });
    expect(result.current.isResizing).toBe(false);
  });

  it('should stop resizing on window mouseup', () => {
    const { result } = renderHook(() => useResizable());

    act(() => { result.current.startResizing(); });
    expect(result.current.isResizing).toBe(true);

    act(() => { window.dispatchEvent(new MouseEvent('mouseup')); });
    expect(result.current.isResizing).toBe(false);
  });

  it('should resize on mousemove when resizing', () => {
    // Create a mock container
    const container = document.createElement('div');
    container.className = 'main-layout';
    document.body.appendChild(container);
    
    // Mock getBoundingClientRect
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 1000,
      top: 0,
      height: 600,
      right: 1000,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const { result } = renderHook(() => useResizable());
    
    act(() => { result.current.startResizing(); });
    
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 600 }));
    });

    // 600 / 1000 * 100 = 60%
    expect(result.current.editorWidth).toBe(60);

    document.body.removeChild(container);
  });

  it('should not resize below minWidth', () => {
    const container = document.createElement('div');
    container.className = 'main-layout';
    document.body.appendChild(container);
    
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 0, width: 1000, top: 0, height: 600,
      right: 1000, bottom: 600, x: 0, y: 0, toJSON: () => {},
    });

    const { result } = renderHook(() => useResizable({ minWidth: 20 }));
    
    act(() => { result.current.startResizing(); });
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 })); // 10%
    });

    // Should stay at 50 (initial) since 10% < 20% min
    expect(result.current.editorWidth).toBe(50);

    document.body.removeChild(container);
  });

  it('should not resize above maxWidth', () => {
    const container = document.createElement('div');
    container.className = 'main-layout';
    document.body.appendChild(container);
    
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 0, width: 1000, top: 0, height: 600,
      right: 1000, bottom: 600, x: 0, y: 0, toJSON: () => {},
    });

    const { result } = renderHook(() => useResizable({ maxWidth: 80 }));
    
    act(() => { result.current.startResizing(); });
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 900 })); // 90%
    });

    // Should stay at 50 since 90% > 80% max
    expect(result.current.editorWidth).toBe(50);

    document.body.removeChild(container);
  });

  it('should not resize when not in resizing mode', () => {
    const container = document.createElement('div');
    container.className = 'main-layout';
    document.body.appendChild(container);
    
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 0, width: 1000, top: 0, height: 600,
      right: 1000, bottom: 600, x: 0, y: 0, toJSON: () => {},
    });

    renderHook(() => useResizable());
    
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 700 }));
    });

    // Should stay at 50 since not resizing
    expect(useUIStore.getState().editorWidth).toBe(50);

    document.body.removeChild(container);
  });

  it('should clean up event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useResizable());
    
    unmount();
    
    const calls = removeSpy.mock.calls.map(c => c[0]);
    expect(calls).toContain('mousemove');
    expect(calls).toContain('mouseup');
  });

  it('should not crash when container is not found during resize', () => {
    // No .main-layout in DOM
    const { result } = renderHook(() => useResizable());
    
    act(() => { result.current.startResizing(); });
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 600 }));
    });

    // Should stay at initial width — no container found
    expect(result.current.editorWidth).toBe(50);
  });
});
