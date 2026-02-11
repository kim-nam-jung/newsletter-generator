import React, { useRef, useState } from 'react';
import type { Block, BlockType } from '../../types';
import { RichTextEditor } from './RichTextEditor';
import { Trash2, GripVertical, Plus, Image as ImageIcon, Type, Link as LinkIcon, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { FileUploader } from '../FileUploader';
import { uploadImage } from '../../services/api';
import { useToast } from '../../components/Toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './Editor.css';

interface BlockListProps {
  blocks: Block[];
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
}

export const BlockList: React.FC<BlockListProps> = ({ blocks, setBlocks }) => {
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const { showToast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addBlock = (type: BlockType, index: number) => {
    if (type === 'image') {
      const newBlock: Block = { id: uuidv4(), type: 'placeholder' };
      const newBlocks = [...blocks];
      newBlocks.splice(index, 0, newBlock);
      setBlocks(newBlocks);
      return;
    }

    const newBlock: Block = { id: uuidv4(), type: 'text', content: '' };
    const newBlocks = [...blocks];
    newBlocks.splice(index, 0, newBlock);
    setBlocks(newBlocks);
  };

  const handleInlineUpload = async (file: File, sliceHeight: number, blockId: string) => {
    setUploadingBlockId(blockId);
    try {
      const slices = await uploadImage(file, sliceHeight);
      const newBlocks: Block[] = slices.map(slice => ({
        id: uuidv4(),
        type: 'image',
        src: slice.imageUrl,
        alt: file.name,
        links: slice.links
      }));
      
      setBlocks(prev => {
        const index = prev.findIndex(b => b.id === blockId);
        if (index === -1) return prev;
        
        const copy = [...prev];
        // Remove the placeholder and insert new blocks
        copy.splice(index, 1, ...newBlocks);
        return copy;
      });
      
      showToast(`Successfully added ${slices.length} image slice(s)`, 'success');
    } catch (error: any) {
      console.error(error);
      alert(`Upload Error: ${error.message}`); // Force visibility
      showToast(error.message || 'Failed to upload image', 'error');
    } finally {
      setUploadingBlockId(null);
    }
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  return (
    <div className="block-list">

      <InsertZone onInsert={(type) => addBlock(type, 0)} visible={blocks.length === 0} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map(b => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.map((block, index) => (
            <React.Fragment key={block.id}>
              <SortableBlockItem
                block={block}
                updateBlock={updateBlock}
                deleteBlock={deleteBlock}
                uploading={uploadingBlockId === block.id}
                onUpload={(file, height) => handleInlineUpload(file, height, block.id)}
                index={index}
              />
              <InsertZone onInsert={(type) => addBlock(type, index + 1)} />
            </React.Fragment>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

interface SortableBlockItemProps {
  block: Block;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
  uploading?: boolean;
  onUpload?: (file: File, height: number) => void;
  index: number;
}

const SortableBlockItem: React.FC<SortableBlockItemProps> = ({ block, updateBlock, deleteBlock, uploading, onUpload, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 2 : 1,
  };

  const [linkInputVisible, setLinkInputVisible] = useState(false);

  return (
    <div ref={setNodeRef} style={style} className="block-item">
      <div className="block-controls-persistent">
        <span className="block-number">[{index + 1}]</span>
        <button className="drag-handle" {...attributes} {...listeners}>
          <GripVertical size={20} />
        </button>
      </div>
      
      <button className="delete-btn" onClick={() => deleteBlock(block.id)} title="Delete Block">
        <X size={18} />
      </button>

      {block.type === 'placeholder' && onUpload ? (
        <div className="placeholder-block">

             <FileUploader onUpload={onUpload} isProcessing={!!uploading} />
        </div>
      ) : block.type === 'text' ? (
        <RichTextEditor 
          content={block.content} 
          onChange={(val) => updateBlock(block.id, { content: val })} 
        />
      ) : (
        <div className="image-block-wrapper">
          <div className="image-block">
            <img src={block.src} alt="Newsletter Content" />
            {block.link && <div className="link-badge"><LinkIcon size={12} /> {block.link}</div>}
          </div>
          
          <div className="image-actions">
             <button 
               className={`link-btn ${linkInputVisible || block.link ? 'active' : ''}`}
               onClick={() => setLinkInputVisible(!linkInputVisible)}
               title="Add Link to Image"
             >
               <LinkIcon size={16} /> {block.link ? 'Edit Link' : 'Add Link'}
             </button>
          </div>

          {linkInputVisible && (
            <div className="link-input-popover">
              <input 
                type="text" 
                placeholder="https://example.com" 
                value={block.link || ''} 
                onChange={(e) => updateBlock(block.id, { link: e.target.value })}
              />
              <button onClick={() => setLinkInputVisible(false)}>Done</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface InsertZoneProps {
  onInsert: (type: BlockType) => void;
  visible?: boolean;
}

const InsertZone: React.FC<InsertZoneProps> = ({ onInsert, visible }) => {
  return (
    <div className={`insert-zone ${visible ? 'visible' : ''}`}>
      <div className="insert-line"></div>
      <div className="insert-buttons">
        <button className="insert-btn" onClick={() => onInsert('text')}>
          <Type size={14} /> Text
        </button>
        <button className="insert-btn" onClick={() => onInsert('image')}>
          <ImageIcon size={14} /> Image
        </button>
      </div>
    </div>
  );
};
