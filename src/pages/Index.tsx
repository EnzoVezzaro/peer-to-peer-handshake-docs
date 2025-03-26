import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import FileUpload from '../components/FileUpload';
import ShareLink from '../components/ShareLink';
import ConnectionStatus, { ConnectionState } from '../components/ConnectionStatus';
import TransferProgress from '../components/TransferProgress';
import FilePreview from '../components/FilePreview';
import { createSharingLink } from '../lib/fileTransfer';
import { generateRoomId, initiatePeerConnection } from '../lib/peerConnection';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Peer, { DataConnection } from 'peerjs';

type DataMessage = string | ArrayBuffer;
type TransferStats = {
  speed: number;
  remaining: number;
  transferred: number;
  total: number;
};

type PeerManager = {
  peer: Peer;
  handleSignal: (signal: string) => void;
  sendData: (file: File, data: DataMessage, onTransferProgress?: (progress: number, transferred: number, total: number, speed: number, remaining: number) => void) => void;
  sendFileInfo: (file: File) => void;
    };

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sharingLink, setSharingLink] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [transferProgress, setTransferProgress] = useState<number>(0);
  const [peerName, setPeerName] = useState<string>('');
  const [showFilePreview, setShowFilePreview] = useState<boolean>(false);
  const [transferStats, setTransferStats] = useState<TransferStats | null>(null);
  const [peerConnected, setPeerConnected] = useState<boolean>(false);
  const [signalToSend, setSignalToSend] = useState<string>('');
  const [peerManager, setPeerManager] = useState<PeerManager | null>(null);
  const [peerResponse, setPeerResponse] = useState<string>('');

  // Handle file selection (Initiator)
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    const roomId = generateRoomId();

    const manager = initiatePeerConnection(
      (state: ConnectionState) => {
        console.log("Connection state changed:", state);
        setConnectionState(state);
        if (state === 'connected') {
          setPeerConnected(true);
        } else {
          setPeerConnected(false);
        }
      },
      (peerId) => {
        console.log("Peer ID generated:", peerId);
        // Optionally generate and set sharing link
        const link = createSharingLink(roomId);
        setSharingLink(link);
        setSignalToSend(peerId); // Assuming peerId contains the initial connection signal
      },
      async (data: DataMessage) => {
        console.log('Data received via data channel:', data);
        if (typeof data === 'string' && data !== `transfer-completed`) {
          toast.info(`Received message: ${data}`);
        } if (typeof data === 'string' && data === `transfer-completed`) {
          setPeerResponse(`transfer-completed`)
          toast.info(`User has Downloaded the File: ${data}`);
        } if (typeof data === 'string' && data === `transfer-declined`) { 
          setPeerResponse(`transfer-declined`)
          toast.info(`User has Declined the File: ${data}`);
        } else if (data instanceof ArrayBuffer) {
          toast.info(`Received binary data: ${data.byteLength} bytes`);
        }
        return;
      },
      async (name) => {
        setPeerName(name);
        toast.success(`${name} connected!`);
        return;
      },
      true,
      roomId,
      undefined,
      (progress, transferred, total, speed, remaining) => {
        console.log('tranfer: ', progress, transferred, total, speed, remaining);
        setTransferProgress(progress);
        setTransferStats({ speed, remaining, transferred, total });
      }
    );

    if (manager) {
      setPeerManager({
        peer: manager.peer,
        handleSignal: manager.handleSignal,
        sendData: manager.sendData,
        sendFileInfo: manager.sendFileInfo,
      });
      setConnectionState('connecting');
    } else {
      console.error("Failed to initialize peer connection.");
      toast.error("Failed to initialize WebRTC connection.");
      setConnectionState('error');
    }
  };

  // Reset the state
  const handleReset = () => {
    // Properly close existing peer connection
    if (peerManager?.peer instanceof Peer) {
      try {
        // Close all connections
        peerManager.peer.disconnect()
        peerManager.peer.destroy()
      } catch (error) {
        console.error("Error closing peer connection:", error);
      }
    }

    // Reset all state variables
    setFile(null);
    setSharingLink('');
    setConnectionState('disconnected');
    setTransferProgress(0);
    setTransferStats(null);
    setPeerName('');
    setShowFilePreview(false);
    setPeerConnected(false);
    setSignalToSend('');
    setPeerManager(null);
  };

  // Function to send a test message
  const sendTestMessage = async () => {
    if (peerManager && connectionState === 'connected') {
      const message = JSON.stringify({ type: 'test-message', payload: `Hello from sender! ${new Date().toLocaleTimeString()}` });
      try {
        await peerManager.sendData(undefined, message); 
        toast.success("Test message sent!");
      } catch (error) {
        console.error("Failed to send test message:", error);
        toast.error(`Failed to send test message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      toast.warning("Cannot send message: Not connected.");
    }
  };

  // Enhanced file transfer function
  const startFileTransfer = async () => {
    if (file && peerManager && connectionState === 'connected') {
      try {
        console.log("Starting file transfer...");
        setConnectionState('transferring');

        // Send file info first
        await peerManager.sendFileInfo(file);

        const chunkSize = 16384;
        let offset = 0;
        const startTime = Date.now();

        let totalTransferred = 0;
        while (offset < file.size) {
          const chunk = file.slice(offset, offset + chunkSize);
          const chunkData = await chunk.arrayBuffer();
          await peerManager.sendData(file, chunkData);
          offset += chunkSize;
          totalTransferred = offset;

          const elapsedTime = (Date.now() - startTime) / 1000;
          const speed = totalTransferred / elapsedTime;
          const progress = Math.min(1, totalTransferred / file.size) * 100;
          const remaining = (file.size - totalTransferred) / speed;

          console.log('transfer: ', progress, totalTransferred, file.size, speed, remaining);
          setTransferProgress(progress);
          setTransferStats({
            speed,
            remaining: Math.max(0, remaining),
            transferred: totalTransferred,
            total: file.size
          });
        }

        // setConnectionState('completed');
        toast.success('File transfer completed successfully!');
      } catch (error) {
        console.error("File transfer failed:", error);
        setConnectionState('error');
        toast.error(`File transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      toast.warning("Cannot start transfer: Not connected or no file selected.");
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
          <FileUpload onFileSelect={handleFileSelect} setFile={setFile} />
        )}

        {file && (
          <div className="w-full space-y-6">
            {connectionState !== 'completed' && (
              <ShareLink link={sharingLink} signalData={signalToSend} />
            )}

            <ConnectionStatus
              state={connectionState}
              peerName={peerConnected ? peerName : ''}
              isPeerConnected={peerConnected}
            />

            {showFilePreview && file && (
              <FilePreview
                file={file}
                onAccept={() => { }}
                onDecline={() => { }}
              />
            )}

            {connectionState === 'transferring' && transferStats && (
              <TransferProgress
                progress={transferProgress}
                transferSpeed={transferStats.speed}
                timeRemaining={transferStats.remaining}
                transferredBytes={transferStats.transferred}
                totalBytes={transferStats.total}
              />
            )}

            {connectionState === 'connected' && peerConnected && (
              <div className="w-full max-w-3xl mx-auto text-center mt-4 space-x-4">
                <Button onClick={sendTestMessage}>Send Test Message</Button>
                <Button
                  onClick={startFileTransfer}
                  className="btn-primary"
                >
                  Start File Transfer
                </Button>
              </div>
            )}

            {peerResponse === 'transfer-completed' && connectionState === 'completed' && (
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
                  <Button
                    onClick={handleReset}
                    className="btn-primary mx-auto"
                  >
                    Share Another File
                  </Button>
                </div>
              </div>
            )}

            {peerResponse === 'transfer-declined' && connectionState === 'completed' && (
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
                  <h3 className="text-xl font-medium mb-2">Transfer Declined!</h3>
                  <p className="text-muted-foreground mb-4">
                    Your file "{file?.name}" was declined by the user.
                  </p>
                  <Button
                    onClick={handleReset}
                    className="btn-primary mx-auto"
                  >
                    Share Another File
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-6 border-t border-border">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <a href='https://enzovezzaro.com' target='_blank'>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Enzo Vezzaro 👨🏽‍💻 Made with 💚☕️
            </p>
          </a>
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
