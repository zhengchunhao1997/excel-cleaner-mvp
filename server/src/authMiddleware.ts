import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './auth';

export type AuthedRequest = Request & { auth?: { userId: string; email: string } };

export const authOptional = (req: AuthedRequest, _res: Response, next: NextFunction) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    next();
    return;
  }
  const header = String(req.header('authorization') || '');
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    next();
    return;
  }
  try {
    req.auth = verifyAccessToken(m[1], secret);
  } catch {
  }
  next();
};

export const authRequired = (req: AuthedRequest, res: Response, next: NextFunction) => {
  authOptional(req, res, () => {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  });
};

