
import React from 'react';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'waiting' | 'transferring' | 'completed' | 'error';

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
          description: isPeerConnected ? `Connected to ${peerName || 'peer'}! Waiting for file...` : `Connected to ${peerName || 'peer'}`
        };
      case 'waiting':
        return {
          color: 'bg-blue-400',
          text: 'Waiting for Confirmation',
          description: 'Waiting for recipient to accept the file transfer...'
        };
      case 'waiting':
        return {
          color: 'bg-blue-400',
          text: 'Waiting for Confirmation',
          description: 'Waiting for recipient to accept the file transfer...'
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
