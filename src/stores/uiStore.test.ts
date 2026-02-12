import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      activeTab: 'editor',
      showSettings: false,
      isSidebarOpen: false,
      editorWidth: 50,
      isResizing: false,
    });
  });

  it('should have correct initial state', () => {
    const state = useUIStore.getState();
    expect(state.activeTab).toBe('editor');
    expect(state.showSettings).toBe(false);
    expect(state.isSidebarOpen).toBe(false);
    expect(state.editorWidth).toBe(50);
    expect(state.isResizing).toBe(false);
  });

  it('should toggle activeTab', () => {
    useUIStore.getState().setActiveTab('preview');
    expect(useUIStore.getState().activeTab).toBe('preview');
    
    useUIStore.getState().setActiveTab('editor');
    expect(useUIStore.getState().activeTab).toBe('editor');
  });

  it('should toggle showSettings', () => {
    useUIStore.getState().setShowSettings(true);
    expect(useUIStore.getState().showSettings).toBe(true);
  });

  it('should toggle isSidebarOpen', () => {
    useUIStore.getState().setIsSidebarOpen(true);
    expect(useUIStore.getState().isSidebarOpen).toBe(true);
  });

  it('should set editorWidth', () => {
    useUIStore.getState().setEditorWidth(75);
    expect(useUIStore.getState().editorWidth).toBe(75);
  });

  it('should toggle isResizing', () => {
    useUIStore.getState().setIsResizing(true);
    expect(useUIStore.getState().isResizing).toBe(true);
    
    useUIStore.getState().setIsResizing(false);
    expect(useUIStore.getState().isResizing).toBe(false);
  });
});
