import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { User } from './models';
import { verifySessionToken } from './auth-token';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        displayName?: string;
      };
      userId?: string;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifySessionToken(token);
      const user = await User.findById(decoded.userId);
      if (!user || user.email.toLowerCase() !== decoded.email.toLowerCase()) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.userId = user._id.toString();
      req.user = {
        uid: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
      };

      return next();
    } catch {
      // Fall through to Firebase token validation.
    }

    if (admin.apps.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);

    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    if (!user) {
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email || '',
        displayName: decodedToken.name || '',
        avatar: decodedToken.picture || '',
      });
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name,
    };
    req.userId = user._id.toString();

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Optional auth - allows public access but attaches user if authenticated
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = verifySessionToken(token);
        const user = await User.findById(decoded.userId);
        if (user && user.email.toLowerCase() === decoded.email.toLowerCase()) {
          req.userId = user._id.toString();
          req.user = {
            uid: user._id.toString(),
            email: user.email,
            displayName: user.displayName,
          };
          return next();
        }
      } catch {
        // Fall through to Firebase token validation.
      }

      if (admin.apps.length > 0) {
        const decodedToken = await admin.auth().verifyIdToken(token);

        let user = await User.findOne({ firebaseUid: decodedToken.uid });
        
        if (!user) {
          user = await User.create({
            firebaseUid: decodedToken.uid,
            email: decodedToken.email || '',
            displayName: decodedToken.name || '',
            avatar: decodedToken.picture || '',
          });
        }

        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          displayName: decodedToken.name,
        };
        req.userId = user._id.toString();
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};
