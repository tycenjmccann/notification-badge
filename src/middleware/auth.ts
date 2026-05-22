import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUser, AuthTokenPayloadSchema } from '../types/auth.js';
import { UnauthorizedError } from '../types/errors.js';
import { loadConfig } from '../config/index.js';

/**
 * Express middleware for Bearer token authentication.
 * Validates JWT token and attaches user to request.
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const config = loadConfig();

    const decoded = jwt.verify(token, config.jwtSecret);
    const payload = AuthTokenPayloadSchema.parse(decoded);

    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
    };

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
      return;
    }
    next(new UnauthorizedError('Authentication failed'));
  }
}

/**
 * Authenticate a Socket.IO connection using Bearer token from handshake.
 * Returns the authenticated user or null.
 */
export function authenticateSocket(token: string): AuthUser | null {
  try {
    const config = loadConfig();
    const decoded = jwt.verify(token, config.jwtSecret);
    const payload = AuthTokenPayloadSchema.parse(decoded);

    return {
      id: payload.sub,
      email: payload.email,
    };
  } catch {
    return null;
  }
}
