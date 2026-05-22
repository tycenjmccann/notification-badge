import { z } from 'zod';

/**
 * Authentication types
 */

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export const AuthTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  iat: z.number(),
  exp: z.number(),
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
