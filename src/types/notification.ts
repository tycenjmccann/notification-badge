import { z } from 'zod';

/**
 * Core notification types and schemas
 */

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnreadCountResponse {
  count: number;
}

export interface CountUpdatePayload {
  count: number;
}

// Zod schemas for runtime validation
export const UnreadCountResponseSchema = z.object({
  count: z.number().int().min(0),
});

export const CountUpdatePayloadSchema = z.object({
  count: z.number().int().min(0),
});

export const CreateNotificationSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(2000),
});

export const MarkAsReadSchema = z.object({
  notificationId: z.string().uuid(),
});

export const MarkAllAsReadSchema = z.object({
  userId: z.string().uuid(),
});

export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type MarkAsReadInput = z.infer<typeof MarkAsReadSchema>;
export type MarkAllAsReadInput = z.infer<typeof MarkAllAsReadSchema>;
