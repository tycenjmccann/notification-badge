import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createNotificationRouter } from './routes/notifications.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotificationService } from './services/notificationService.js';
import { NotificationStore } from './services/notificationStore.js';
import { WebSocketNotificationEmitter } from './services/notificationEmitter.js';
import { setupNotificationNamespace } from './websocket/notificationNamespace.js';
import { loadConfig } from './config/index.js';

export interface AppContext {
  app: express.Application;
  httpServer: ReturnType<typeof createServer>;
  io: SocketIOServer;
  notificationService: NotificationService;
  notificationStore: NotificationStore;
}

/**
 * Create and configure the application.
 * Returns all components for testing and lifecycle management.
 */
export function createApp(): AppContext {
  const config = loadConfig();
  const app = express();
  const httpServer = createServer(app);

  // Socket.IO server with CORS configuration
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  // Middleware
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  // Services (dependency injection)
  const notificationStore = new NotificationStore();
  const emitter = new WebSocketNotificationEmitter();
  const notificationService = new NotificationService(notificationStore, emitter);

  // Setup WebSocket namespace
  setupNotificationNamespace(io, emitter);

  // Routes
  app.use('/api/notifications', createNotificationRouter(notificationService));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return {
    app,
    httpServer,
    io,
    notificationService,
    notificationStore,
  };
}
