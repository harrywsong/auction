import { Request, Response, NextFunction } from 'express';
import { getSessionByToken } from '../services/sessionService.js';
import { getCaptain } from '../services/bidService.js';

export interface AuthRequest extends Request {
  user?: {
    role: 'admin' | 'captain' | 'spectator';
    captainId?: string;
    sessionId?: string;
    sessionToken?: string;
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    // Allow spectator access without token
    req.user = { role: 'spectator' };
    return next();
  }

  try {
    const session = await getSessionByToken(token);

    if (!session) {
      req.user = { role: 'spectator' };
      return next();
    }

    const captain = await getCaptain(session.captain_id);

    if (!captain) {
      req.user = { role: 'spectator' };
      return next();
    }

    req.user = {
      role: 'captain',
      captainId: captain.id,
      sessionId: session.id,
      sessionToken: token,
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    req.user = { role: 'spectator' };
    next();
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

export async function adminAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const adminKey = req.headers['x-admin-key'];

  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized admin access' });
  }

  req.user = { role: 'admin' };
  next();
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not found',
  });
}
