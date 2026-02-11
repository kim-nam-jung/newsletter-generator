import { useState, useEffect } from 'react';
import './App.css';
import { Preview } from './components/Preview';

import { BlockList } from './components/Editor/BlockList';
import type { Block } from './types';
import { Mail, Settings, Download, FolderOpen, Trash2 } from 'lucide-react';
import { useToast } from './components/Toast';
import { SettingsModal } from './components/SettingsModal';

function App() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [exportPath, setExportPath] = useState('');

  // Resize State
  const [editorWidth, setEditorWidth] = useState(50); // Percentage
  const [isResizing, setIsResizing] = useState(false);

  // Save/Load State
  const [newsletterId, setNewsletterId] = useState<string | null>(null);
  const [title, setTitle] = useState('Untitled Newsletter');
  const [savedNewsletters, setSavedNewsletters] = useState<any[]>([]);

  // Load Settings on Mount
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.exportPath) setExportPath(data.exportPath);
      })
      .catch(err => console.error('Failed to load settings', err));
  }, []);

  // Resize Handlers
  const startResizing = (_mouseDownEvent: React.MouseEvent) => {
      setIsResizing(true);
  };

  const stopResizing = () => {
      setIsResizing(false);
  };

  const resize = (mouseMoveEvent: MouseEvent) => {
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
  };

  useEffect(() => {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      return () => {
          window.removeEventListener('mousemove', resize);
          window.removeEventListener('mouseup', stopResizing);
      };
  }, [isResizing]);

  // Load newsletters on mount & Restore state
  useEffect(() => {
      fetchNewsletters();
      
      const savedDraft = sessionStorage.getItem('newsletter_draft');
      if (savedDraft) {
          try {
              const { id, title: savedTitle, blocks: savedBlocks } = JSON.parse(savedDraft);
              if (savedBlocks && savedBlocks.length > 0) {
                  setBlocks(savedBlocks);
                  setNewsletterId(id || null);
                  setTitle(savedTitle || 'Untitled Newsletter');
              }
          } catch (e) {
              console.error('Failed to restore draft', e);
          }
      }
  }, []);

  // Persist state to localStorage whenever it changes (Debounced)
  useEffect(() => {
    const saveToLocalStorage = setTimeout(() => {
      if (blocks.length > 0 || title !== 'Untitled Newsletter') {
        const newsletter = {
          id: newsletterId || Date.now().toString(),
          title,
          blocks,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        sessionStorage.setItem('newsletter_draft', JSON.stringify(newsletter));
      }
    }, 1000);

    return () => clearTimeout(saveToLocalStorage);
  }, [blocks, title, newsletterId]);

  const fetchNewsletters = async () => {
      try {
          const res = await fetch('/api/newsletters');
          if (res.ok) {
              const data = await res.json();
              setSavedNewsletters(data);
          }
      } catch (error) {
          console.error('Failed to load list', error);
      }
  };

  const handleSave = async () => {
    let saveTitle = title;
    
    if (!newsletterId && title === 'Untitled Newsletter') {
        const firstTextBlock = blocks.find(b => b.type === 'text' && b.content);
        if (firstTextBlock && firstTextBlock.content) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = firstTextBlock.content;
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
        // showToast('Newsletter saved successfully!', 'success');
        fetchNewsletters();
    } catch (error) {
        console.error(error);
        console.error('Failed to save newsletter');
        // showToast('Failed to save newsletter', 'error');
    }
  };

  const loadNewsletter = async (id: string) => {
      try {
          const res = await fetch(`/api/newsletters/${id}`);
          if (res.ok) {
              const data = await res.json();
              setBlocks(data.blocks || []);
              setNewsletterId(data.id);
              setTitle(data.title);
              // showToast('Newsletter loaded!', 'success'); // Disabled per user request
          }
      } catch (error) {
          console.error('Failed to load newsletter');
          // showToast('Failed to load newsletter', 'error');
      }
  };

  const handleNewNewsletter = () => {
      if (window.confirm('Start a new newsletter? Unsaved changes will be lost.')) {
          setBlocks([]);
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
                alert('Failed to delete newsletter');
            }
        } catch (error) {
            console.error('Failed to delete', error);
            alert('Failed to delete newsletter');
        }
    }
  };



  const generateHtml = (blockList: Block[] = blocks) => {
    const rows = blockList.map(block => {
      if (block.type === 'image') {
        // 단일 링크 (전체 이미지 클릭)
        const linkStart = block.link ? `<a href="${block.link}" target="_blank" style="text-decoration: none; display: block;">` : '';
        const linkEnd = block.link ? '</a>' : '';

        // PDF에서 추출된 오버레이 링크들
        // 서버에서 1600px 기준으로 좌표가 계산되어 있고, display는 800px이므로 0.5 스케일
        const displayScale = 0.5;
        const overlayLinks = (block.links || []).map(link => `
          <a href="${link.url}" target="_blank" style="
            position: absolute;
            left: ${link.x * displayScale}px;
            top: ${link.y * displayScale}px;
            width: ${link.width * displayScale}px;
            height: ${link.height * displayScale}px;
            z-index: 10;
            cursor: pointer;
          " title="${link.url}"></a>
        `).join('');

        // 오버레이 링크가 있으면 position: relative 컨테이너 필요
        if (overlayLinks) {
          return `
            <tr>
              <td align="center" style="padding: 0;">
                <div style="position: relative; display: inline-block; width: 100%; max-width: 800px;">
                  <img src="${block.src}" alt="${block.alt || ''}" style="display: block; width: 100%; max-width: 800px; height: auto; border: 0;" />
                  ${overlayLinks}
                </div>
              </td>
            </tr>
          `;
        }

        return `
          <tr>
            <td align="center" style="padding: 0;">
              ${linkStart}<img src="${block.src}" alt="${block.alt || ''}" style="display: block; width: 100%; max-width: 800px; height: auto; border: 0;" />${linkEnd}
            </td>
          </tr>
        `;
      } else if (block.type === 'text') {
        return `
          <tr>
            <td style="padding: 20px; font-family: sans-serif; font-size: 16px; line-height: 1.5; color: #333;">
              ${block.content}
            </td>
          </tr>
        `;
      }
      return '';
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 800px; background-color: #ffffff; margin: 0 auto;">
    ${rows}
  </table>
</body>
</html>
    `;
  };

  const html = generateHtml();

  const saveSettings = async (path: string) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exportPath: path })
      });
      setExportPath(path);
      // showToast('Settings saved', 'success');
    } catch (err) {
      console.error('Failed to save settings');
      // showToast('Failed to save settings', 'error');
    }
  };

  const handleExportHtml = async () => {
    const filename = `${title.replace(/[^a-z0-9가-힣]/gi, '_') || 'newsletter'}.html`;

    // Convert images to Base64 for standalone HTML
    const blocksWithBase64 = await Promise.all(
      blocks.map(async (block) => {
        if (block.type === 'image' && block.src.startsWith('/uploads/')) {
          try {
            const res = await fetch(`/api/image-base64?path=${encodeURIComponent(block.src)}`);
            if (res.ok) {
              const { dataUri } = await res.json();
              return { ...block, src: dataUri };
            }
          } catch (e) {
            console.error('Failed to convert image to base64', e);
          }
        }
        return block;
      })
    );

    const exportHtml = generateHtml(blocksWithBase64);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      {/* Sidebar */}
      <aside className="app-sidebar">
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <Mail color="#2563eb" size={32} />
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Newsletter Editor</h2>
                  <small style={{ color: '#666', display: 'block', marginTop: '2px' }}>{title}</small>
                </div>
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
            <BlockList blocks={blocks} setBlocks={setBlocks} />
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
