import { create } from 'zustand';
import type { Block } from '../types';
import equal from 'fast-deep-equal';

interface EditorState {
  blocks: Block[];
  history: Block[][];
  historyIndex: number;
  
  setBlocks: (newBlocksOrFn: Block[] | ((prev: Block[]) => Block[])) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  
  // Specific block operations (wrappers around setBlocks for convenience)
  updateBlock: (id: string, updates: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
  addBlock: (block: Block, index: number) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  blocks: [],
  history: [[]],
  historyIndex: 0,

  setBlocks: (newBlocksOrFn) => {
    set((state) => {
      const prevBlocks = state.blocks;
      const nextBlocks = typeof newBlocksOrFn === 'function' ? newBlocksOrFn(prevBlocks) : newBlocksOrFn;

      // Deep equality check for history (Performance Opt & Logic)
      if (!equal(prevBlocks, nextBlocks)) {
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(nextBlocks);
        return {
          blocks: nextBlocks,
          history: newHistory,
          historyIndex: newHistory.length - 1
        };
      }

      return { blocks: nextBlocks };
    });
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return {
          historyIndex: newIndex,
          blocks: state.history[newIndex]
        };
      }
      return {};
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return {
          historyIndex: newIndex,
          blocks: state.history[newIndex]
        };
      }
      return {};
    });
  },

  reset: () => {
    set({
      blocks: [],
      history: [[]],
      historyIndex: 0
    });
  },

  updateBlock: (id, updates) => {
    get().setBlocks(blocks => blocks.map(b => b.id === id ? { ...b, ...updates } as Block : b));
  },

  deleteBlock: (id) => {
    get().setBlocks(blocks => blocks.filter(b => b.id !== id));
  },

  addBlock: (block, index) => {
    get().setBlocks(blocks => {
      const newBlocks = [...blocks];
      newBlocks.splice(index, 0, block);
      return newBlocks;
    });
  }
}));
