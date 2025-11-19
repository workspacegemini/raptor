import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth-store';

interface WebSocketMessage {
  event: string;
  data: any;
}

type MessageHandler = (data: any) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isIntentionalDisconnect = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  connect() {
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
      console.warn('Cannot connect to WebSocket: No access token');
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ||
                  process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ||
                  'http://localhost:3001';

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

      if (!this.isIntentionalDisconnect && reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
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

    // Listen for all events and dispatch to handlers
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
    this.isIntentionalDisconnect = true;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.handlers.clear();
  }

  reconnect() {
    this.isIntentionalDisconnect = false;
    this.disconnect();
    this.connect();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient();
  }
  return wsClient;
}

// React Hook for WebSocket
export function useWebSocket(event?: string, handler?: MessageHandler) {
  const client = useRef<WebSocketClient>();
  const { accessToken } = useAuthStore();

  useEffect(() => {
    client.current = getWebSocketClient();

    // Reconnect if token changes
    if (accessToken) {
      client.current.reconnect();
    }

    return () => {
      // Don't disconnect on unmount, keep connection alive
    };
  }, [accessToken]);

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

// Hook for real-time notifications
export function useRealtimeNotifications() {
  const handleNotification = useCallback((data: any) => {
    console.log('📬 Notification:', data);

    // You can integrate with a toast notification system here
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(data.title || 'Notification', {
          body: data.message,
          icon: '/icon.png',
        });
      }
    }
  }, []);

  useWebSocket('system:notification', handleNotification);
  useWebSocket('enrollment:created', handleNotification);
  useWebSocket('course:completed', handleNotification);
  useWebSocket('lesson:completed', handleNotification);
  useWebSocket('skill:badge-earned', handleNotification);
  useWebSocket('ai-job:status', handleNotification);
}

// Hook for course updates
export function useCourseUpdates(courseId: string, onUpdate: (data: any) => void) {
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

  useWebSocket('course:updated', onUpdate);
}

// Hook for team updates
export function useTeamUpdates(teamId: string, onUpdate: (data: any) => void) {
  const { joinRoom, leaveRoom } = useWebSocket();

  useEffect(() => {
    if (teamId) {
      const room = `team:${teamId}`;
      joinRoom(room);

      return () => {
        leaveRoom(room);
      };
    }
  }, [teamId, joinRoom, leaveRoom]);

  useWebSocket('team:updated', onUpdate);
}
