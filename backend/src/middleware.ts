import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { User } from './models';

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

    // Try our custom token format first (simple JWT)
    // Token format: email|userId|timestamp
    if (token.includes('|')) {
      const parts = token.split('|');
      if (parts.length >= 2) {
        const email = parts[0];
        const userId = parts[1];

        // Verify user exists in database
        const user = await User.findById(userId);
        if (!user || user.email !== email) {
          return res.status(401).json({ error: 'Invalid token' });
        }

        req.userId = userId;
        req.user = {
          uid: user._id.toString(),
          email: user.email,
          displayName: user.displayName,
        };

        return next();
      }
    }

    // Fallback to Firebase tokens
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Find or create user in MongoDB
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

      // Try our custom token format first
      if (token.includes('|')) {
        const parts = token.split('|');
        if (parts.length >= 2) {
          const email = parts[0];
          const userId = parts[1];

          const user = await User.findById(userId);
          if (user && user.email === email) {
            req.userId = userId;
            req.user = {
              uid: user._id.toString(),
              email: user.email,
              displayName: user.displayName,
            };
            return next();
          }
        }
      }

      // Fallback to Firebase
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

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};
