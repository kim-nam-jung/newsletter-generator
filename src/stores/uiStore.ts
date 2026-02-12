import { create } from 'zustand';

interface UIState {
  activeTab: 'editor' | 'preview';
  setActiveTab: (tab: 'editor' | 'preview') => void;

  showSettings: boolean;
  setShowSettings: (show: boolean) => void;

  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;

  editorWidth: number;
  setEditorWidth: (width: number) => void;

  isResizing: boolean;
  setIsResizing: (isResizing: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'editor',
  setActiveTab: (activeTab) => set({ activeTab }),

  showSettings: false,
  setShowSettings: (showSettings) => set({ showSettings }),

  isSidebarOpen: false,
  setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

  editorWidth: 50,
  setEditorWidth: (editorWidth) => set({ editorWidth }),

  isResizing: false,
  setIsResizing: (isResizing) => set({ isResizing }),
}));
