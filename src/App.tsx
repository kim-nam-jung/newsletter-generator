import { useEffect, useCallback } from 'react';
import './App.css';
import 'pdfjs-dist/web/pdf_viewer.css';
import { Preview } from './components/Preview';

import { BlockList } from './components/Editor/BlockList';
import { Mail, Settings, Download, FolderOpen, Trash2, Menu } from 'lucide-react';
import { useToast } from './components/Toast';
import { SettingsModal } from './components/SettingsModal';

import { useEditorStore } from './stores/editorStore';
import { useUIStore } from './stores/uiStore';
import { useNewsletterStore } from './stores/newsletterStore';
import { useDebounce } from './utils/useDebounce';
import { generateHtml } from './utils/htmlGenerator';

function App() {
  // Store Hooks
  const { blocks, setBlocks, undo, redo, reset: resetEditor } = useEditorStore();
  const { 
    activeTab, setActiveTab, 
    showSettings, setShowSettings, 
    isSidebarOpen, setIsSidebarOpen,
    editorWidth, setEditorWidth,
    isResizing, setIsResizing 
  } = useUIStore();
  const { 
    newsletterId, setNewsletterId,
    title, setTitle,
    savedNewsletters, setSavedNewsletters,
    exportPath, setExportPath 
  } = useNewsletterStore();

  const { showToast } = useToast();
  
  // Note: history handling is now in editorStore


  // Load Settings on Mount
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.exportPath) setExportPath(data.exportPath);
      })
      .catch(err => console.error('Failed to load settings', err));
  }, [setExportPath]);

  // Resize Handlers
  const startResizing = () => {
      setIsResizing(true);
  };

  const stopResizing = useCallback(() => {
      setIsResizing(false);
  }, [setIsResizing]);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
          const mainLayout = document.querySelector('.main-layout');
          if (mainLayout) {
              const { left, width } = mainLayout.getBoundingClientRect();
              const newEditorWidth = ((mouseMoveEvent.clientX - left) / width) * 100;
              if (newEditorWidth > 20 && newEditorWidth < 80) {
                  setEditorWidth(newEditorWidth);
              }
          }
      }
  }, [isResizing, setEditorWidth]);

  useEffect(() => {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      return () => {
          window.removeEventListener('mousemove', resize);
          window.removeEventListener('mouseup', stopResizing);
      };
  }, [resize, stopResizing]);

  // Load newsletters on mount & Restore state
  useEffect(() => {
      fetchNewsletters();

      const savedDraft = sessionStorage.getItem('newsletter_draft');
      if (savedDraft) {
          try {
              const { id, title: savedTitle, blocks: savedBlocks } = JSON.parse(savedDraft);
              if (savedBlocks && savedBlocks.length > 0) {
                  // 히스토리 초기화 후 블록 설정
                  resetEditor();
                  setBlocks(savedBlocks);
                  setNewsletterId(id || null);
                  setTitle(savedTitle || 'Untitled Newsletter');
              }
          } catch (e) {
              console.error('Failed to restore draft', e);
          }
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 1회만 실행

  // Persist state to localStorage whenever it changes (Debounced)
  // Persist state to localStorage (Debounced)
  const debouncedBlocks = useDebounce(blocks, 1000);
  const debouncedTitle = useDebounce(title, 1000);

  useEffect(() => {
    if (debouncedBlocks.length > 0 || debouncedTitle !== 'Untitled Newsletter') {
      const newsletter = {
        id: newsletterId || Date.now().toString(),
        title: debouncedTitle,
        blocks: debouncedBlocks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sessionStorage.setItem('newsletter_draft', JSON.stringify(newsletter));
    }
  }, [debouncedBlocks, debouncedTitle, newsletterId]);

  const fetchNewsletters = useCallback(async () => {
      try {
          const res = await fetch('/api/newsletters');
          if (res.ok) {
              const data = await res.json();
              setSavedNewsletters(data);
          }
      } catch {
          console.error('Failed to load list');
      }
  }, [setSavedNewsletters]);


  const handleSave = useCallback(async () => {
    let saveTitle = title;
    
    if (!newsletterId && title === 'Untitled Newsletter') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const firstTextBlock = blocks.find(b => b.type === 'text' && (b as any).content);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (firstTextBlock && (firstTextBlock as any).content) {
            const tempDiv = document.createElement('div');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tempDiv.innerHTML = (firstTextBlock as any).content;
            const plainText = tempDiv.textContent || '';
            const firstSentence = plainText.split(/[.!?]/)[0].trim().substring(0, 30);
            
            if (firstSentence) {
                saveTitle = firstSentence;
            }
        }

        let uniqueTitle = saveTitle;
        let counter = 1;
        while (savedNewsletters.some(n => n.title === uniqueTitle)) {
            uniqueTitle = `${saveTitle} (${counter})`;
            counter++;
        }
        saveTitle = uniqueTitle;
    }

    if (!newsletterId) {
        const input = window.prompt('Enter newsletter title:', saveTitle);
        if (input === null) return;
        saveTitle = input || saveTitle;
        setTitle(saveTitle);
    }

    try {
        const response = await fetch('/api/newsletters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: newsletterId,
                title: saveTitle,
                blocks
            })
        });
        
        if (!response.ok) throw new Error('Failed to save');
        
        const data = await response.json();
        setNewsletterId(data.id);
        showToast('Newsletter saved successfully!', 'success');
        fetchNewsletters();
    } catch (error) {
        console.error(error);
        console.error('Failed to save newsletter');
        showToast('Failed to save newsletter', 'error');
    }
  }, [blocks, title, newsletterId, savedNewsletters, showToast, fetchNewsletters, setNewsletterId, setTitle]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 기본 브라우저 동작 유지
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.ql-editor'); // Quill 에디터 내부

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'z' && !isInputField) {
          // 입력 필드가 아닐 때만 전역 undo
          e.preventDefault();
          undo();
        } else if (e.key === 'y' && !isInputField) {
          // 입력 필드가 아닐 때만 전역 redo
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, undo, redo]);

  const loadNewsletter = async (id: string) => {
      try {
          const res = await fetch(`/api/newsletters/${id}`);
          if (res.ok) {
              const data = await res.json();
              setBlocks(data.blocks || []);
              // Reset History via reload
              // setHistory([data.blocks || []]); // Handled by store logic or ignored
              
              setNewsletterId(data.id);
              setTitle(data.title);
              // showToast('Newsletter loaded!', 'success'); // Disabled per user request
          }
      } catch {
          console.error('Failed to load newsletter');
          showToast('Failed to load newsletter', 'error');
      }
  };

  const handleNewNewsletter = () => {
      if (window.confirm('Start a new newsletter? Unsaved changes will be lost.')) {
          resetEditor();
          setNewsletterId(null);
          setTitle('Untitled Newsletter');
          setActiveTab('editor');
          sessionStorage.removeItem('newsletter_draft');
      }
  };

  const handleDeleteNewsletter = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation(); // Prevent loading the newsletter when clicking delete
    
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
        try {
            const res = await fetch(`/api/newsletters/${id}`, { method: 'DELETE' });
            if (res.ok) {
                // If deleting the currently loaded one, reset editor
                if (newsletterId === id) {
                    handleNewNewsletter();
                }
                fetchNewsletters();
            } else {
                showToast('Failed to delete newsletter', 'error');
            }
        } catch (error) {
            console.error('Failed to delete', error);
            showToast('Failed to delete newsletter', 'error');
        }
    }
  };



  // const html = generateHtml(); -> No longer needed as local var, used in Preview/Export directly if needed
  // However, Preview component needs `html`.
  const html = generateHtml(blocks, title);

  const saveSettings = async (path: string) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exportPath: path })
      });
      setExportPath(path);
      // showToast('Settings saved', 'success');
    } catch {
      console.error('Failed to save settings');
      // showToast('Failed to save settings', 'error');
    }
  };

  const handleExportHtml = async () => {
    const filename = `${title.replace(/[^a-z0-9가-힣]/gi, '_') || 'newsletter'}.html`;

    // Convert images to Base64 for standalone HTML
    const blocksWithBase64 = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blocks.map(async (block: any) => {
        if ((block.type === 'image' || block.type === 'pdf') && block.src.startsWith('/uploads/')) {
          try {
            const res = await fetch(`/api/image-base64?path=${encodeURIComponent(block.src)}`);
            if (res.ok) {
              const { dataUri } = await res.json();
              if (block.type === 'pdf') {
                  // For PDF, ensure the data URI indicates pdf mimetype if api returned generic
                  const pdfDataUri = dataUri.replace('image/pdf', 'application/pdf'); // Just in case
                  return { ...block, src: pdfDataUri };
              }
              return { ...block, src: dataUri };
            }
          } catch (e) {
            console.error('Failed to convert file to base64', e);
          }
        }
        return block;
      })
    );

    const exportHtml = generateHtml(blocksWithBase64, title);

    // Case 1: Default Export Path is Set (Server-side auto-save)
    if (exportPath) {
      try {
        const res = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: exportHtml,
            path: exportPath,
            filename
          })
        });

        if (res.ok) {
          showToast(`Exported to ${exportPath}\\${filename}`, 'success');
        } else {
          const err = await res.json();
          throw new Error(err.error);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(e);
        console.error(`Auto-export failed: ${errorMessage}`);
        showToast(`Auto-export failed: ${errorMessage}`, 'error');
      }
      return;
    }

    // Case 2: No Default Path (Client-side Save As Dialog)
    try {
      // Try Native File System Access API
      if ('showSaveFilePicker' in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'HTML File',
            accept: { 'text/html': ['.html'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(exportHtml);
        await writable.close();
        showToast('Export successful!', 'success');
      } 
      // Fallback: Classic Download
      else {
        const blob = new Blob([exportHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Export successful!', 'success');
      }
    } catch (err: unknown) {
      // Ignore 'AbortError' (Cancel button)
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error(err);
        console.error('Export canceled or failed', err);
        showToast('Export canceled or failed', 'error');
      }
    }
  };

  const handleOpenFolder = async () => {
    if (!exportPath) {
      // showToast('No export path configured', 'error');
      setShowSettings(true);
      return;
    }
    
    try {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: exportPath })
      });
    } catch (error) {
      console.error(error);
      console.error('Failed to open folder', error);
      // showToast('Failed to open folder', 'error');
    }
  };



  return (
    <div className="app-container">
      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className={`app-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
           <button className="new-btn" onClick={handleNewNewsletter}>
             <span>+</span> New Newsletter
           </button>
        </div>
        <div className="sidebar-list">
           <h3>Recent</h3>
           {savedNewsletters.length === 0 && <p className="empty-list">No saved items.</p>}
           <ul>
             {savedNewsletters.map(n => (
                 <li
                   key={n.id}
                   className={n.id === newsletterId ? 'active' : ''}
                   onClick={() => loadNewsletter(n.id)}
                 >
                    <span className="item-title">{n.title}</span>
                    <button
                       className="delete-item-btn"
                       onClick={(e) => handleDeleteNewsletter(e, n.id, n.title)}
                       title="Delete"
                    >
                       <Trash2 size={16} />
                    </button>
                 </li>
             ))}
           </ul>
        </div>
      </aside>

      <div className="main-layout">
        <header className="app-header">
          <div className="header-brand">
            {/* Mobile Menu Button */}
            <button
              className="icon-btn"
              style={{ display: 'none', marginRight: '8px' }} // Hidden on desktop via CSS media query ideally, but inline style request
              id="mobile-menu-btn"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <Mail className="brand-icon" />
            <h2>Newsletter Editor</h2>
            {newsletterId && (
              <span style={{
                fontSize: '0.8rem',
                color: '#6b7280',
                background: '#f3f4f6',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                Editing
              </span>
            )}
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={handleOpenFolder} title={exportPath ? `Open Folder: ${exportPath}` : 'Open Export Folder'}>
              <FolderOpen size={20} />
            </button>
            <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
              <Settings size={20} />
            </button>
            <button className="btn-secondary" onClick={handleExportHtml} title="Export HTML">
              <Download size={16} /> Export
            </button>
            <button className="btn-primary" onClick={handleSave}>
              <span>💾</span> Save
            </button>
          </div>
        </header>

        <div className="mobile-tabs">
          <button 
            className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            Editor
          </button>
          <button 
            className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
        </div>
        
        <main className="app-content" onMouseUp={stopResizing}>
          <aside 
            className={`editor-panel ${activeTab === 'editor' ? 'active' : ''}`}
            style={{ width: `${editorWidth}%`, flex: 'none' }}
          >
            <h3>Editor</h3>
            <BlockList />
          </aside>

          {/* Resizer Handle */}
          <div 
             className="resizer"
             onMouseDown={startResizing}
          ></div>
          
          <section 
            className={`preview-panel ${activeTab === 'preview' ? 'active' : ''}`}
            style={{ flex: 1 }}
          >
            {blocks.length > 0 ? (
              <Preview html={html} />
            ) : (
              <div className="empty-state">
                <Mail size={48} opacity={0.2} />
                <p>Add content blocks to see preview</p>
              </div>
            )}
          </section>
        </main>
      </div>

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        currentPath={exportPath}
        onSave={saveSettings}
      />
    </div>
  );
}

export default App;
