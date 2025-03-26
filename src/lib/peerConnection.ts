// This is a simple implementation without the actual WebRTC code
// In a real implementation, we would use the simple-peer library here

import global from 'global';
import * as process from "process";
global.process = process;

import { nanoid } from 'nanoid';

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

// WebRTC implementation
export const initiatePeerConnection = (
  onConnectionStateChange: (state: string) => void,
  sendSignal: (signal: string) => void, // Renamed from onData - sends signals OUT
  onDataReceived: (data: string | ArrayBuffer) => void, // Callback for received data channel messages
  onPeerJoined: (peerName: string) => void,
  onFileRequest: (file: File) => void, // Keep for potential future use
  setFile: (file: File) => void,       // Keep for potential future use
  isInitiator: boolean,
  roomId: string
): { pc: RTCPeerConnection, handleSignal: (signal: string) => void, sendData: (data: string | ArrayBuffer) => void } | null => {
  // In a real implementation, we would create a WebRTC peer connection here
  // using WebRTC directly

  const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  const pc = new RTCPeerConnection(configuration); // Changed 'let' to 'const'
  let dc: RTCDataChannel | null = null; // Data channel - needs to be let as it's assigned later

  console.log(`Initiating Peer Connection: initiator=${isInitiator}, roomId=${roomId}`);

  // --- ICE Candidate Handling ---
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('Sending ICE candidate:', event.candidate);
      // Send the candidate to the other peer via the signaling server/mechanism
      sendSignal(JSON.stringify({ type: 'candidate', candidate: event.candidate })); // Use sendSignal
    } else {
      console.log('All ICE candidates have been sent');
    }
  };

  // --- Connection State Handling ---
  pc.oniceconnectionstatechange = () => {
    console.log(`ICE Connection State: ${pc.iceConnectionState}`);
    onConnectionStateChange(pc.iceConnectionState); // Report state change
    if (pc.iceConnectionState === 'connected') {
        // Consider adding onPeerJoined here if appropriate
    } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
        // Handle disconnection or failure
        console.error(`ICE Connection State failed: ${pc.iceConnectionState}`);
        // Optionally close the connection or attempt reconnection
    }
  };

   pc.onconnectionstatechange = () => {
    console.log(`Connection State: ${pc.connectionState}`);
     if (pc.connectionState === 'connected') {
       onConnectionStateChange('connected');
       onPeerJoined('WebRTC User'); // Assuming connection means peer joined
     } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
       onConnectionStateChange('disconnected');
     }
   };

  // --- Data Channel Handling ---
  const setupDataChannel = (channel: RTCDataChannel) => {
    dc = channel; // Changed 'let' to 'const' - Reverted: dc needs assignment
    console.log(`Data channel "${dc.label}" setup.`);
    dc.binaryType = 'arraybuffer';

    dc.onopen = () => {
      console.log(`Data channel "${dc.label}" opened.`);
      // Connection is fully established when data channel is open
      onConnectionStateChange('connected'); 
      onPeerJoined('WebRTC User'); // Or get name via signaling
    };

    dc.onclose = () => {
      console.log(`Data channel "${dc.label}" closed.`);
      onConnectionStateChange('disconnected');
    };

    dc.onerror = (error) => {
      console.error(`Data channel "${dc.label}" error:`, error);
      onConnectionStateChange('error');
    };

    dc.onmessage = (event) => {
      console.log(`Data channel message received:`, event.data);
      onDataReceived(event.data); // Use onDataReceived
    };
  };

  // --- Signaling Logic ---
  if (isInitiator) {
    console.log('Creating data channel');
    const dataChannel = pc.createDataChannel(roomId || 'file-transfer-channel'); // Use roomId or a default name
    setupDataChannel(dataChannel);

    console.log('Creating offer');
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        console.log('Offer created and set as local description. Sending offer...');
        if (pc.localDescription) {
          // Send the offer signal
          sendSignal(JSON.stringify({ type: 'offer', sdp: pc.localDescription.sdp }));
        }
      })
      .catch(error => console.error('Error creating offer:', error));

  } else {
     // Receiver logic
     pc.ondatachannel = (event) => {
       console.log('Data channel received');
       setupDataChannel(event.channel);
     };
     // Receiver logic moved to handleSignal below
  }

  // Function to handle incoming signals
  const handleSignal = (signalString: string) => {
    if (!pc) return; // Should not happen if initialized correctly

    try {
        const signal = JSON.parse(signalString);
        console.log('Received signal:', signal);

        if (signal.type === 'offer' && !isInitiator) {
            console.log('Received offer, setting remote description and creating answer...');
            const offerDesc = new RTCSessionDescription({ type: 'offer', sdp: signal.sdp });
            pc.setRemoteDescription(offerDesc)
              .then(() => pc.createAnswer())
              .then(answer => pc.setLocalDescription(answer))
              .then(() => {
                console.log('Answer created and set as local description. Sending answer...');
                if (pc.localDescription) {
                  sendSignal(JSON.stringify({ type: 'answer', sdp: pc.localDescription.sdp }));
                }
              })
              .catch(error => console.error('Error handling offer:', error));

        } else if (signal.type === 'answer' && isInitiator) {
            console.log('Received answer, setting remote description...');
            const answerDesc = new RTCSessionDescription({ type: 'answer', sdp: signal.sdp });
            pc.setRemoteDescription(answerDesc)
              .catch(error => console.error('Error setting remote description from answer:', error));

        } else if (signal.type === 'candidate') {
            console.log('Received ICE candidate, adding...');
            if (signal.candidate) {
                pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
                  .catch(error => console.error('Error adding received ICE candidate:', error));
            }
        } else {
            console.warn('Received unknown signal type:', signal.type);
        }
    } catch (error) {
        console.error('Error parsing signal:', error);
    }
  };

  // Function to send data over the data channel
  const sendData = (data: string | ArrayBuffer) => {
      if (dc && dc.readyState === 'open') {
          console.log('Sending data:', data);
          // Explicitly check the type before sending to satisfy TypeScript
          if (typeof data === 'string') {
              dc.send(data);
          } else if (data instanceof ArrayBuffer) {
              dc.send(data);
          } else {
              console.error("Unsupported data type for sending:", typeof data);
          }
      } else {
          console.error("Data channel is not open or not initialized, cannot send data.");
          // Optionally queue data or throw error
      }
  };


  // Return the necessary objects/functions for external management
  return { pc, handleSignal, sendData };
};

// Class to handle file transfers with chunking
export class FileTransfer {
  file: File;
  chunkSize: number;
  onProgress: (progress: number) => void;
  
  constructor(file: File, onProgress: (progress: number) => void) {
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
