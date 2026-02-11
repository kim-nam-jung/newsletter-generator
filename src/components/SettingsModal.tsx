import React, { useState, useEffect } from 'react';
import { X, FolderOpen } from 'lucide-react';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onSave: (path: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentPath, onSave }) => {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPath(currentPath);
  }, [currentPath, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(path);
    onClose();
  };

  const handleBrowse = async () => {
    try {
      const res = await fetch('/api/pick-folder');
      const data = await res.json();
      if (data.path) {
        setPath(data.path);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (error) {
      console.error('Failed to open picker', error);
    }
  };

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h3>Settings</h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>
        
        <div className="settings-body">
          <div className="form-group">
            <label>Default Export Path</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="input-with-icon" style={{ flex: 1 }}>
                <FolderOpen size={18} className="input-icon" />
                <input 
                  type="text" 
                  value={path} 
                  onChange={(e) => setPath(e.target.value)} 
                  placeholder="e.g. C:/Users/Documents/Newsletters"
                />
              </div>
              <button onClick={handleBrowse} className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                📁 Find
              </button>
            </div>
            <p className="help-text">
              Server-side path. If empty, you'll be prompted to save manually.
            </p>
          </div>
        </div>

        <div className="settings-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary">Save Settings</button>
        </div>
      </div>
    </div>
  );
};
