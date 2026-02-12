import React, { useState } from 'react';
import { Smartphone, Monitor } from 'lucide-react';
import './Preview.css';

interface PreviewProps {
  html: string;
}

export const Preview: React.FC<PreviewProps> = React.memo(({ html }) => {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className="preview-container">
      <div className="preview-header">
        <h3>Preview</h3>
        <div className="view-toggles">
          <button 
            className={viewMode === 'desktop' ? 'active' : ''} 
            onClick={() => setViewMode('desktop')}
            title="Desktop View"
          >
            <Monitor size={20} />
          </button>
          <button 
            className={viewMode === 'mobile' ? 'active' : ''} 
            onClick={() => setViewMode('mobile')}
            title="Mobile View"
          >
            <Smartphone size={20} />
          </button>
        </div>
      </div>
      
      <div className={`preview-frame-wrapper ${viewMode}`}>
        <iframe 
          title="Newsletter Preview"
          srcDoc={html} 
          className="preview-frame"
        />
      </div>
    </div>
  );
});
