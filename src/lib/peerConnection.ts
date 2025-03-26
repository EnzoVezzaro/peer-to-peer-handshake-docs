import global from 'global';
import * as process from "process";
global.process = process;

import { nanoid } from 'nanoid';
import Peer, { DataConnection } from 'peerjs';

// Define a unique room ID for the connection
export const generateRoomId = (): string => {
  return nanoid(10);
};

// Convert a file to array buffer for transfer
export const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// PeerJS implementation
export const initiatePeerConnection = (
  onConnectionStateChange: (state: string) => void,
  onPeerIdGenerated: (peerId: string) => void, // Renamed from sendSignal
  onDataReceived: (data: string | ArrayBuffer) => void,
  onPeerJoined: (peerName: string) => void,
  isInitiator: boolean,
  roomId: string, // Keep roomId for potential future use (e.g., specific PeerServer path)
  initiatorPeerId?: string, // Renamed from signal - ID of the peer to connect to (used by receiver)
  onTransferProgress?: (progress: number, transferred: number, total: number, speed: number, remaining: number) => void
): {
  peer: Peer;
  connectToPeer: (receiverPeerId: string) => void; // Function to initiate connection from initiator
  sendData: (file: File, data: string | ArrayBuffer, 
  onTransferProgress?: (progress: number, transferred: number, total: number, speed: number, remaining: number) => void) => Promise<void>;
  sendFileInfo: (file: File) => void;
  handleSignal: (signal: string) => void;
} | null => {
  let peer: Peer;
  let connection: DataConnection | null = null;

    // Function to connect to another peer
  const connectToPeer = (targetPeerId: string) => {
    if (!peer || peer.disconnected) {
      console.error("Peer not initialized or disconnected. Cannot connect.");
      onConnectionStateChange('error');
      return;
    }
    if (connection && connection.open) {
      console.warn("Already connected. Ignoring connect attempt.");
      return;
    }
    // console.(`Attempting to connect to peer: ${targetPeerId}`);
    try {
      const newConnection = peer.connect(targetPeerId, {
        reliable: true,
        metadata: { roomId }, // Optionally send roomId in metadata
      });
      setupDataConnection(newConnection);
      onConnectionStateChange('connecting'); // Update state when attempting connection
    } catch (error) {
      console.error("Error initiating connection:", error);
      onConnectionStateChange('error');
    }
  };

  // Setup data connection event listeners
  const setupDataConnection = (dataConnection: DataConnection) => {
    // Clean up previous connection listeners if any
    if (connection) {
      connection.off('open');
      connection.off('data');
      connection.off('close');
      connection.off('error');
    }

    connection = dataConnection;
    // console.(`Setting up data connection with peer: ${connection.peer}`);

    connection.on('open', () => {
      // console.(`Data channel open with ${connection.peer}`);
      onConnectionStateChange('connected');
      onPeerJoined(connection.peer); // Use the actual peer ID as the name
    });

    connection.on('data', (data: string | ArrayBuffer) => {
      // console.log(`Data received from ${connection.peer}:`, data);
      // console.log("Received data:", data); // ADDED LOG
      // console.log("Data received on 'data' event:", data); // ADDED LOG
      onDataReceived(data);
    });

    connection.on('close', () => {
      // console.log(`Data channel closed with ${connection.peer}`);
      onConnectionStateChange('disconnected');
      connection = null; // Reset connection object
    });

    connection.on('error', (err) => {
      console.error(`Data channel error with ${connection.peer}:`, err);
      onConnectionStateChange('error');
      connection = null; // Reset connection object
    });
  };

  // Function to send data
  const sendData = (file: File, data: string | ArrayBuffer, onTransferProgress?: (progress: number, transferred: number, total: number, speed: number, remaining: number) => void): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      if (connection && connection.open) {
        try {
          // console.log("Connection status:", connection, connection?.open); // ADDED LOG
          // console.log("Sending data:", data); // ADDED LOG
          if (file && onTransferProgress) {
            const transfer = new FileTransfer(file, onTransferProgress);
            const totalChunks = transfer.getTotalChunks();
            let transferredBytes = 0;
            const startTime = Date.now();

            (async () => {
              for (let i = 0; i < totalChunks; i++) {
                const chunk = await transfer.readChunk(i);
                connection.send(chunk);
                transferredBytes += chunk.byteLength;

                const currentTime = Date.now();
                const elapsedTime = (currentTime - startTime) / 1000; // in seconds
                const speed = transferredBytes / elapsedTime; // bytes per second
                const remainingBytes = file.size - transferredBytes;
                const remainingTime = remainingBytes / speed;

                const progress = transferredBytes / file.size * 100;
                onTransferProgress(progress, transferredBytes, file.size, speed, remainingTime);
              }
              resolve();
            })();
          } else {
            // console.log("Sending data (no file):", data);
            connection.send(data);
            resolve();
          }
        } catch (error) {
          console.error('Failed to send data:', error);
          reject(error instanceof Error ? error : new Error('Failed to send data'));
        }
      } else {
        console.error('Unable to send data, connection not open or initialized.');
        reject(new Error('Connection not open or initialized.'));
      }
    });
  };

  // Function to send file metadata
  const sendFileInfo = (file: File) => {
    if (connection && connection.open) {
      const fileInfo = {
        type: 'file-info',
        payload: {
          name: file.name,
          size: file.size,
          type: file.type,
        },
      };
      // console.('Sending file info:', fileInfo);
      connection.send(JSON.stringify(fileInfo));
    } else {
      console.error("Data channel is not open, cannot send file info.");
    }
  };


  try {
    // Initialize PeerJS - Use a specific ID only if NOT the initiator
    // Let PeerServer assign ID for initiator to avoid potential collisions if ID is guessed
    const peerOptions = {
      // debug: 2, // 0: Errors, 1: Warnings, 2: Info, 3: Debug
    };
    peer = new Peer(peerOptions); // Initiator gets ID from server

    peer.on('open', (id) => {
      // console.('PeerJS initialized. My Peer ID is:', id);
      onPeerIdGenerated(id); // Notify UI of the generated ID

      if (!isInitiator && initiatorPeerId) {
        // Receiver automatically connects to the initiator ID from the URL
        // console.(`Receiver: Automatically connecting to initiator (${initiatorPeerId})`);
        // console.("Receiver: isInitiator is", isInitiator);
        connectToPeer(initiatorPeerId);
        // console.("connectToPeer called");
      } else if (isInitiator) {
        // console.("Initiator: Waiting for receiver's Peer ID to connect.");
        onConnectionStateChange('waiting'); // New state for initiator waiting
      }
    });

    // Handle incoming connections (primarily for the initiator)
    peer.on('connection', (incomingConnection) => {
      // console.(`Incoming connection from ${incomingConnection.peer}`);
      // If already connected, maybe reject or handle multiple connections?
      if (connection && connection.open) {
          console.warn(`Already connected to ${connection.peer}. Rejecting connection from ${incomingConnection.peer}`);
          incomingConnection.close(); // Example: reject new connection
          return;
      }
      // Accept the first incoming connection if not already connecting/connected
      setupDataConnection(incomingConnection);
      onConnectionStateChange('connecting'); // Peer is trying to connect
    });

    peer.on('disconnected', () => {
      // console.('Peer disconnected from PeerServer.');
      onConnectionStateChange('disconnected');
      // Attempt to reconnect? PeerJS might do this automatically depending on config
    });

    peer.on('close', () => {
      // console.('Peer connection closed.');
      onConnectionStateChange('disconnected');
      connection = null; // Ensure connection object is cleared
    });

    peer.on('error', (err) => {
      console.error('PeerJS error:', err);
      // Map specific PeerJS errors to connection states
      if (err.type === 'peer-unavailable') {
        onConnectionStateChange('peer-unavailable');
      } else if (err.type === 'network') {
         onConnectionStateChange('network-error');
      } else {
        onConnectionStateChange('error');
      }
      connection = null; // Ensure connection object is cleared on error
    });

    // Return the necessary objects/functions for external management
    const handleSignal = (signal: string) => {
      // console.("Handling signal:", signal); // ADDED LOG
      if (!isInitiator) {
        connectToPeer(signal);
      }
    };

    return { peer, connectToPeer, sendData, sendFileInfo, handleSignal };

  } catch (error) {
    console.error('Failed to initialize PeerJS:', error);
    onConnectionStateChange('error');
    return null;
  }
};

// Class to handle file transfers with chunking
export class FileTransfer {
  file: File;
  chunkSize: number;
  onProgress: (progress: number, transferred: number, total: number, speed: number, remaining: number) => void;

  constructor(file: File, onProgress: (progress: number, transferred: number, total: number, speed: number, remaining: number) => void) {
    this.file = file;
    this.chunkSize = 64 * 1024; // 64KB chunks
    this.onProgress = onProgress;
}

  // Get the total number of chunks for this file
  getTotalChunks(): number {
    return Math.ceil(this.file.size / this.chunkSize);
  }

  // Read a specific chunk from the file
  async readChunk(chunkIndex: number): Promise<ArrayBuffer> {
    const start = chunkIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.file.size);
    const blob = this.file.slice(start, end);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }
}
