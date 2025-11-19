'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/lib/websocket-client';
import { Badge } from '@/components/ui/badge';

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string>();

  useWebSocket('internal:connected', (data) => {
    setIsConnected(true);
    setSocketId(data.socketId);
  });

  useWebSocket('internal:disconnected', () => {
    setIsConnected(false);
    setSocketId(undefined);
  });

  if (!isConnected) {
    return (
      <Badge variant="secondary" className="gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-500"></span>
        </span>
        Connecting...
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
      Live
      {socketId && (
        <span className="text-xs opacity-50 ml-1">
          ({socketId.slice(0, 6)})
        </span>
      )}
    </Badge>
  );
}
