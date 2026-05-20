import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationService } from '../services/notificationService.js';
import { NotificationStore } from '../services/notificationStore.js';
import { InMemoryNotificationEmitter } from '../services/notificationEmitter.js';

describe('NotificationService', () => {
  let service: NotificationService;
  let store: NotificationStore;
  let emitter: InMemoryNotificationEmitter;
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    store = new NotificationStore();
    emitter = new InMemoryNotificationEmitter();
    service = new NotificationService(store, emitter);
  });

  describe('getUnreadCount', () => {
    it('should return count of 0 for user with no notifications', () => {
      const result = service.getUnreadCount(userId);
      expect(result).toEqual({ count: 0 });
    });

    it('should return correct count after creating notifications', () => {
      service.createNotification({ userId, title: 'Test 1', body: 'Body 1' });
      service.createNotification({ userId, title: 'Test 2', body: 'Body 2' });

      const result = service.getUnreadCount(userId);
      expect(result).toEqual({ count: 2 });
    });
  });

  describe('createNotification', () => {
    it('should create notification and emit count update', () => {
      service.createNotification({ userId, title: 'New', body: 'Message' });

      expect(emitter.events).toHaveLength(1);
      expect(emitter.events[0]).toEqual({ userId, count: 1 });
    });

    it('should emit incrementing counts for multiple notifications', () => {
      service.createNotification({ userId, title: 'Test 1', body: 'Body 1' });
      service.createNotification({ userId, title: 'Test 2', body: 'Body 2' });
      service.createNotification({ userId, title: 'Test 3', body: 'Body 3' });

      expect(emitter.events).toHaveLength(3);
      expect(emitter.events[0].count).toBe(1);
      expect(emitter.events[1].count).toBe(2);
      expect(emitter.events[2].count).toBe(3);
    });

    it('should scope events to the correct user', () => {
      const otherUserId = '550e8400-e29b-41d4-a716-446655440001';

      service.createNotification({ userId, title: 'Test 1', body: 'Body 1' });
      service.createNotification({ userId: otherUserId, title: 'Test 2', body: 'Body 2' });

      const userEvents = emitter.getEventsForUser(userId);
      const otherEvents = emitter.getEventsForUser(otherUserId);

      expect(userEvents).toHaveLength(1);
      expect(userEvents[0].count).toBe(1);
      expect(otherEvents).toHaveLength(1);
      expect(otherEvents[0].count).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should emit count update when notification is marked as read', () => {
      service.createNotification({ userId, title: 'Test', body: 'Body' });
      emitter.clear();

      const notifId = store.getUnreadCount(userId) > 0
        ? Array.from((store as any).notifications.values()).find(
            (n: any) => n.userId === userId && !n.isRead,
          )?.id
        : undefined;

      if (notifId) {
        service.markAsRead(notifId, userId);
        expect(emitter.events).toHaveLength(1);
        expect(emitter.events[0]).toEqual({ userId, count: 0 });
      }
    });

    it('should not emit when notification is already read', () => {
      service.createNotification({ userId, title: 'Test', body: 'Body' });

      const notifId = Array.from((store as any).notifications.values()).find(
        (n: any) => n.userId === userId && !n.isRead,
      )?.id;

      if (notifId) {
        service.markAsRead(notifId, userId);
        emitter.clear();
        service.markAsRead(notifId, userId);
        expect(emitter.events).toHaveLength(0);
      }
    });
  });

  describe('markAllAsRead', () => {
    it('should emit count update of 0 when all are marked as read', () => {
      service.createNotification({ userId, title: 'Test 1', body: 'Body 1' });
      service.createNotification({ userId, title: 'Test 2', body: 'Body 2' });
      emitter.clear();

      service.markAllAsRead(userId);

      expect(emitter.events).toHaveLength(1);
      expect(emitter.events[0]).toEqual({ userId, count: 0 });
    });

    it('should not emit when there are no unread notifications', () => {
      service.markAllAsRead(userId);
      expect(emitter.events).toHaveLength(0);
    });
  });

  describe('state transitions', () => {
    it('should handle full lifecycle: create -> read -> create -> read-all', () => {
      // Create 3 notifications
      service.createNotification({ userId, title: 'Test 1', body: 'Body 1' });
      service.createNotification({ userId, title: 'Test 2', body: 'Body 2' });
      service.createNotification({ userId, title: 'Test 3', body: 'Body 3' });
      expect(service.getUnreadCount(userId)).toEqual({ count: 3 });

      // Mark one as read
      const notifId = Array.from((store as any).notifications.values()).find(
        (n: any) => n.userId === userId && !n.isRead,
      )?.id;
      if (notifId) {
        service.markAsRead(notifId, userId);
        expect(service.getUnreadCount(userId)).toEqual({ count: 2 });
      }

      // Create another
      service.createNotification({ userId, title: 'Test 4', body: 'Body 4' });
      expect(service.getUnreadCount(userId)).toEqual({ count: 3 });

      // Mark all as read
      service.markAllAsRead(userId);
      expect(service.getUnreadCount(userId)).toEqual({ count: 0 });
    });
  });
});
