import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { NotificationService } from '../services/notificationService.js';
import { CreateNotificationSchema, MarkAsReadSchema } from '../types/notification.js';
import { ValidationError } from '../types/errors.js';

/**
 * Create the notifications router with dependency injection.
 */
export function createNotificationRouter(service: NotificationService): Router {
  const router = Router();

  /**
   * GET /api/notifications/unread-count
   * Returns the unread notification count for the authenticated user.
   * Requires Bearer token authentication.
   */
  router.get('/unread-count', authMiddleware, (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = service.getUnreadCount(userId);
    res.json(result);
  });

  /**
   * POST /api/notifications
   * Create a new notification (internal/admin endpoint).
   * In production, this would be called by other services.
   */
  router.post('/', authMiddleware, (req: Request, res: Response) => {
    const parseResult = CreateNotificationSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.message);
    }
    service.createNotification(parseResult.data);
    res.status(201).json({ success: true });
  });

  /**
   * POST /api/notifications/:id/read
   * Mark a single notification as read.
   */
  router.post('/:id/read', authMiddleware, (req: Request, res: Response) => {
    const parseResult = MarkAsReadSchema.safeParse({ notificationId: req.params.id });
    if (!parseResult.success) {
      throw new ValidationError('Invalid notification ID format');
    }
    const userId = req.user!.id;
    service.markAsRead(parseResult.data.notificationId, userId);
    res.json({ success: true });
  });

  /**
   * POST /api/notifications/read-all
   * Mark all notifications as read for the authenticated user.
   */
  router.post('/read-all', authMiddleware, (req: Request, res: Response) => {
    const userId = req.user!.id;
    service.markAllAsRead(userId);
    res.json({ success: true });
  });

  return router;
}
