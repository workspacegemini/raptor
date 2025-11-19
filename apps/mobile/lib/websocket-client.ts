import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

type MessageHandler = (data: any) => void;

class MobileWebSocketClient {
  private socket: Socket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect() {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');

      if (!accessToken) {
        console.warn('Cannot connect to WebSocket: No access token');
        return;
      }

      // Determine WebSocket URL based on platform
      const apiUrl = Constants.expoConfig?.extra?.apiUrl ||
                    (Constants.platform?.ios
                      ? 'http://localhost:3001'
                      : 'http://10.0.2.2:3001');

      const wsUrl = apiUrl.replace('/api/v1', '');

      this.socket = io(`${wsUrl}/ws`, {
        auth: {
          token: accessToken,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupListeners();
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.emit('internal:connected', { socketId: this.socket?.id });
    });

    this.socket.on('connected', (data) => {
      console.log('✅ Server acknowledged connection:', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('🔌 WebSocket disconnected:', reason);
      this.emit('internal:disconnected', { reason });

      if (reason === 'io server disconnect') {
        this.reconnectAttempts++;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => this.connect(), 2000);
        }
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      this.emit('internal:error', { error: error.message });
    });

    // Listen for all events
    this.socket.onAny((event, data) => {
      this.emit(event, data);
    });
  }

  on(event: string, handler: MessageHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: MessageHandler) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  send(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  joinRoom(room: string) {
    this.send('join-room', { room });
  }

  leaveRoom(room: string) {
    this.send('leave-room', { room });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.handlers.clear();
  }

  async reconnect() {
    this.disconnect();
    await this.connect();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Singleton instance
let wsClient: MobileWebSocketClient | null = null;

export function getWebSocketClient(): MobileWebSocketClient {
  if (!wsClient) {
    wsClient = new MobileWebSocketClient();
    wsClient.connect();
  }
  return wsClient;
}

// React Hook for WebSocket
export function useWebSocket(event?: string, handler?: MessageHandler) {
  const client = useRef<MobileWebSocketClient>();

  useEffect(() => {
    client.current = getWebSocketClient();
  }, []);

  useEffect(() => {
    if (event && handler && client.current) {
      client.current.on(event, handler);

      return () => {
        client.current?.off(event, handler);
      };
    }
  }, [event, handler]);

  const send = useCallback((eventName: string, data: any) => {
    client.current?.send(eventName, data);
  }, []);

  const joinRoom = useCallback((room: string) => {
    client.current?.joinRoom(room);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    client.current?.leaveRoom(room);
  }, []);

  return {
    send,
    joinRoom,
    leaveRoom,
    isConnected: client.current?.isConnected() || false,
    socketId: client.current?.getSocketId(),
  };
}

// Hook for course progress updates
export function useCourseProgress(courseId: string) {
  const { joinRoom, leaveRoom } = useWebSocket();

  useEffect(() => {
    if (courseId) {
      const room = `course:${courseId}`;
      joinRoom(room);

      return () => {
        leaveRoom(room);
      };
    }
  }, [courseId, joinRoom, leaveRoom]);
}
