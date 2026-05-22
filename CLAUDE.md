# Notification Badge Backend

## Project Overview
Backend service for the notification badge counter feature.
Provides REST API and WebSocket events for real-time notification count updates.

## Tech Stack
- Node.js 18+ with TypeScript (strict mode, ESM)
- Express.js for REST API
- Socket.IO for WebSocket
- Zod for runtime validation
- Vitest for testing
- JWT for authentication

## Architecture
- `src/types/` - TypeScript interfaces and Zod schemas
- `src/config/` - Environment configuration
- `src/middleware/` - Auth and error handling middleware
- `src/services/` - Business logic (NotificationStore, NotificationService, NotificationEmitter)
- `src/routes/` - Express route handlers
- `src/websocket/` - Socket.IO namespace setup
- `src/__tests__/` - Unit and integration tests

## Key Design Decisions
- Counter-based approach: Maintains a cached `unreadCounts` map for O(1) reads
- User-scoped rooms: Each WebSocket client joins `user:{userId}` room
- Dependency injection: Services accept interfaces for testability
- Atomic operations: Counter updates are coupled with state changes to prevent races

## Commands
- `npm run dev` - Start dev server with hot reload
- `npm test` - Run all tests
- `npm run build` - TypeScript compilation
- `npm run lint` - ESLint

## API Endpoints
- `GET /api/notifications/unread-count` - Get unread count (auth required)
- `POST /api/notifications/:id/read` - Mark notification as read
- `POST /api/notifications/read-all` - Mark all as read
- `GET /api/version` - Get application version metadata (no auth required)
- `GET /health` - Health check

## WebSocket
- Namespace: `/notifications`
- Auth: Pass token in `socket.handshake.auth.token`
- Events: `notification:count-update` → `{ count: number }`
