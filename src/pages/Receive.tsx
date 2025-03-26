import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { useParams, useNavigate } from 'react-router-dom'; // Removed useSearchParams
import Header from '../components/Header';
import ConnectionStatus, { ConnectionState } from '../components/ConnectionStatus';
import TransferProgress from '../components/TransferProgress';
import FilePreview from '../components/FilePreview';
import { toast } from 'sonner';
import { initiatePeerConnection } from '../lib/peerConnection';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'; // Added Textarea
import { Label } from '@/components/ui/label'; // Added Label

const Receive = () => {
  const { roomId } = useParams<{ roomId: string }>(); // Typed useParams
  // const [searchParams, setSearchParams] = useSearchParams(); // Removed, not using URL params for signal
  const navigate = useNavigate();

  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [peerName, setPeerName] = useState<string>('');
  const [incomingFile, setIncomingFile] = useState<File | null>(null);
  const [showFilePreview, setShowFilePreview] = useState<boolean>(false);
  const [transferProgress, setTransferProgress] = useState<number>(0);
  const [transferStats, setTransferStats] = useState<{ // Keep for actual transfer
    speed: number;
    remaining: number;
    transferred: number;
    total: number;
  } | null>(null);
  const [peerConnected, setPeerConnected] = useState<boolean>(false);
  const [signalToSend, setSignalToSend] = useState<string>(''); // Renamed from sdpAnswer
  // const [sdpOffer, setSdpOffer] = useState<string>(searchParams.get("sdpOffer")); // Removed
  // const [currentConnection, setCurrentConnection] = useState<string>(null); // Removed
  const [receivedSignal, setReceivedSignal] = useState<string>(''); // State for incoming signal
  const [peerManager, setPeerManager] = useState<{ pc: RTCPeerConnection, handleSignal: (signal: string) => void, sendData: (data: string | ArrayBuffer) => void } | null>(null); // State for peer connection manager
  const [isSignalCopied, setIsSignalCopied] = useState(false); // State for copy button
  const signalTextareaRef = useRef<HTMLTextAreaElement>(null); // Ref for signal textarea
  const [receivedFileChunks, setReceivedFileChunks] = useState<ArrayBuffer[]>([]);
  const [receivedFileBlob, setReceivedFileBlob] = useState<Blob | null>(null);
  const [receivedFileUrl, setReceivedFileUrl] = useState<string | null>(null);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [receivedBytes, setReceivedBytes] = useState<number>(0);

  useEffect(() => {
    if (!roomId) {
      toast.error('Invalid sharing link');
      navigate('/');
      return;
    }

    console.log('Initializing receiver for room:', roomId);
    setConnectionState('connecting'); // Initial state

    // Initialize peer connection as the receiver
    const manager = initiatePeerConnection(
      (state) => { // onConnectionStateChange
        console.log("Connection state changed:", state);
        setConnectionState(state as ConnectionState);
        if (state === 'connected') {
          setPeerConnected(true);
          // Don't automatically show file preview, wait for signal/message
          // setShowFilePreview(true);
          setConnectionState('waiting'); // Move to waiting after connected
        } else {
          setPeerConnected(false);
          if (state === 'failed' || state === 'closed' || state === 'disconnected') {
            toast.error(`Connection ${state}. Please try again.`);
          }
        }
      },
      (signal) => { // sendSignal (captures answer/candidates)
        console.log("Signal to send (Answer/Candidates):", signal);
        setSignalToSend(prev => prev ? `${prev}\n${signal}` : signal);
      },
      (data) => { // onDataReceived
        console.log('Data received via data channel:', data);
        // Handle incoming data (e.g., file info, chat)
        if (typeof data === 'string') {
          try {
            const message = JSON.parse(data);
            if (message.type === 'file-info') {
              // This assumes sender sends file info as JSON
              console.log('Received file info:', message.payload);
              // Create a mock File object for preview
              let mockFile: File;
              if (message.payload.size) {
                try {
                  mockFile = new File([], message.payload.name, { type: message.payload.type, lastModified: Date.now() });
                  Object.defineProperty(mockFile, 'size', { value: message.payload.size });
                  setTotalBytes(message.payload.size); // Store total file size
                } catch (e) {
                  console.error("Error creating mock file:", e);
                  mockFile = new File([], message.payload.name, { type: message.payload.type, lastModified: Date.now() });
                }
              } else {
                mockFile = new File([], message.payload.name, { type: message.payload.type, lastModified: Date.now() });
              }
              setIncomingFile(mockFile);
              setShowFilePreview(true);
              setConnectionState('confirming'); // State for showing preview
            } else {
              toast.info(`Received message: ${data}`);
            }
          } catch (e) {
            toast.info(`Received text: ${data}`); // Not JSON, treat as plain text
          }
        } else {
          // Handle binary data (ArrayBuffer) - likely file chunks
          console.log(`Received binary data: ${data.byteLength} bytes`);
          setReceivedFileChunks(prev => [...prev, data]);
          setReceivedBytes(prev => {
            const newReceivedBytes = prev + data.byteLength;
            console.log(`Received bytes: ${newReceivedBytes} / ${totalBytes}`);
            if (totalBytes > 0 && newReceivedBytes >= totalBytes) {
              console.log('File transfer complete!');
              setConnectionState('completed');
            }
            return newReceivedBytes;
          });
        }
      },
      (name) => { // onPeerJoined
        setPeerName(name);
        toast.success(`${name} connected!`);
      },
      (fileInfo) => { // onFileRequest (placeholder - receiver doesn't request)
        console.log("File request received (should not happen for receiver):", fileInfo);
      },
      () => { }, // setFile (placeholder - receiver gets file via data channel)
      false,    // isInitiator
      roomId
    );

    if (manager) {
      setPeerManager(manager);
    } else {
      console.error("Failed to initialize peer connection.");
      toast.error("Failed to initialize WebRTC connection.");
      setConnectionState('error');
    }

    // Cleanup function for when component unmounts or roomId changes
    return () => {
      console.log("Cleaning up peer connection for receiver.");
      manager?.pc?.close();
      setPeerManager(null);
      if (receivedFileUrl) {
        URL.revokeObjectURL(receivedFileUrl);
      }
    };

  }, [roomId, navigate, receivedFileUrl]); // Removed sdpOffer dependency

  // Handle file transfer acceptance
  const handleAcceptTransfer = () => {
    if (!incomingFile) return;

    setShowFilePreview(false);
    setConnectionState('transferring'); // Or 'receiving'

    // Create blob and URL immediately
    const blob = new Blob(receivedFileChunks);
    const url = URL.createObjectURL(blob);

    // Create a temporary link element and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = incomingFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url); // Clean up the URL

    toast.info(`Starting download for ${incomingFile.name}...`);
  };

  // Handle file transfer decline
  const handleDeclineTransfer = () => {
    setShowFilePreview(false);
    setConnectionState('connected');
    toast.info('File transfer declined');
  };

  // Reset the state
  const handleReset = () => {
    navigate('/'); // Go back home after reset
  };

  // Handle pasting/submitting the received signal (offer/candidates)
  const handleReceivedSignalSubmit = () => {
    if (peerManager && receivedSignal.trim()) {
      console.log("Handling received signal (Offer/Candidates):", receivedSignal);
      // Split potentially multiple JSON signals pasted together
      receivedSignal.trim().split('\n').forEach(signalStr => {
        if (signalStr.trim()) {
          peerManager.handleSignal(signalStr.trim());
        }
      });
      // Receiver should now generate an answer/candidates via sendSignal callback
    } else {
      toast.warning("Peer connection not ready or no signal pasted.");
    }
  };

  // Handler for copying the generated signal data (answer/candidates)
  const handleCopySignal = () => {
    if (signalTextareaRef.current) {
      navigator.clipboard.writeText(signalToSend).then(() => {
        setIsSignalCopied(true);
        toast.success('Signal data copied to clipboard!');
        setTimeout(() => setIsSignalCopied(false), 3000);
      }).catch(err => {
        toast.error('Failed to copy signal data.');
        console.error('Failed to copy signal data: ', err);
      });
    }
  };

  // Function to send a test message
  const sendTestMessage = () => {
    if (peerManager && connectionState === 'connected') {
      const message = `Hello from receiver! ${new Date().toLocaleTimeString()}`;
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
            peerName={peerConnected ? peerName : ''}
            isPeerConnected={peerConnected}
          />

          {/* Input for Initiator's Signal */}
          {peerManager && connectionState !== 'connected' && connectionState !== 'completed' && connectionState !== 'error' && (
            <div className="w-full max-w-3xl mx-auto space-y-2 glassmorphism p-6 rounded-xl">
              <Label htmlFor="received-signal">1. Paste Initiator's Signal (Offer/Candidates):</Label>
              <Textarea
                id="received-signal"
                placeholder="Paste the signal code from the sender here..."
                value={receivedSignal}
                onChange={(e) => setReceivedSignal(e.target.value)}
                rows={4}
                className="bg-background/80 backdrop-blur-sm font-mono text-xs"
              />
              <Button onClick={handleReceivedSignalSubmit} disabled={!receivedSignal.trim() || !!signalToSend}>
                Connect to Peer
              </Button>
              {connectionState === 'connecting' && !signalToSend && <p className="text-xs text-muted-foreground">Connecting...</p>}
            </div>
          )}

          {/* Display Receiver's Signal to Send Back */}
          {signalToSend && connectionState !== 'connected' && connectionState !== 'completed' && (
            <div className="w-full max-w-3xl mx-auto space-y-2 glassmorphism p-6 rounded-xl">
              <Label htmlFor="signal-to-send">2. Send Your Signal Back to Initiator:</Label>
              <Textarea
                ref={signalTextareaRef}
                id="signal-to-send"
                value={signalToSend}
                readOnly
                rows={4}
                className="bg-background/80 backdrop-blur-sm font-mono text-xs"
              />
              <Button
                onClick={handleCopySignal}
                className={`w-full sm:w-auto ${isSignalCopied ? 'bg-green-600 hover:bg-green-700' : ''}`}
                variant="secondary"
              >
                {isSignalCopied ? 'Copied!' : 'Copy Your Signal'}
              </Button>
              <p className="text-xs text-muted-foreground">Copy this signal (answer/candidates) and send it back to the initiator.</p>
            </div>
          )}

          {/* Show file preview for confirming transfer */}
          {showFilePreview && incomingFile && connectionState === 'confirming' && ( // Show only in confirming state
            <FilePreview
              file={incomingFile} // Use incomingFile
              onAccept={handleAcceptTransfer}
              onDecline={handleDeclineTransfer}
            />
          )}

          {/* Show interaction buttons when connected */}
          {connectionState === 'connected' && peerConnected && (
            <div className="w-full max-w-3xl mx-auto text-center mt-4 space-x-4">
              <Button onClick={sendTestMessage}>Send Test Message</Button>
              {/* Button to manually trigger download if needed, or just wait */}
            </div>
           )}

          {/* Show transfer progress if transferring */}
          {connectionState === 'completed' && transferStats && (
            <TransferProgress
              progress={transferProgress}
              transferSpeed={transferStats.speed}
              timeRemaining={transferStats.remaining}
              transferredBytes={transferStats.transferred}
              totalBytes={transferStats.total}
            />
          )}

          {/* Show completion message */}
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
                <Button onClick={handleReset} className="btn-primary mx-auto">
                  Return Home
                </Button>
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
