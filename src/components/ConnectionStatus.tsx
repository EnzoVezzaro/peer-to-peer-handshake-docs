
import React from 'react';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'waiting' | 'confirming' | 'transferring' | 'completed' | 'error'; // Added 'confirming'

interface ConnectionStatusProps {
  state: ConnectionState;
  peerName?: string;
  isPeerConnected?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ state, peerName, isPeerConnected = false }) => {
  const getStatusDetails = () => {
    switch (state) {
      case 'disconnected':
        return {
          color: 'bg-gray-400',
          text: 'Disconnected',
          description: 'Waiting for connection...'
        };
      case 'connected':
        return {
          color: 'bg-green-500',
          text: 'Connected',
          description: isPeerConnected ? `Connected to ${peerName || 'peer'}! Waiting for file info...` : `Connected to ${peerName || 'peer'}` // Updated description
        };
      case 'waiting': // State when sender is waiting for receiver to accept
        return {
          color: 'bg-yellow-500', // Changed color
          text: 'Waiting for Acceptance',
          description: 'Waiting for recipient to accept the file transfer...'
        };
      // Removed duplicate 'waiting' case
      case 'confirming': // State when receiver needs to confirm
        return {
            color: 'bg-purple-500', // Added color
            text: 'Confirm Transfer',
            description: 'Please confirm or decline the incoming file transfer.'
        };
      case 'transferring':
        return {
          color: 'bg-blue-500',
          text: 'Transferring',
          description: 'File transfer in progress...'
        };
      case 'completed':
        return {
          color: 'bg-green-600',
          text: 'Completed',
          description: 'File transfer completed successfully!'
        };
      case 'error':
        return {
          color: 'bg-red-500',
          text: 'Error',
          description: 'An error occurred during the connection or transfer.'
        };
      default:
        return {
          color: 'bg-gray-400',
          text: 'Unknown',
          description: 'Unknown connection state'
        };
    }
  };

  const { color, text, description } = getStatusDetails();

  return (
    <div className="glassmorphism p-4 rounded-xl max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color} animate-pulse`}></div>
        <div>
          <h4 className="text-sm font-medium">{text}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus;
