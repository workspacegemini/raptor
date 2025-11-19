import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/ws',
})
export class WebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from auth header or query
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(
          `Client ${client.id} attempted to connect without token`,
        );
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      const organizationId = payload.organizationId;

      // Store user info in socket data
      client.data.userId = userId;
      client.data.organizationId = organizationId;

      // Track user connections
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join organization room for multi-tenant broadcasts
      client.join(`org:${organizationId}`);
      client.join(`user:${userId}`);

      this.logger.log(
        `Client connected: ${client.id} (User: ${userId}, Org: ${organizationId})`,
      );

      // Send connection acknowledgment
      client.emit('connected', {
        socketId: client.id,
        userId,
        organizationId,
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);

      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', data: { timestamp: Date.now() } };
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    const { room } = data;

    // Validate room format (e.g., course:123, lesson:456)
    if (!/^(course|lesson|team):\w+$/.test(room)) {
      return { event: 'error', data: { message: 'Invalid room format' } };
    }

    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);

    return { event: 'joined', data: { room } };
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    const { room } = data;

    client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);

    return { event: 'left', data: { room } };
  }

  // Server-side methods to emit events

  /**
   * Notify specific user across all their active connections
   */
  notifyUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.debug(`Notified user ${userId}: ${event}`);
  }

  /**
   * Notify all users in an organization
   */
  notifyOrganization(organizationId: string, event: string, data: any) {
    this.server.to(`org:${organizationId}`).emit(event, data);
    this.logger.debug(`Notified organization ${organizationId}: ${event}`);
  }

  /**
   * Notify all users in a specific room (course, lesson, team)
   */
  notifyRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
    this.logger.debug(`Notified room ${room}: ${event}`);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.debug(`Broadcast: ${event}`);
  }

  /**
   * Get active connection count for a user
   */
  getUserConnectionCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }

  /**
   * Check if user is online (has at least one active connection)
   */
  isUserOnline(userId: string): boolean {
    return this.getUserConnectionCount(userId) > 0;
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Get total connection count
   */
  getTotalConnections(): number {
    return this.server.sockets.sockets.size;
  }
}
