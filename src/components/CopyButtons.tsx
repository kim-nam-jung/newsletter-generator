import React from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from './Toast';

interface CopyButtonsProps {
  html: string;
}

export const CopyButtons: React.FC<CopyButtonsProps> = ({ html }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      showToast('HTML Output copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
      showToast('Failed to copy HTML.', 'error');
    }
  };

  return (
    <button 
      className="btn-secondary" 
      onClick={handleCopy}
      title="Copy HTML Source"
    >
      {copied ? (
        <><Check size={16} /> Copied</>
      ) : (
        <><Copy size={16} /> Copy HTML</>
      )}
    </button>
  );
};
