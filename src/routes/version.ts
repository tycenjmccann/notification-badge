import { Router, Request, Response } from 'express';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

/**
 * Create the version router.
 */
export function createVersionRouter(): Router {
  const router = Router();

  /**
   * GET /api/version
   * Returns application version metadata. No authentication required.
   */
  router.get('/', (_req: Request, res: Response) => {
    res.json({
      version,
      buildTime: new Date().toISOString(),
      nodeVersion: process.version,
    });
  });

  return router;
}
