
import React from 'react';

interface TransferProgressProps {
  progress: number; // 0 to 100
  transferSpeed?: number; // bytes per second
  timeRemaining?: number; // seconds
  transferredBytes?: number;
  totalBytes?: number;
}

const TransferProgress: React.FC<TransferProgressProps> = ({ 
  progress, 
  transferSpeed,
  timeRemaining,
  transferredBytes,
  totalBytes
}) => {
  const formatSpeed = (bytesPerSecond?: number): string => {
    if (!bytesPerSecond) return 'Calculating...';
    
    if (bytesPerSecond < 1024) {
      return `${bytesPerSecond.toFixed(1)} B/s`;
    } else if (bytesPerSecond < 1024 * 1024) {
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    } else {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
    }
  };

  const formatTime = (seconds?: number): string => {
    if (!seconds) return 'Calculating...';
    
    if (seconds < 60) {
      return `${Math.ceil(seconds)} seconds remaining`;
    } else if (seconds < 3600) {
      return `${Math.ceil(seconds / 60)} minutes remaining`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.ceil((seconds % 3600) / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
    }
  };

  const formatSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      <div className="glassmorphism p-6 rounded-xl">
        <h3 className="text-lg font-medium mb-2">Transfer Progress</h3>
        
        <div className="w-full bg-secondary rounded-full h-2 mb-4 overflow-hidden">
          <div 
            className="bg-primary h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-3">
          <span>{progress.toFixed(1)}% Complete</span>
          {transferredBytes !== undefined && totalBytes !== undefined && (
            <span>{formatSize(transferredBytes)} / {formatSize(totalBytes)}</span>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            <span>{formatSpeed(transferSpeed)}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>{formatTime(timeRemaining)}</span>
          </div>
        </div>
        
        <button className="btn-secondary mt-4 text-xs">
          Cancel Transfer
        </button>
      </div>
    </div>
  );
};

export default TransferProgress;
