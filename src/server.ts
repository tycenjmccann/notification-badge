import { createApp } from './app.js';
import { loadConfig } from './config/index.js';

const config = loadConfig();
const { httpServer } = createApp();

httpServer.listen(config.port, () => {
  console.log(`Notification service running on port ${config.port}`);
  console.log(`WebSocket namespace: /notifications`);
  console.log(`REST API: GET /api/notifications/unread-count`);
});
