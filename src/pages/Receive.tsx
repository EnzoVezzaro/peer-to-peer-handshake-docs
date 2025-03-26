import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import ConnectionStatus, { ConnectionState } from '../components/ConnectionStatus';
import TransferProgress from '../components/TransferProgress';
import FilePreview from '../components/FilePreview';
import { toast } from 'sonner';
import { initiatePeerConnection } from '../lib/peerConnection';
import { Peer } from 'peerjs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const Receive = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
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
  const [peerConnected, setPeerConnected] = useState<boolean>(false);
  const [peerManager, setPeerManager] = useState<{ peer: Peer, connectToPeer: (receiverPeerId: string) => void, sendData: (file: File | null, data: string | ArrayBuffer) => void, sendFileInfo: (file: File) => void } | null>(null);
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
    setConnectionState('connecting');

    const initiatorPeerId = searchParams.get('signal');

    const manager = initiatePeerConnection(
      (state) => {
        console.log("Connection state changed:", state);
        setConnectionState(state as ConnectionState);
        if (state === 'connected') {
          setPeerConnected(true);
          setConnectionState('waiting');
        } else {
          setPeerConnected(false);
          if (state === 'failed' || state === 'closed' || state === 'disconnected') {
            toast.error(`Connection ${state}. Please try again.`);
          }
        }
      },
      (id) => {
        // Receiver doesn't send a signal, so this is a no-op
      },
      (data) => {
        console.log('Data received via data channel:', data);
        if (typeof data === 'string') {
          try {
            const message = JSON.parse(data);
            if (message.type === 'file-info') {
              console.log('Received file info:', message.payload);
              let mockFile: File;
              if (message.payload.size) {
                try {
                  mockFile = new File([], message.payload.name, { type: message.payload.type, lastModified: Date.now() });
                  Object.defineProperty(mockFile, 'size', { value: message.payload.size });
                  setTotalBytes(message.payload.size);
                } catch (e) {
                  console.error("Error creating mock file:", e);
                  mockFile = new File([], message.payload.name, { type: message.payload.type, lastModified: Date.now() });
                }
              } else {
                mockFile = new File([], message.payload.name, { type: message.payload.type, lastModified: Date.now() });
              }
              setIncomingFile(mockFile);
              setShowFilePreview(true);
              setConnectionState('confirming');
            } else {
              toast.info(`Received message: ${data}`);
            }
          } catch (e) {
            toast.info(`Received text: ${data}`);
          }
        } else {
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
      (name) => {
        setPeerName(name);
        toast.success(`${name} connected!`);
      },
      false,
      roomId,
      initiatorPeerId,
      undefined
    );

    if (manager) {
      setPeerManager(manager);
    } else {
      console.error("Failed to initialize peer connection.");
      toast.error("Failed to initialize WebRTC connection.");
      setConnectionState('error');
    }

    return () => {
      console.log("Cleaning up peer connection for receiver.");
      setPeerManager(null);
      if (receivedFileUrl) {
        URL.revokeObjectURL(receivedFileUrl);
      }
    };
  }, [roomId, navigate, receivedFileUrl, searchParams]);

  const handleAcceptTransfer = () => {
    if (!incomingFile) return;

    setShowFilePreview(false);
    setConnectionState('transferring');

    const blob = new Blob(receivedFileChunks);
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = incomingFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.info(`Starting download for ${incomingFile.name}...`);
    setConnectionState('completed');
    const message = `transfer-completed`;
    peerManager.sendData(null, message);
  };

  const handleDeclineTransfer = () => {
    setShowFilePreview(false);
    setConnectionState('connected');
    const message = `transfer-declined`;
    peerManager.sendData(null, message);
    toast.info('File transfer declined');
  };

  const handleReset = () => {
    navigate('/');
  };

  const sendTestMessage = () => {
    if (peerManager && connectionState === 'connected') {
      const message = JSON.stringify({ type: 'test-message', payload: `Hello from receiver! ${new Date().toLocaleTimeString()}` });
      peerManager.sendData(undefined, message);
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

          {showFilePreview && incomingFile && connectionState === 'confirming' && (
            <FilePreview
              file={incomingFile}
              onAccept={handleAcceptTransfer}
              onDecline={handleDeclineTransfer}
            />
          )}

          {/* Show interaction buttons when connected */}
          {connectionState === 'connected' && peerConnected && (
            <div className="w-full max-w-3xl mx-auto text-center mt-4 space-x-4">
              <Button onClick={sendTestMessage}>Send Test Message</Button>
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
                  You received "{incomingFile?.name}" successfully.
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
