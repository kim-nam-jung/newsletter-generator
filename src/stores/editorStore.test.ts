import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';
import type { Block } from '../types';

const makeBlock = (id: string): Block => ({ id, type: 'text', content: `Block ${id}` });

describe('editorStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useEditorStore.setState({
      blocks: [],
      history: [[]],
      historyIndex: 0,
    });
  });

  it('should start with empty blocks', () => {
    const { blocks } = useEditorStore.getState();
    expect(blocks).toEqual([]);
  });

  describe('setBlocks', () => {
    it('should set blocks from array', () => {
      const { setBlocks } = useEditorStore.getState();
      const newBlocks = [makeBlock('1'), makeBlock('2')];
      setBlocks(newBlocks);

      const { blocks } = useEditorStore.getState();
      expect(blocks).toEqual(newBlocks);
    });

    it('should set blocks from function', () => {
      const { setBlocks } = useEditorStore.getState();
      setBlocks([makeBlock('1')]);
      setBlocks(prev => [...prev, makeBlock('2')]);

      const { blocks } = useEditorStore.getState();
      expect(blocks).toHaveLength(2);
    });

    it('should push to history when blocks change', () => {
      const { setBlocks } = useEditorStore.getState();
      setBlocks([makeBlock('1')]);
      setBlocks([makeBlock('1'), makeBlock('2')]);

      const { history, historyIndex } = useEditorStore.getState();
      expect(history).toHaveLength(3); // initial [] + 2 sets
      expect(historyIndex).toBe(2);
    });

    it('should not push to history if blocks are identical', () => {
      const block = makeBlock('1');
      const { setBlocks } = useEditorStore.getState();
      setBlocks([block]);
      setBlocks([{ ...block }]); // same content

      const { history } = useEditorStore.getState();
      expect(history).toHaveLength(2); // initial [] + first set only
    });
  });

  describe('undo/redo', () => {
    it('should undo to previous state', () => {
      const { setBlocks } = useEditorStore.getState();
      setBlocks([makeBlock('1')]);
      setBlocks([makeBlock('1'), makeBlock('2')]);

      useEditorStore.getState().undo();
      const { blocks } = useEditorStore.getState();
      expect(blocks).toHaveLength(1);
    });

    it('should redo after undo', () => {
      const { setBlocks } = useEditorStore.getState();
      setBlocks([makeBlock('1')]);
      setBlocks([makeBlock('1'), makeBlock('2')]);

      useEditorStore.getState().undo();
      useEditorStore.getState().redo();
      const { blocks } = useEditorStore.getState();
      expect(blocks).toHaveLength(2);
    });

    it('should not undo past initial state', () => {
      useEditorStore.getState().undo();
      const { historyIndex } = useEditorStore.getState();
      expect(historyIndex).toBe(0);
    });

    it('should not redo past latest state', () => {
      const { setBlocks } = useEditorStore.getState();
      setBlocks([makeBlock('1')]);
      
      useEditorStore.getState().redo();
      const { historyIndex } = useEditorStore.getState();
      expect(historyIndex).toBe(1);
    });

    it('should truncate future history after undo + new change', () => {
      const { setBlocks } = useEditorStore.getState();
      setBlocks([makeBlock('1')]);
      setBlocks([makeBlock('1'), makeBlock('2')]);
      setBlocks([makeBlock('1'), makeBlock('2'), makeBlock('3')]);

      useEditorStore.getState().undo();
      useEditorStore.getState().undo();
      // Now at state with 1 block, setting new blocks should truncate
      setBlocks([makeBlock('X')]);

      const { history } = useEditorStore.getState();
      // initial [] + [1] + [X] = 3 entries (2,3 branches discarded)
      expect(history).toHaveLength(3);
    });
  });

  describe('convenience methods', () => {
    it('should add a block at index', () => {
      const { setBlocks, addBlock } = useEditorStore.getState();
      setBlocks([makeBlock('1'), makeBlock('3')]);
      addBlock(makeBlock('2'), 1);

      const { blocks } = useEditorStore.getState();
      expect(blocks[0].id).toBe('1');
      expect(blocks[1].id).toBe('2');
      expect(blocks[2].id).toBe('3');
    });

    it('should delete a block by id', () => {
      const { setBlocks, deleteBlock } = useEditorStore.getState();
      setBlocks([makeBlock('1'), makeBlock('2')]);
      deleteBlock('1');

      const { blocks } = useEditorStore.getState();
      expect(blocks).toHaveLength(1);
      expect(blocks[0].id).toBe('2');
    });

    it('should update a block by id', () => {
      const { setBlocks, updateBlock } = useEditorStore.getState();
      setBlocks([makeBlock('1')]);
      updateBlock('1', { content: 'Updated' } as Partial<Block>);

      const { blocks } = useEditorStore.getState();
      expect((blocks[0] as { content: string }).content).toBe('Updated');
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const { setBlocks, reset } = useEditorStore.getState();
      setBlocks([makeBlock('1'), makeBlock('2')]);
      reset();

      const { blocks, history, historyIndex } = useEditorStore.getState();
      expect(blocks).toEqual([]);
      expect(history).toEqual([[]]);
      expect(historyIndex).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should not push history when updateBlock targets non-existent id', () => {
      const { setBlocks, updateBlock } = useEditorStore.getState();
      setBlocks([makeBlock('1')]);

      const { history: historyBefore } = useEditorStore.getState();
      // Update a non-existent block — map returns identical array
      updateBlock('nonexistent', { content: 'x' } as Partial<Block>);

      const { history: historyAfter } = useEditorStore.getState();
      // History should not grow because blocks are deep-equal
      expect(historyAfter.length).toBe(historyBefore.length);
    });

    it('should not push history when setBlocks function returns identical blocks', () => {
      const { setBlocks } = useEditorStore.getState();
      setBlocks([makeBlock('1')]);
      const { history: historyBefore } = useEditorStore.getState();

      // Return the same blocks via function
      setBlocks(prev => [...prev.map(b => ({ ...b }))]);

      const { history: historyAfter } = useEditorStore.getState();
      expect(historyAfter.length).toBe(historyBefore.length);
    });
  });
});
