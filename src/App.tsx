import { useEffect } from 'react';
import './App.css';
import 'pdfjs-dist/web/pdf_viewer.css';
import { Preview } from './components/Preview';

import { BlockList } from './components/Editor/BlockList';
import { Mail, Settings, Download, FolderOpen, Trash2, Menu } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';

import { useEditorStore } from './stores/editorStore';
import { useUIStore } from './stores/uiStore';
import { useNewsletterStore } from './stores/newsletterStore';
import { generateHtml } from './utils/htmlGenerator';

import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useResizable } from './hooks/useResizable';
import { useAutoSave } from './hooks/useAutoSave';
import { useExport } from './hooks/useExport';
import { useNewsletterManager } from './hooks/useNewsletterManager';

function App() {
  // Store Hooks
  const { blocks, undo, redo } = useEditorStore();
  const { 
    activeTab, setActiveTab, 
    showSettings, setShowSettings, 
    isSidebarOpen, setIsSidebarOpen,
  } = useUIStore();
  const { newsletterId, title } = useNewsletterStore();

  // Custom Hooks
  const { editorWidth, startResizing, stopResizing } = useResizable();
  const { clearDraft } = useAutoSave();
  const { exportPath, handleExportHtml, handleOpenFolder, saveSettings } = useExport();
  const {
    savedNewsletters,
    fetchNewsletters,
    handleSave,
    loadNewsletter,
    handleNewNewsletter,
    handleDeleteNewsletter,
  } = useNewsletterManager({ onDraftClear: clearDraft });

  useKeyboardShortcuts({ onSave: handleSave, onUndo: undo, onRedo: redo });

  // Fetch newsletters on mount
  // (useAutoSave handles draft restoration, useExport handles settings loading)
  useEffect(() => { fetchNewsletters(); }, [fetchNewsletters]);

  const html = generateHtml(blocks, title);

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
            <button
              className="icon-btn"
              style={{ display: 'none', marginRight: '8px' }}
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
