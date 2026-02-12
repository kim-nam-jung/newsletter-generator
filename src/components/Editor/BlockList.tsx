import React, { useState } from 'react';
import type { Block, BlockType, ImageBlock, HtmlBlock, PdfBlock } from '../../types';
import { RichTextEditor } from './RichTextEditor';
import { GripVertical, Image as ImageIcon, Type, Link as LinkIcon, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { FileUploader } from '../FileUploader';
import { uploadImage } from '../../services/api';
import PdfPageRenderer from './PdfPageRenderer';
import { useToast } from '../../components/Toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './Editor.css';

import { useEditorStore } from '../../stores/editorStore';

type BlockListProps = Record<string, never>;

export const BlockList: React.FC<BlockListProps> = () => {
  const { blocks, setBlocks, addBlock: addBlockToStore } = useEditorStore();
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
      addBlockToStore(newBlock, index);
      return;
    }

    const newBlock: Block = { id: uuidv4(), type: 'text', content: '' };
    addBlockToStore(newBlock, index);
  };

  const handleInlineUpload = async (file: File, sliceHeight: number, blockId: string) => {
    setUploadingBlockId(blockId);
    try {
      let newBlocks: Block[] = [];

      if (file.type === 'application/pdf') {
          // Client-side PDF processing
          const { processPdfFile } = await import('../../services/pdf-client-processor');
          const pages = await processPdfFile(file);
          
          newBlocks = pages.map(page => ({
              id: uuidv4(),
              type: 'pdf',
              src: page.src,
              content: page.content,
              links: page.links,
              width: page.width,
              height: page.height
          } as Block)); // Cast to Block (PdfBlock)
      } else {
          // Standard Image Upload
          const responseBlocks = await uploadImage(file, sliceHeight);
          newBlocks = responseBlocks.map(block => {
              if (block.type === 'image') {
                  return {
                      id: uuidv4(),
                      type: 'image',
                      src: block.src || '',
                      alt: file.name,
                      links: block.links || [] 
                  } as ImageBlock;
              } else {
                  return {
                      id: uuidv4(),
                      type: 'text',
                      content: block.content || ''
                  } as Block;
              }
          });
      }
      
      setBlocks(prev => {
        const index = prev.findIndex(b => b.id === blockId);
        if (index === -1) return prev;
        
        const copy = [...prev];
        // Remove the placeholder and insert new blocks
        copy.splice(index, 1, ...newBlocks);
        return copy;
      });
      
      showToast(`Successfully added ${newBlocks.length} block(s)`, 'success');
    } catch (error: unknown) {
      console.error(error);
      showToast(error instanceof Error ? error.message : 'Failed to upload file', 'error');
    } finally {
      setUploadingBlockId(null);
    }
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    useEditorStore.getState().updateBlock(id, updates);
  };

  const deleteBlock = (id: string) => {
    useEditorStore.getState().deleteBlock(id);
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

import equal from 'fast-deep-equal';

const SortableBlockItem: React.FC<SortableBlockItemProps> = React.memo(({ block, updateBlock, deleteBlock, uploading, onUpload, index }) => {
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

  const renderContent = () => {
    if (block.type === 'placeholder') {
      return (
        <div className="placeholder-block">
          {onUpload && <FileUploader onUpload={onUpload} isProcessing={!!uploading} />}
        </div>
      );
    }

    if (block.type === 'text') {
      return (
        <RichTextEditor 
          content={block.content} 
          onChange={(val) => updateBlock(block.id, { content: val })} 
        />
      );
    }
    
    if (block.type === 'html') {
        const htmlBlock = block as HtmlBlock;
        return (
            <div className="html-block-wrapper" style={{ width: '100%', overflow: 'auto' }}>
                <iframe
                    title={`PDF Page ${htmlBlock.pageIndex ?? ''}`}
                    srcDoc={htmlBlock.content}
                    style={{ width: '100%', border: 'none', minHeight: '600px', display: 'block' }}
                    sandbox="allow-same-origin allow-scripts allow-popups"
                    onLoad={(e) => {
                        const iframe = e.currentTarget;
                        // Adjust height to fit content
                        if (iframe.contentWindow) {
                            try {
                                const height = iframe.contentWindow.document.body.scrollHeight;
                                // Add a bit of buffer
                                iframe.style.height = `${height + 20}px`;
                            } catch (err) {
                                console.warn('Could not auto-resize iframe:', err);
                            }
                        }
                    }}
                />
            </div>
        );
    }

    if (block.type === 'pdf') {
        const pdfBlock = block as PdfBlock;
        return (
            <div className="pdf-block-wrapper">
                <PdfPageRenderer block={pdfBlock} />
            </div>
        );
    }

    // Image Block with Link Overlay
    const imgBlock = block as ImageBlock;
    
    return (
      <div className="image-block-wrapper">
        <div className="image-block" style={{ position: 'relative' }}>
          <img 
            src={imgBlock.src} 
            alt="Newsletter Content" 
            style={{ width: '100%', display: 'block' }} 
            onLoad={() => {
                // Optional: We might need to store natural dimensions to scale overlays precisely
                // if the API returns coordinates in PDF points (72dpi) or pixels.
                // Assuming standard PDF rendering.
            }}
          />
          
          {/* Render PDF Link Overlays */}
          {imgBlock.links && imgBlock.links.map((link, i) => (
             <a 
               key={i}
               href={link.url}
               target="_blank"
               rel="noopener noreferrer"
               style={{
                   position: 'absolute',
                   left: `${(link.x / (imgBlock.width || 600)) * 100}%`, // Fallback width
                   top: `${(link.y / (imgBlock.height || 800)) * 100}%`, // Fallback height
                   width: `${(link.width / (imgBlock.width || 600)) * 100}%`,
                   height: `${(link.height / (imgBlock.height || 800)) * 100}%`,
                   backgroundColor: 'rgba(0, 123, 255, 0.1)', // Slight blue tint for debugging/visibility
                   border: '1px solid rgba(0, 123, 255, 0.3)',
                   cursor: 'pointer',
                   display: 'block',
                   zIndex: 10
               }}
               title={link.url}
             />
          ))}

          {/* Manual Link Badge (Legacy) */}
          {imgBlock.link && <div className="link-badge"><LinkIcon size={12} /> {imgBlock.link}</div>}
        </div>
        
        <div className="image-actions">
           {/* Only show "Add Link" if no embedded links exist? Or allow adding a main link? */}
           <button 
             className={`link-btn ${linkInputVisible || imgBlock.link ? 'active' : ''}`}
             onClick={() => setLinkInputVisible(!linkInputVisible)}
             title="Add Link to Image"
           >
             <LinkIcon size={16} /> {imgBlock.link ? 'Edit Link' : 'Add Link'}
           </button>
        </div>

        {linkInputVisible && (
          <div className="link-input-popover">
            <input 
              type="text" 
              placeholder="https://example.com" 
              value={imgBlock.link || ''} 
              onChange={(e) => updateBlock(block.id, { link: e.target.value })}
            />
            <button onClick={() => setLinkInputVisible(false)}>Done</button>
          </div>
        )}
      </div>
    );
  };

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

      {renderContent()}
    </div>
  );
}, (prev, next) => {
  return (
    equal(prev.block, next.block) &&
    prev.index === next.index &&
    prev.uploading === next.uploading &&
    // Functions are stable from store/parent
    true 
  );
});

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
