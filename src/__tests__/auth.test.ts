import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticateSocket } from '../middleware/auth.js';

const jwtSecret = 'test-secret-key-for-development';
const userId = '550e8400-e29b-41d4-a716-446655440000';

describe('authenticateSocket', () => {
  it('should return user for valid token', () => {
    const token = jwt.sign(
      { sub: userId, email: 'test@example.com' },
      jwtSecret,
      { expiresIn: '1h' },
    );

    const user = authenticateSocket(token);
    expect(user).toEqual({ id: userId, email: 'test@example.com' });
  });

  it('should return null for invalid token', () => {
    const user = authenticateSocket('invalid-token');
    expect(user).toBeNull();
  });

  it('should return null for expired token', () => {
    const token = jwt.sign(
      { sub: userId, email: 'test@example.com' },
      jwtSecret,
      { expiresIn: '-1h' },
    );

    const user = authenticateSocket(token);
    expect(user).toBeNull();
  });

  it('should return null for token with wrong secret', () => {
    const token = jwt.sign(
      { sub: userId, email: 'test@example.com' },
      'wrong-secret',
      { expiresIn: '1h' },
    );

    const user = authenticateSocket(token);
    expect(user).toBeNull();
  });
});
