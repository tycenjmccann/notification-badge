import { Server as SocketIOServer, Namespace, Socket } from 'socket.io';
import { authenticateSocket } from '../middleware/auth.js';
import { AuthUser } from '../types/auth.js';
import { WebSocketNotificationEmitter } from '../services/notificationEmitter.js';

/**
 * Socket with authenticated user data.
 */
interface AuthenticatedSocket extends Socket {
  data: {
    user: AuthUser;
  };
}

/**
 * Set up the /notifications WebSocket namespace.
 * - Authenticates connections via Bearer token in handshake
 * - Joins authenticated users to their private room
 * - Rejects unauthenticated connections
 */
export function setupNotificationNamespace(
  io: SocketIOServer,
  emitter: WebSocketNotificationEmitter,
): Namespace {
  const namespace = io.of('/notifications');

  // Connect the emitter to this namespace
  emitter.setNamespace(namespace);

  // Authentication middleware for WebSocket connections
  namespace.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    const user = authenticateSocket(token);
    if (!user) {
      next(new Error('Invalid authentication token'));
      return;
    }

    // Attach user to socket data
    socket.data.user = user;
    next();
  });

  // Handle new connections
  namespace.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;

    // Join the user's private room for scoped events
    socket.join(`user:${user.id}`);

    console.log(`User ${user.id} connected to notifications namespace`);

    socket.on('disconnect', () => {
      console.log(`User ${user.id} disconnected from notifications namespace`);
    });
  });

  return namespace;
}
