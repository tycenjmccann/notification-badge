import { v4 as uuidv4 } from 'uuid';
import { Notification, CreateNotificationInput } from '../types/notification.js';
import { NotFoundError } from '../types/errors.js';

/**
 * In-memory notification store with atomic counter operations.
 * In production, this would be backed by a database (PostgreSQL)
 * with a cached unread_count column for efficient reads.
 *
 * The store uses a Map for O(1) lookups and maintains a separate
 * counter per user for efficient unread count queries.
 */
export class NotificationStore {
  private notifications: Map<string, Notification> = new Map();
  private unreadCounts: Map<string, number> = new Map();
  private userNotifications: Map<string, Set<string>> = new Map();

  /**
   * Get the unread notification count for a user.
   * O(1) operation using the cached counter.
   */
  getUnreadCount(userId: string): number {
    return this.unreadCounts.get(userId) ?? 0;
  }

  /**
   * Create a new notification.
   * Atomically increments the user's unread counter.
   */
  createNotification(input: CreateNotificationInput): Notification {
    const notification: Notification = {
      id: uuidv4(),
      userId: input.userId,
      title: input.title,
      body: input.body,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store notification
    this.notifications.set(notification.id, notification);

    // Add to user's notification set
    if (!this.userNotifications.has(input.userId)) {
      this.userNotifications.set(input.userId, new Set());
    }
    this.userNotifications.get(input.userId)!.add(notification.id);

    // Atomically increment unread count
    const currentCount = this.unreadCounts.get(input.userId) ?? 0;
    this.unreadCounts.set(input.userId, currentCount + 1);

    return notification;
  }

  /**
   * Mark a single notification as read.
   * Atomically decrements the user's unread counter.
   * Returns false if notification was already read (idempotent).
   */
  markAsRead(notificationId: string, userId: string): boolean {
    const notification = this.notifications.get(notificationId);

    if (!notification) {
      throw new NotFoundError(`Notification ${notificationId} not found`);
    }

    if (notification.userId !== userId) {
      throw new NotFoundError(`Notification ${notificationId} not found`);
    }

    // Already read - idempotent operation
    if (notification.isRead) {
      return false;
    }

    // Mark as read
    notification.isRead = true;
    notification.updatedAt = new Date();

    // Atomically decrement unread count (floor at 0)
    const currentCount = this.unreadCounts.get(userId) ?? 0;
    this.unreadCounts.set(userId, Math.max(0, currentCount - 1));

    return true;
  }

  /**
   * Mark all notifications as read for a user.
   * Atomically resets the user's unread counter to 0.
   * Returns the number of notifications that were marked as read.
   */
  markAllAsRead(userId: string): number {
    const userNotifIds = this.userNotifications.get(userId);
    if (!userNotifIds) {
      return 0;
    }

    let markedCount = 0;
    for (const notifId of userNotifIds) {
      const notification = this.notifications.get(notifId);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        notification.updatedAt = new Date();
        markedCount++;
      }
    }

    // Atomically reset counter to 0
    this.unreadCounts.set(userId, 0);

    return markedCount;
  }

  /**
   * Get a notification by ID (for testing/debugging).
   */
  getNotification(notificationId: string): Notification | undefined {
    return this.notifications.get(notificationId);
  }

  /**
   * Clear all data (for testing).
   */
  clear(): void {
    this.notifications.clear();
    this.unreadCounts.clear();
    this.userNotifications.clear();
  }
}

// Singleton instance
export const notificationStore = new NotificationStore();
