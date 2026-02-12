import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  const onSave = vi.fn();
  const onUndo = vi.fn();
  const onRedo = vi.fn();
  let container: HTMLDivElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let hookResult: RenderHookResult<void, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    // IMPORTANT: unmount to remove window event listener
    if (hookResult) hookResult.unmount();
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  const mountHook = () => {
    hookResult = renderHook(() => useKeyboardShortcuts({ onSave, onUndo, onRedo }));
  };

  const fireKeyDown = (key: string, opts: Record<string, unknown> = {}, target?: HTMLElement) => {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: true,
      bubbles: true,
      ...opts,
    } as KeyboardEventInit);
    (target || container).dispatchEvent(event);
  };

  it('should call onSave on Ctrl+S', () => {
    mountHook();
    fireKeyDown('s');
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('should call onUndo on Ctrl+Z', () => {
    mountHook();
    fireKeyDown('z');
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it('should call onRedo on Ctrl+Y', () => {
    mountHook();
    fireKeyDown('y');
    expect(onRedo).toHaveBeenCalledOnce();
  });

  it('should work with metaKey (macOS)', () => {
    mountHook();
    fireKeyDown('s', { ctrlKey: false, metaKey: true });
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('should ignore non-shortcut keys', () => {
    mountHook();
    fireKeyDown('a');
    expect(onSave).not.toHaveBeenCalled();
    expect(onUndo).not.toHaveBeenCalled();
    expect(onRedo).not.toHaveBeenCalled();
  });

  it('should ignore keys without ctrl/meta', () => {
    mountHook();
    fireKeyDown('s', { ctrlKey: false, metaKey: false });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('should not call onUndo/onRedo when target is an INPUT', () => {
    mountHook();
    const input = document.createElement('input');
    container.appendChild(input);
    fireKeyDown('z', {}, input);
    expect(onUndo).not.toHaveBeenCalled();
  });

  it('should still call onSave from INPUT fields', () => {
    mountHook();
    const input = document.createElement('input');
    container.appendChild(input);
    fireKeyDown('s', {}, input);
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('should not call onUndo/onRedo when target is a TEXTAREA', () => {
    mountHook();
    const textarea = document.createElement('textarea');
    container.appendChild(textarea);
    fireKeyDown('y', {}, textarea);
    expect(onRedo).not.toHaveBeenCalled();
  });

  it('should clean up event listener on unmount', () => {
    mountHook();
    hookResult.unmount();

    fireKeyDown('s');
    expect(onSave).not.toHaveBeenCalled();

    // Prevent double-unmount in afterEach
    hookResult = null as unknown as typeof hookResult;
  });
});
