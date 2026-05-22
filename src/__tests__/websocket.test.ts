import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { createApp, AppContext } from '../app.js';
import { AddressInfo } from 'net';

describe('WebSocket Notification Namespace', () => {
  let ctx: AppContext;
  let clientSocket: ClientSocket;
  let port: number;
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const otherUserId = '550e8400-e29b-41d4-a716-446655440001';
  const jwtSecret = 'test-secret-key-for-development';

  function generateToken(sub: string, email = 'test@example.com'): string {
    return jwt.sign({ sub, email }, jwtSecret, { expiresIn: '1h' });
  }

  beforeEach(async () => {
    ctx = createApp();
    await new Promise<void>((resolve) => {
      ctx.httpServer.listen(0, () => {
        const addr = ctx.httpServer.address() as AddressInfo;
        port = addr.port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    ctx.io.close();
    await new Promise<void>((resolve) => {
      ctx.httpServer.close(() => resolve());
    });
  });

  function connectClient(token: string): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const socket = ioc(`http://localhost:${port}/notifications`, {
        auth: { token },
        transports: ['websocket'],
      });

      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', (err) => reject(err));
    });
  }

  it('should reject connection without token', async () => {
    await expect(
      new Promise((resolve, reject) => {
        const socket = ioc(`http://localhost:${port}/notifications`, {
          auth: {},
          transports: ['websocket'],
        });
        socket.on('connect', () => {
          socket.disconnect();
          resolve('connected');
        });
        socket.on('connect_error', (err) => {
          socket.disconnect();
          reject(err);
        });
      }),
    ).rejects.toThrow();
  });

  it('should reject connection with invalid token', async () => {
    await expect(
      connectClient('invalid-token'),
    ).rejects.toThrow();
  });

  it('should accept connection with valid token', async () => {
    const token = generateToken(userId);
    clientSocket = await connectClient(token);
    expect(clientSocket.connected).toBe(true);
  });

  it('should receive count-update when notification is created', async () => {
    const token = generateToken(userId);
    clientSocket = await connectClient(token);

    const countPromise = new Promise<{ count: number }>((resolve) => {
      clientSocket.on('notification:count-update', (data) => {
        resolve(data);
      });
    });

    // Create a notification for this user
    ctx.notificationService.createNotification({
      userId,
      title: 'New Notification',
      body: 'You have a new message',
    });

    const result = await countPromise;
    expect(result).toEqual({ count: 1 });
  });

  it('should receive count-update when notification is marked as read', async () => {
    // Create notification first
    ctx.notificationStore.createNotification({
      userId,
      title: 'Test',
      body: 'Body',
    });

    const token = generateToken(userId);
    clientSocket = await connectClient(token);

    const notifId = Array.from(
      (ctx.notificationStore as any).notifications.values(),
    ).find((n: any) => n.userId === userId)?.id;

    const countPromise = new Promise<{ count: number }>((resolve) => {
      clientSocket.on('notification:count-update', (data) => {
        resolve(data);
      });
    });

    ctx.notificationService.markAsRead(notifId!, userId);

    const result = await countPromise;
    expect(result).toEqual({ count: 0 });
  });

  it('should receive count-update when all notifications are marked as read', async () => {
    // Create multiple notifications
    ctx.notificationStore.createNotification({ userId, title: 'T1', body: 'B1' });
    ctx.notificationStore.createNotification({ userId, title: 'T2', body: 'B2' });
    ctx.notificationStore.createNotification({ userId, title: 'T3', body: 'B3' });

    const token = generateToken(userId);
    clientSocket = await connectClient(token);

    const countPromise = new Promise<{ count: number }>((resolve) => {
      clientSocket.on('notification:count-update', (data) => {
        resolve(data);
      });
    });

    ctx.notificationService.markAllAsRead(userId);

    const result = await countPromise;
    expect(result).toEqual({ count: 0 });
  });

  it('should NOT receive updates for other users', async () => {
    const token = generateToken(userId);
    clientSocket = await connectClient(token);

    let received = false;
    clientSocket.on('notification:count-update', () => {
      received = true;
    });

    // Create notification for ANOTHER user
    ctx.notificationService.createNotification({
      userId: otherUserId,
      title: 'Other User Notification',
      body: 'This should not be received',
    });

    // Wait a bit to ensure no message is received
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(received).toBe(false);
  });

  it('should handle multiple users receiving their own updates independently', async () => {
    const token1 = generateToken(userId);
    const token2 = generateToken(otherUserId, 'other@example.com');

    clientSocket = await connectClient(token1);
    const client2 = await connectClient(token2);

    const user1CountPromise = new Promise<{ count: number }>((resolve) => {
      clientSocket.on('notification:count-update', (data) => {
        resolve(data);
      });
    });

    const user2CountPromise = new Promise<{ count: number }>((resolve) => {
      client2.on('notification:count-update', (data) => {
        resolve(data);
      });
    });

    // Create notifications for both users
    ctx.notificationService.createNotification({
      userId,
      title: 'User 1 Notif',
      body: 'For user 1',
    });
    ctx.notificationService.createNotification({
      userId: otherUserId,
      title: 'User 2 Notif',
      body: 'For user 2',
    });

    const [result1, result2] = await Promise.all([user1CountPromise, user2CountPromise]);
    expect(result1).toEqual({ count: 1 });
    expect(result2).toEqual({ count: 1 });

    client2.disconnect();
  });
});
