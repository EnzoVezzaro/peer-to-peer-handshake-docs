
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import FileUpload from '../components/FileUpload';
import ShareLink from '../components/ShareLink';
import ConnectionStatus, { ConnectionState } from '../components/ConnectionStatus';
import TransferProgress from '../components/TransferProgress';
import { createSharingLink, simulateFileTransfer } from '../lib/fileTransfer';
import { generateRoomId } from '../lib/peerConnection';
import { toast } from 'sonner';

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sharingLink, setSharingLink] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [transferProgress, setTransferProgress] = useState<number>(0);
  const [transferStats, setTransferStats] = useState<{
    speed: number;
    remaining: number;
    transferred: number;
    total: number;
  } | null>(null);

  // Handle file selection
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    const roomId = generateRoomId();
    const link = createSharingLink(roomId);
    setSharingLink(link);
    
    // In a real implementation, we would initiate WebRTC signaling here
    // For the demo, we'll simulate a connection after a delay
    setTimeout(() => {
      setConnectionState('connecting');
      
      setTimeout(() => {
        setConnectionState('connected');
        toast.success('Peer connected! Starting file transfer...');
        
        // Start simulated transfer after a brief delay
        setTimeout(() => {
          setConnectionState('transferring');
          
          simulateFileTransfer(
            selectedFile,
            (progress, transferred, total, speed, remaining) => {
              setTransferProgress(progress);
              setTransferStats({
                speed,
                remaining,
                transferred,
                total
              });
            },
            () => {
              setConnectionState('completed');
              toast.success('File transfer completed successfully!');
            }
          );
        }, 1000);
      }, 2000);
    }, 3000);
  };

  // Reset the state
  const handleReset = () => {
    setFile(null);
    setSharingLink('');
    setConnectionState('disconnected');
    setTransferProgress(0);
    setTransferStats(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center gap-6">
        <div className="text-center max-w-2xl mb-8 animate-slide-in">
          <h1 className="text-4xl font-medium tracking-tight mb-3">
            Share files directly. No cloud needed.
          </h1>
          <p className="text-lg text-muted-foreground">
            HandShare lets you send files to anyone, anywhere, without uploading them to the internet.
            Secure, private, and incredibly simple.
          </p>
        </div>
        
        {!file && (
          <FileUpload onFileSelect={handleFileSelect} />
        )}
        
        {file && sharingLink && (
          <div className="w-full space-y-6">
            {/* Show share link if we're not done transferring */}
            {connectionState !== 'completed' && (
              <ShareLink link={sharingLink} />
            )}
            
            {/* Show connection status */}
            <ConnectionStatus 
              state={connectionState} 
              peerName="Recipient"
            />
            
            {/* Show transfer progress if transferring */}
            {connectionState === 'transferring' && transferStats && (
              <TransferProgress 
                progress={transferProgress} 
                transferSpeed={transferStats.speed}
                timeRemaining={transferStats.remaining}
                transferredBytes={transferStats.transferred}
                totalBytes={transferStats.total}
              />
            )}
            
            {/* Show completion message if transfer is done */}
            {connectionState === 'completed' && (
              <div className="w-full max-w-3xl mx-auto animate-fade-in">
                <div className="glassmorphism p-6 rounded-xl text-center">
                  <div className="w-16 h-16 mx-auto flex items-center justify-center bg-green-100 rounded-full mb-4">
                    <svg 
                      width="32" 
                      height="32" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="text-green-600"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium mb-2">Transfer Complete!</h3>
                  <p className="text-muted-foreground mb-4">
                    Your file "{file.name}" was successfully transferred.
                  </p>
                  <button 
                    onClick={handleReset}
                    className="btn-primary mx-auto"
                  >
                    Share Another File
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      
      <footer className="py-6 border-t border-border">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} HandShare. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
