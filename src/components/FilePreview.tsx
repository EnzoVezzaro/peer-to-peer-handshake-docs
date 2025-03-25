
import React from 'react';
import { Button } from './ui/button';

interface FilePreviewProps {
  file: File;
  onAccept: () => void;
  onDecline: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onAccept, onDecline }) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const getFileIcon = () => {
    const type = file.type;
    
    if (type.startsWith('image/')) {
      return (
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-blue-500"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      );
    } else if (type.startsWith('video/')) {
      return (
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-red-500"
        >
          <path d="m22 8-6 4 6 4V8Z" />
          <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
        </svg>
      );
    } else if (type.startsWith('audio/')) {
      return (
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-green-500"
        >
          <path d="M18 8h1a4 4 0 1 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" x2="6" y1="1" y2="8" />
          <line x1="10" x2="10" y1="1" y2="8" />
          <line x1="14" x2="14" y1="1" y2="8" />
        </svg>
      );
    } else if (type.includes('pdf')) {
      return (
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-red-600"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    } else {
      return (
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-gray-500"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      <div className="glassmorphism p-6 rounded-xl">
        <h3 className="text-xl font-medium mb-4">File Transfer Request</h3>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-lg">
            {getFileIcon()}
          </div>
          
          <div className="flex-1">
            <h4 className="text-lg font-medium truncate">{file.name}</h4>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(file.size)} • {file.type || 'Unknown type'}
            </p>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-6">
          Do you want to accept this file transfer? Files are transferred directly between devices and are not stored on any server.
        </p>
        
        <div className="flex gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={onDecline}
          >
            Decline
          </Button>
          <Button 
            onClick={onAccept}
          >
            Accept Transfer
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
