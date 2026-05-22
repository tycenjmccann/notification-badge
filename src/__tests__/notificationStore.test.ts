import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationStore } from '../services/notificationStore.js';
import { NotFoundError } from '../types/errors.js';

describe('NotificationStore', () => {
  let store: NotificationStore;
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const otherUserId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    store = new NotificationStore();
  });

  describe('getUnreadCount', () => {
    it('should return 0 for a user with no notifications', () => {
      expect(store.getUnreadCount(userId)).toBe(0);
    });

    it('should return correct count after creating notifications', () => {
      store.createNotification({ userId, title: 'Test 1', body: 'Body 1' });
      store.createNotification({ userId, title: 'Test 2', body: 'Body 2' });

      expect(store.getUnreadCount(userId)).toBe(2);
    });

    it('should be scoped to the specific user', () => {
      store.createNotification({ userId, title: 'Test 1', body: 'Body 1' });
      store.createNotification({ userId: otherUserId, title: 'Test 2', body: 'Body 2' });

      expect(store.getUnreadCount(userId)).toBe(1);
      expect(store.getUnreadCount(otherUserId)).toBe(1);
    });
  });

  describe('createNotification', () => {
    it('should create a notification and increment unread count', () => {
      const notification = store.createNotification({
        userId,
        title: 'New Message',
        body: 'You have a new message',
      });

      expect(notification.id).toBeDefined();
      expect(notification.userId).toBe(userId);
      expect(notification.title).toBe('New Message');
      expect(notification.body).toBe('You have a new message');
      expect(notification.isRead).toBe(false);
      expect(notification.createdAt).toBeInstanceOf(Date);
      expect(store.getUnreadCount(userId)).toBe(1);
    });

    it('should handle multiple notifications for the same user', () => {
      store.createNotification({ userId, title: 'Test 1', body: 'Body 1' });
      store.createNotification({ userId, title: 'Test 2', body: 'Body 2' });
      store.createNotification({ userId, title: 'Test 3', body: 'Body 3' });

      expect(store.getUnreadCount(userId)).toBe(3);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read and decrement count', () => {
      const notification = store.createNotification({
        userId,
        title: 'Test',
        body: 'Body',
      });

      const changed = store.markAsRead(notification.id, userId);

      expect(changed).toBe(true);
      expect(store.getUnreadCount(userId)).toBe(0);
      expect(store.getNotification(notification.id)?.isRead).toBe(true);
    });

    it('should be idempotent - marking already read notification returns false', () => {
      const notification = store.createNotification({
        userId,
        title: 'Test',
        body: 'Body',
      });

      store.markAsRead(notification.id, userId);
      const changed = store.markAsRead(notification.id, userId);

      expect(changed).toBe(false);
      expect(store.getUnreadCount(userId)).toBe(0);
    });

    it('should throw NotFoundError for non-existent notification', () => {
      expect(() =>
        store.markAsRead('non-existent-id', userId),
      ).toThrow(NotFoundError);
    });

    it('should throw NotFoundError when user does not own the notification', () => {
      const notification = store.createNotification({
        userId,
        title: 'Test',
        body: 'Body',
      });

      expect(() =>
        store.markAsRead(notification.id, otherUserId),
      ).toThrow(NotFoundError);
    });

    it('should not decrement count below 0', () => {
      const notification = store.createNotification({
        userId,
        title: 'Test',
        body: 'Body',
      });

      store.markAsRead(notification.id, userId);

      expect(store.getUnreadCount(userId)).toBe(0);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read and reset count to 0', () => {
      store.createNotification({ userId, title: 'Test 1', body: 'Body 1' });
      store.createNotification({ userId, title: 'Test 2', body: 'Body 2' });
      store.createNotification({ userId, title: 'Test 3', body: 'Body 3' });

      const markedCount = store.markAllAsRead(userId);

      expect(markedCount).toBe(3);
      expect(store.getUnreadCount(userId)).toBe(0);
    });

    it('should return 0 for user with no notifications', () => {
      const markedCount = store.markAllAsRead(userId);
      expect(markedCount).toBe(0);
    });

    it('should not affect other users notifications', () => {
      store.createNotification({ userId, title: 'Test 1', body: 'Body 1' });
      store.createNotification({ userId: otherUserId, title: 'Test 2', body: 'Body 2' });

      store.markAllAsRead(userId);

      expect(store.getUnreadCount(userId)).toBe(0);
      expect(store.getUnreadCount(otherUserId)).toBe(1);
    });

    it('should only count unread notifications in markedCount', () => {
      const notif1 = store.createNotification({ userId, title: 'Test 1', body: 'Body 1' });
      store.createNotification({ userId, title: 'Test 2', body: 'Body 2' });

      // Mark one as read first
      store.markAsRead(notif1.id, userId);

      const markedCount = store.markAllAsRead(userId);
      expect(markedCount).toBe(1);
    });
  });

  describe('concurrent operations', () => {
    it('should handle rapid create and read operations correctly', () => {
      // Simulate rapid operations
      const notifications = [];
      for (let i = 0; i < 100; i++) {
        notifications.push(
          store.createNotification({ userId, title: `Test ${i}`, body: `Body ${i}` }),
        );
      }

      expect(store.getUnreadCount(userId)).toBe(100);

      // Mark half as read
      for (let i = 0; i < 50; i++) {
        store.markAsRead(notifications[i].id, userId);
      }

      expect(store.getUnreadCount(userId)).toBe(50);

      // Mark all as read
      store.markAllAsRead(userId);
      expect(store.getUnreadCount(userId)).toBe(0);
    });
  });
});
