import { Server as SocketIOServer, Namespace } from 'socket.io';
import { CountUpdatePayload } from '../types/notification.js';

/**
 * Interface for emitting notification events.
 * Allows for easy testing with mock implementations.
 */
export interface NotificationEmitter {
  emitCountUpdate(userId: string, count: number): void;
}

/**
 * WebSocket-based notification emitter.
 * Emits events scoped to the authenticated user's room.
 */
export class WebSocketNotificationEmitter implements NotificationEmitter {
  private namespace: Namespace | null = null;

  setNamespace(namespace: Namespace): void {
    this.namespace = namespace;
  }

  /**
   * Emit count update to a specific user's room.
   * Only the authenticated user receives their own count updates.
   */
  emitCountUpdate(userId: string, count: number): void {
    if (!this.namespace) {
      console.warn('WebSocket namespace not initialized, skipping emit');
      return;
    }

    const payload: CountUpdatePayload = { count };
    this.namespace.to(`user:${userId}`).emit('notification:count-update', payload);
  }
}

/**
 * In-memory emitter for testing.
 * Records all emitted events for assertion.
 */
export class InMemoryNotificationEmitter implements NotificationEmitter {
  public events: Array<{ userId: string; count: number }> = [];

  emitCountUpdate(userId: string, count: number): void {
    this.events.push({ userId, count });
  }

  clear(): void {
    this.events = [];
  }

  getEventsForUser(userId: string): Array<{ userId: string; count: number }> {
    return this.events.filter((e) => e.userId === userId);
  }
}
