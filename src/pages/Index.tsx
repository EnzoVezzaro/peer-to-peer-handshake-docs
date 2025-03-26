import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import FileUpload from '../components/FileUpload';
import ShareLink from '../components/ShareLink';
import ConnectionStatus, { ConnectionState } from '../components/ConnectionStatus';
import TransferProgress from '../components/TransferProgress';
import FilePreview from '../components/FilePreview';
// import LinkInput from '../components/LinkInput'; // Removed - Likely for receiver page
import { createSharingLink /*, simulateFileTransfer*/ } from '../lib/fileTransfer'; // Commented out simulateFileTransfer
import { generateRoomId, initiatePeerConnection } from '../lib/peerConnection';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button'; // Added Button
import { Textarea } from '@/components/ui/textarea'; // Added Textarea
import { Label } from '@/components/ui/label'; // Added Label

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sharingLink, setSharingLink] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [transferProgress, setTransferProgress] = useState<number>(0);
  const [peerName, setPeerName] = useState<string>('');
  const [showFilePreview, setShowFilePreview] = useState<boolean>(false); // Keep for potential receiver logic later
  const [transferStats, setTransferStats] = useState<{ // Keep for actual transfer later
    speed: number;
    remaining: number;
    transferred: number;
    total: number;
  } | null>(null);
  const [peerConnected, setPeerConnected] = useState<boolean>(false);
  const [signalToSend, setSignalToSend] = useState<string>(''); // Renamed from sdpOffer
  const [receivedSignal, setReceivedSignal] = useState<string>(''); // State for incoming signal
  const [peerManager, setPeerManager] = useState<{ pc: RTCPeerConnection, handleSignal: (signal: string) => void, sendData: (data: string | ArrayBuffer) => void } | null>(null); // State for peer connection manager

  // Handle file selection (Initiator)
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    const roomId = generateRoomId();
    const link = createSharingLink(roomId);
    setSharingLink(link); // Keep sharing link generation

    // Initialize peer connection using the new function
    const manager = initiatePeerConnection(
      (state) => { // onConnectionStateChange
        console.log("Connection state changed:", state);
        setConnectionState(state as ConnectionState);
        if (state === 'connected') {
          setPeerConnected(true); // Assume connected when state is 'connected'
        } else {
          setPeerConnected(false);
        }
      },
      (signal) => { // sendSignal (captures offer/candidates)
        console.log("Signal to send:", signal);
        // Append signals if needed, or just set the latest (simple approach for now)
        setSignalToSend(prev => prev ? `${prev}\n${signal}` : signal);
      },
      (data) => { // onDataReceived (handles data channel messages)
        console.log('Data received via data channel:', data);
        // Handle incoming data (e.g., chat, file transfer ACKs)
        if (typeof data === 'string') {
          toast.info(`Received message: ${data}`);
        } else {
          toast.info(`Received binary data: ${data.byteLength} bytes`);
        }
      },
      (name) => { // onPeerJoined
        setPeerName(name);
        // Note: Connection state is handled by onConnectionStateChange now
        toast.success(`${name} connected!`);
      },
      (fileInfo) => { // onFileRequest (placeholder)
        console.log("File request received (sender shouldn't get this usually):", fileInfo);
      },
      setFile, // setFile (placeholder)
      true,    // isInitiator
      roomId
    );

    if (manager) {
      setPeerManager(manager);
      setConnectionState('connecting'); // Initial state after setup
    } else {
      console.error("Failed to initialize peer connection.");
      toast.error("Failed to initialize WebRTC connection.");
      setConnectionState('error');
    }

    // // Simulate file transfer after connection - COMMENTED OUT FOR NOW
    // setTimeout(() => {
    //   if (file && peerManager && connectionState === 'connected') {
    //     console.log("Starting simulated file transfer...");
    //     setConnectionState('transferring'); // Set state before starting
    //     // TODO: Replace simulateFileTransfer with actual WebRTC data sending using peerManager.sendData
    //     simulateFileTransfer(
    //       file,
    //       (progress, transferred, total, speed, remaining) => {
    //         setTransferProgress(progress);
    //         setTransferStats({ speed, remaining, transferred, total });
    //       },
    //       () => {
    //         setConnectionState('completed');
    //         toast.success('File transfer completed successfully!');
    //       },
    //       (file) => {} // Placeholder for onFileReceived
    //     );
    //   } else if (!peerManager || connectionState !== 'connected') {
    //       console.warn("Cannot start transfer: Not connected.");
    //       // Optionally reset state or show error
    //   }
    // }, 5000); // Increased delay to allow connection setup
  };

  // Reset the state
  const handleReset = () => {
    setFile(null);
    setSharingLink('');
    setConnectionState('disconnected');
    setTransferProgress(0);
    setTransferStats(null);
    setPeerName('');
    setShowFilePreview(false);
    setPeerConnected(false);
    setSignalToSend(''); // Reset signal state
    setReceivedSignal(''); // Reset signal state
    // Close existing peer connection if any
    if (peerManager?.pc) {
      peerManager.pc.close();
    }
    setPeerManager(null); // Reset peer manager
  };

  // Handle pasting/submitting the received signal (answer/candidates)
  const handleReceivedSignalSubmit = () => {
    if (peerManager && receivedSignal.trim()) {
      console.log("Handling received signal:", receivedSignal);
      // Split potentially multiple JSON signals pasted together
      receivedSignal.trim().split('\n').forEach(signalStr => {
        if (signalStr.trim()) {
          peerManager.handleSignal(signalStr.trim());
        }
      });
      // Optionally clear the textarea after handling
      // setReceivedSignal('');
    } else {
      toast.warning("No peer connection active or no signal pasted.");
    }
  };

  // Function to send a test message
  const sendTestMessage = () => {
    if (peerManager && connectionState === 'connected') {
      const message = `Hello from sender! ${new Date().toLocaleTimeString()}`;
      peerManager.sendData(message);
      toast.success("Test message sent!");
    } else {
      toast.warning("Cannot send message: Not connected.");
    }
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
          <>
            <FileUpload onFileSelect={handleFileSelect} setFile={setFile} />
            {/* Removed LinkInput - Receiver functionality */}
          </>
        )}
        
        {file && sharingLink && (
          <div className="w-full space-y-6">
            {/* 1. Show link and signal to send */}
            {connectionState !== 'completed' && (
              <ShareLink link={sharingLink} signalData={signalToSend} /> // Pass signalToSend
            )}

            {/* 2. Input for receiving signal from peer */}
            {peerManager && connectionState !== 'connected' && connectionState !== 'completed' && connectionState !== 'error' && (
              <div className="w-full max-w-3xl mx-auto space-y-2">
                 <Label htmlFor="received-signal">Paste Peer's Signal (Answer/Candidates):</Label>
                 <Textarea
                   id="received-signal"
                   placeholder="Paste the signal code from the receiver here..."
                   value={receivedSignal}
                   onChange={(e) => setReceivedSignal(e.target.value)}
                   rows={4}
                   className="bg-background/80 backdrop-blur-sm"
                 />
                 <Button onClick={handleReceivedSignalSubmit} disabled={!receivedSignal.trim()}>Connect to Peer</Button>
              </div>
            )}

            {/* 3. Show connection status */}
            <ConnectionStatus 
              state={connectionState} 
              peerName={peerConnected ? peerName : ''}
              isPeerConnected={peerConnected}
            />
            
            {/* 4. Show file preview (kept logic, but sender usually doesn't need this) */}
            {showFilePreview && file && (
              <FilePreview
                file={file}
                onAccept={() => {}}
                onDecline={() => {}}
              />
            )}

            {/* 5. Show transfer progress (logic kept for future actual transfer) */}
            {connectionState === 'transferring' && transferStats && (
              <TransferProgress
                progress={transferProgress}
                transferSpeed={transferStats.speed}
                timeRemaining={transferStats.remaining}
                transferredBytes={transferStats.transferred}
                totalBytes={transferStats.total}
              />
            )}

            {/* 6. Show buttons for interaction when connected */}
            {connectionState === 'connected' && peerConnected && (
               <div className="w-full max-w-3xl mx-auto text-center mt-4 space-x-4">
                 <Button onClick={sendTestMessage}>Send Test Message</Button>
                 {/* Add button to initiate actual file transfer later */}
                 <Button
                   onClick={() => {
                     // TODO: Implement actual file transfer initiation
                     toast.info("Actual file transfer not implemented yet.");
                     // setConnectionState('transferring'); // Example state change
                   }}
                   className="btn-primary"
                 >
                   Start File Transfer (WIP)
                 </Button>
               </div>
             )}

            {/* 7. Show completion message */}
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
                    Your file "{file?.name}" was successfully transferred.
                  </p>
                  <button 
                    onClick={handleReset}
                    className="btn-primary mx-auto">
                    Share Another File
                  </button> {/* Fixed closing tag */}
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
