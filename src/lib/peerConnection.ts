
// This is a simple implementation without the actual WebRTC code
// In a real implementation, we would use the simple-peer library here

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

// Mock implementation
export const initiatePeerConnection = (
  onConnectionStateChange: (state: string) => void,
  onData: (data: any) => void
) => {
  // In a real implementation, we would create a WebRTC peer connection here
  // using simple-peer or a similar library
  
  const mockConnection = {
    connect: () => {
      onConnectionStateChange('connecting');
      // Simulate connection delay
      setTimeout(() => {
        onConnectionStateChange('connected');
      }, 1500);
    },
    
    sendFile: (file: File, 
      onProgress: (progress: number, 
        transferred: number, 
        total: number, 
        speed: number, 
        remaining: number) => void) => {
      onConnectionStateChange('transferring');
      
      // Simulate file transfer
      const totalSize = file.size;
      let transferred = 0;
      const startTime = Date.now();
      
      const transferInterval = setInterval(() => {
        // Simulate transfer of chunks
        const chunkSize = Math.min(512 * 1024, totalSize - transferred); // 512KB chunks
        transferred += chunkSize;
        
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const speed = transferred / elapsedSeconds;
        const progress = (transferred / totalSize) * 100;
        const remaining = (totalSize - transferred) / speed;
        
        onProgress(progress, transferred, totalSize, speed, remaining);
        
        if (transferred >= totalSize) {
          clearInterval(transferInterval);
          setTimeout(() => {
            onConnectionStateChange('completed');
          }, 500);
        }
      }, 200);
    },
    
    disconnect: () => {
      onConnectionStateChange('disconnected');
    }
  };
  
  return mockConnection;
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
