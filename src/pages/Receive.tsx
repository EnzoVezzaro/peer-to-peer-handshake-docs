
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import ConnectionStatus, { ConnectionState } from '../components/ConnectionStatus';
import TransferProgress from '../components/TransferProgress';
import FilePreview from '../components/FilePreview';
import { toast } from 'sonner';
import { initiatePeerConnection } from '../lib/peerConnection';

const Receive = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [peerName, setPeerName] = useState<string>('');
  const [incomingFile, setIncomingFile] = useState<File | null>(null);
  const [showFilePreview, setShowFilePreview] = useState<boolean>(false);
  const [transferProgress, setTransferProgress] = useState<number>(0);
  const [transferStats, setTransferStats] = useState<{
    speed: number;
    remaining: number;
    transferred: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (!roomId) {
      toast.error('Invalid sharing link');
      navigate('/');
      return;
    }

    console.log('Connecting to room:', roomId);
    
    // Initialize peer connection as the receiver
    const peerConnection = initiatePeerConnection(
      (state) => setConnectionState(state as ConnectionState),
      (data) => console.log('Received data:', data),
      (name) => {
        setPeerName(name);
        toast.success(`Connected to ${name}! Waiting for file...`);
      },
      (fileInfo) => {
        setIncomingFile(fileInfo);
        setShowFilePreview(true);
      }
    );

    // Connect to the sender
    peerConnection.connect();

    // Cleanup function
    return () => {
      peerConnection.disconnect();
    };
  }, [roomId, navigate]);

  // Handle file transfer acceptance
  const handleAcceptTransfer = () => {
    if (!incomingFile) return;
    
    setShowFilePreview(false);
    setConnectionState('transferring');
    
    // Simulate file transfer with progress updates
    let progress = 0;
    const totalSize = incomingFile.size;
    let transferred = 0;
    const startTime = Date.now();
    
    const transferInterval = setInterval(() => {
      // Simulate transfer of chunks
      const chunkSize = Math.min(512 * 1024, totalSize - transferred); // 512KB chunks
      transferred += chunkSize;
      
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const speed = transferred / elapsedSeconds;
      progress = (transferred / totalSize) * 100;
      const remaining = (totalSize - transferred) / speed;
      
      setTransferProgress(progress);
      setTransferStats({
        speed,
        remaining,
        transferred,
        total: totalSize
      });
      
      if (transferred >= totalSize) {
        clearInterval(transferInterval);
        setTimeout(() => {
          setConnectionState('completed');
          toast.success('File transfer completed successfully!');
        }, 500);
      }
    }, 200);
  };

  // Handle file transfer decline
  const handleDeclineTransfer = () => {
    setShowFilePreview(false);
    setConnectionState('connected');
    toast.info('File transfer declined');
  };

  // Reset and go back home
  const handleReset = () => {
    navigate('/');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center gap-6">
        <div className="text-center max-w-2xl mb-8 animate-slide-in">
          <h1 className="text-4xl font-medium tracking-tight mb-3">
            Receive File
          </h1>
          <p className="text-lg text-muted-foreground">
            You've been invited to receive a file directly from another user.
            No downloads, no uploads - just peer-to-peer file sharing.
          </p>
        </div>
        
        <div className="w-full space-y-6">
          {/* Show connection status */}
          <ConnectionStatus 
            state={connectionState} 
            peerName={peerName}
          />
          
          {/* Show file preview for confirming transfer */}
          {showFilePreview && incomingFile && (
            <FilePreview 
              file={incomingFile}
              onAccept={handleAcceptTransfer}
              onDecline={handleDeclineTransfer}
            />
          )}
          
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
          {connectionState === 'completed' && incomingFile && (
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
                  You received "{incomingFile.name}" successfully.
                </p>
                <button 
                  onClick={handleReset}
                  className="btn-primary mx-auto"
                >
                  Return Home
                </button>
              </div>
            </div>
          )}
        </div>
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

export default Receive;
