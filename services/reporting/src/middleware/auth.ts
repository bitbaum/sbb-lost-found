import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface JwtPayload {
  id: string;
  sbbUserId: string;
  email: string;
}

// Demo user for development/demo mode
const DEMO_USER: JwtPayload = {
  id: '00000000-0000-0000-0000-000000000001',
  sbbUserId: 'demo_user_001',
  email: 'demo@sbb.ch',
};

const isDemoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // In demo mode, use demo user without requiring token
    if (isDemoMode) {
      req.user = DEMO_USER;
      logger.debug('Demo mode: using demo user', { userId: DEMO_USER.id });
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Authorization token required' },
      });
      return;
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    req.user = decoded;

    logger.debug('User authenticated', { userId: decoded.id, sbbUserId: decoded.sbbUserId });
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', { error: error.message });
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid authorization token' },
      });
    } else {
      logger.error('Authentication error', { error });
      res.status(500).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: 'Authentication failed' },
      });
    }
  }
};
