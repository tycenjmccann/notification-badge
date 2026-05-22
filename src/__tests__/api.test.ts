import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp, AppContext } from '../app.js';

describe('Notification API', () => {
  let ctx: AppContext;
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const otherUserId = '550e8400-e29b-41d4-a716-446655440001';
  const jwtSecret = 'test-secret-key-for-development';

  function generateToken(sub: string, email = 'test@example.com'): string {
    return jwt.sign({ sub, email }, jwtSecret, { expiresIn: '1h' });
  }

  beforeEach(() => {
    ctx = createApp();
  });

  afterEach(() => {
    ctx.io.close();
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(ctx.app)
        .get('/api/notifications/unread-count');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(ctx.app)
        .get('/api/notifications/unread-count')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { sub: userId, email: 'test@example.com' },
        jwtSecret,
        { expiresIn: '-1h' },
      );

      const res = await request(ctx.app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it('should return count 0 for user with no notifications', async () => {
      const token = generateToken(userId);

      const res = await request(ctx.app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 0 });
    });

    it('should return correct count for user with notifications', async () => {
      const token = generateToken(userId);

      // Create notifications directly in the store
      ctx.notificationStore.createNotification({
        userId,
        title: 'Test 1',
        body: 'Body 1',
      });
      ctx.notificationStore.createNotification({
        userId,
        title: 'Test 2',
        body: 'Body 2',
      });

      const res = await request(ctx.app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 2 });
    });

    it('should be scoped to authenticated user only', async () => {
      const token = generateToken(userId);

      // Create notification for another user
      ctx.notificationStore.createNotification({
        userId: otherUserId,
        title: 'Other User Notif',
        body: 'Should not be counted',
      });

      const res = await request(ctx.app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 0 });
    });
  });

  describe('POST /api/notifications/:id/read', () => {
    it('should mark notification as read and decrement count', async () => {
      const token = generateToken(userId);
      const notification = ctx.notificationStore.createNotification({
        userId,
        title: 'Test',
        body: 'Body',
      });

      const res = await request(ctx.app)
        .post(`/api/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      // Verify count is decremented
      const countRes = await request(ctx.app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);
      expect(countRes.body).toEqual({ count: 0 });
    });

    it('should return 401 without authentication', async () => {
      const res = await request(ctx.app)
        .post('/api/notifications/some-id/read');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const token = generateToken(userId);

      ctx.notificationStore.createNotification({ userId, title: 'T1', body: 'B1' });
      ctx.notificationStore.createNotification({ userId, title: 'T2', body: 'B2' });
      ctx.notificationStore.createNotification({ userId, title: 'T3', body: 'B3' });

      const res = await request(ctx.app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      // Verify count is 0
      const countRes = await request(ctx.app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);
      expect(countRes.body).toEqual({ count: 0 });
    });

    it('should return 401 without authentication', async () => {
      const res = await request(ctx.app)
        .post('/api/notifications/read-all');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const res = await request(ctx.app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/version', () => {
    it('should return HTTP 200 with version metadata', async () => {
      const res = await request(ctx.app).get('/api/version');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
      expect(new Date(res.body.buildTime).toISOString()).toBe(res.body.buildTime);
    });

    it('should not require authentication', async () => {
      const res = await request(ctx.app).get('/api/version');
      expect(res.status).toBe(200);
    });
  });
});
