import React, { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, File as FileIcon } from 'lucide-react';
import './FileUploader.css';

interface FileUploaderProps {
  onUpload: (file: File, sliceHeight: number) => void;
  isProcessing: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUpload, isProcessing }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simulate progress when processing starts
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 500);
    } else {
      setProgress(100);
      setTimeout(() => setProgress(0), 1000);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    onUpload(selectedFile, 0); // 0 means no slicing
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="uploader-container">
      <div 
        className={`drop-zone ${dragActive ? 'active' : ''} ${isProcessing ? 'processing' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isProcessing && inputRef.current?.click()}
      >
        <input 
          ref={inputRef} 
          type="file" 
          className="file-input" 
          onChange={handleChange} 
          accept="image/*,.pdf" 
          disabled={isProcessing}
        />
        
        {isProcessing ? (
          <div className="processing-state">
            <div className="spinner"></div>
            <p>Processing... {progress}%</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        ) : file ? (
          <div className="file-info success">
             <CheckCircle className="icon-success" size={40} />
             <div>
               <p className="file-name">Processed: {file.name}</p>
               <p className="sub-text">Drop another file to append</p>
             </div>
          </div>
        ) : (
          <div className="upload-prompt">
            <Upload className="icon-upload" size={40} />
            <p className="main-text">Drag & Drop PDF/Image</p>
            <p className="sub-text">Auto-convert to image block (Max 50MB)</p>
          </div>
        )}
      </div>
    </div>
  );
};
