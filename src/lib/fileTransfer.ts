import { nanoid } from 'nanoid';

// Types for our file transfer
export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  totalChunks: number;
}

export interface FileChunk {
  id: string;
  fileId: string; 
  index: number;
  data: ArrayBuffer;
  isLast: boolean;
}

// Function to create a unique sharing link
export const createSharingLink = (roomId: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/receive/${roomId}`;
};

// Function to chunk a file for transfer
export const chunkFile = async (
  file: File, 
  chunkSize: number = 64 * 1024, // 64KB chunks by default
  onProgress?: (progress: number) => void
): Promise<{ metadata: FileMetadata, chunks: FileChunk[] }> => {
  const fileId = nanoid();
  const totalChunks = Math.ceil(file.size / chunkSize);
  const chunks: FileChunk[] = [];
  
  // Create file metadata
  const metadata: FileMetadata = {
    id: fileId,
    name: file.name,
    type: file.type,
    size: file.size,
    totalChunks
  };
  
  // Read the file in chunks
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const blob = file.slice(start, end);
    
    // Read this chunk as array buffer
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
    
    // Create chunk object
    chunks.push({
      id: nanoid(),
      fileId,
      index: i,
      data: arrayBuffer,
      isLast: i === totalChunks - 1
    });
    
    // Report progress
    if (onProgress) {
      onProgress((i + 1) / totalChunks * 100);
    }
  }
  
  return { metadata, chunks };
};

// Function to reassemble chunks into a file
export const reassembleFile = (metadata: FileMetadata, chunks: FileChunk[]): File => {
  // Sort chunks by index
  chunks.sort((a, b) => a.index - b.index);
  
  // Concatenate the array buffers
  const totalBytes = metadata.size;
  const result = new Uint8Array(totalBytes);
  
  let offset = 0;
  for (const chunk of chunks) {
    const data = new Uint8Array(chunk.data);
    result.set(data, offset);
    offset += data.length;
  }
  
  // Create a blob from the result
  const blob = new Blob([result], { type: metadata.type });
  
  // Create a File object
  return new File([blob], metadata.name, { type: metadata.type });
};

// Function to download a file
export const downloadFile = (file: File): void => {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// Mock function to simulate transfer for demo purposes
export const simulateFileTransfer = (
  file: File,
  onProgress: (
    progress: number, 
    transferredBytes: number, 
    totalBytes: number, 
    speed: number, 
    timeRemaining: number
  ) => void,
  onComplete: () => void
): { cancel: () => void } => {
  const totalSize = file.size;
  let transferred = 0;
  const startTime = Date.now();
  let lastUpdate = startTime;
  let speeds: number[] = [];
  
  const transferInterval = setInterval(() => {
    // Calculate random chunk size but ensure more realistic transfer simulation
    const maxChunkPerInterval = Math.max(totalSize * 0.01, 256 * 1024); // Max 1% or 256KB per interval
    const chunkSize = Math.min(
      maxChunkPerInterval * (Math.random() * 0.5 + 0.75), // Random between 75% and 125% of max
      totalSize - transferred
    );
    
    transferred += chunkSize;
    
    const now = Date.now();
    const intervalSeconds = (now - lastUpdate) / 1000;
    lastUpdate = now;
    
    // Calculate speed (bytes per second)
    const instantSpeed = chunkSize / intervalSeconds;
    speeds.push(instantSpeed);
    
    // Keep only last 5 speed measurements for moving average
    if (speeds.length > 5) {
      speeds.shift();
    }
    
    // Calculate average speed
    const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
    
    // Calculate progress and time remaining
    const progress = (transferred / totalSize) * 100;
    const timeRemaining = (totalSize - transferred) / avgSpeed;
    
    onProgress(progress, transferred, totalSize, avgSpeed, timeRemaining);
    
    if (transferred >= totalSize) {
      clearInterval(transferInterval);
      setTimeout(onComplete, 500);
    }
  }, 200); // Update every 200ms
  
  return {
    cancel: () => {
      clearInterval(transferInterval);
    }
  };
};
