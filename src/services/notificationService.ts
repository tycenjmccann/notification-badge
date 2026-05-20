import { NotificationStore } from './notificationStore.js';
import { CreateNotificationInput, UnreadCountResponse } from '../types/notification.js';
import { NotificationEmitter } from './notificationEmitter.js';

/**
 * Notification service that coordinates between the store and WebSocket emitter.
 * Handles business logic for notification state transitions and ensures
 * real-time updates are emitted to connected clients.
 */
export class NotificationService {
  constructor(
    private readonly store: NotificationStore,
    private readonly emitter: NotificationEmitter,
  ) {}

  /**
   * Get the unread notification count for a user.
   */
  getUnreadCount(userId: string): UnreadCountResponse {
    const count = this.store.getUnreadCount(userId);
    return { count };
  }

  /**
   * Create a new notification and emit real-time update.
   */
  createNotification(input: CreateNotificationInput): void {
    this.store.createNotification(input);
    const newCount = this.store.getUnreadCount(input.userId);
    this.emitter.emitCountUpdate(input.userId, newCount);
  }

  /**
   * Mark a notification as read and emit real-time update.
   */
  markAsRead(notificationId: string, userId: string): void {
    const changed = this.store.markAsRead(notificationId, userId);
    if (changed) {
      const newCount = this.store.getUnreadCount(userId);
      this.emitter.emitCountUpdate(userId, newCount);
    }
  }

  /**
   * Mark all notifications as read and emit real-time update.
   */
  markAllAsRead(userId: string): void {
    const markedCount = this.store.markAllAsRead(userId);
    if (markedCount > 0) {
      this.emitter.emitCountUpdate(userId, 0);
    }
  }
}
