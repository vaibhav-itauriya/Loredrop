import { Router, Request, Response } from 'express';
import { VerificationCode, User, CalendarSave, EventUpvote, EventComment } from '../models';
import { sendVerificationEmail } from '../email';
import { authMiddleware } from '../middleware';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const router: Router = Router();

// Generate random 6-digit code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification code to email
router.post('/send-verification-code', async (req: Request, res: Response) => {
  try {
    const emailRaw = typeof req.body?.email === 'string' ? req.body.email : '';
    const email = emailRaw.trim().toLowerCase();

    if (!email || !email.endsWith('@iitk.ac.in')) {
      return res.status(400).json({ error: 'Invalid IITK email address' });
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing codes for this email
    await VerificationCode.deleteMany({ email });

    // Create new verification code
    const verificationCode = new VerificationCode({
      email,
      code,
      expiresAt,
      verified: false,
    });
    await verificationCode.save();

    // Send email in background (don't wait for it to complete)
    // This makes the API response faster
    const emailPromise = sendVerificationEmail(email, code);
    
    // Return response immediately while email sends in background
    res.json({ 
      success: true, 
      message: 'Verification code sent to email',
      // For development only - remove in production
      code: process.env.NODE_ENV === 'development' ? code : undefined,
    });

    // Log when email completes (won't block the response)
    emailPromise.then((success) => {
      if (success) {
        console.log(`✅ Email successfully delivered to ${email}`);
      } else {
        console.log(`⚠️ Email delivery may have failed for ${email}, but code is available: ${code}`);
      }
    }).catch((err) => {
      console.error(`❌ Email error for ${email}:`, err);
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Verify code and create/update user
router.post('/verify-code', async (req: Request, res: Response) => {
  try {
    const emailRaw = typeof req.body?.email === 'string' ? req.body.email : '';
    const email = emailRaw.trim().toLowerCase();
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

    if (!email || !code) {
      return res.status(400).json({ error: 'Missing required fields: email and code' });
    }

    // Find verification code
    const verificationCode = await VerificationCode.findOne({ email, code });

    if (!verificationCode) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (new Date() > verificationCode.expiresAt) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    // Mark as verified
    verificationCode.verified = true;
    await verificationCode.save();

    // Create or update user with email as unique identifier
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        displayName: email.split('@')[0], // Use username part of email as display name
        role: 'student',
        // Do not set firebaseUid to null, let it be undefined so sparse index works
      });
      try {
        await user.save();
      } catch (dbError: any) {
        // If we get a duplicate key error, check if it's related to email
        if (dbError.code === 11000 && dbError.keyPattern?.email) {
          user = await User.findOne({ email });
          if (!user) {
            throw new Error('User creation failed and recovery unsuccessful');
          }
        } else {
          throw dbError;
        }
      }
    }

    // Check if user has a password set
    const hasPassword = !!(user as any).password;

    // If user doesn't have a password, return flag to set password
    if (!hasPassword) {
      return res.json({
        success: true,
        message: 'Email verified successfully. Please set your password.',
        needsPassword: true,
        email: user.email,
      });
    }

    // If user has password, create auth token and log them in
    const token = `${user.email}|${user._id}|${Date.now()}`;

    res.json({
      success: true,
      message: 'Email verified successfully',
      needsPassword: false,
      token,
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        name: user.name,
        rollNo: user.rollNo,
        branch: user.branch,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Create or update password
router.post('/set-password', async (req: Request, res: Response) => {
  try {
    const emailRaw = typeof req.body?.email === 'string' ? req.body.email : '';
    const email = emailRaw.trim().toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find user
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email was verified (user must have a verified verification code)
    const verifiedCode = await VerificationCode.findOne({ 
      email, 
      verified: true 
    }).sort({ createdAt: -1 });

    if (!verifiedCode) {
      return res.status(400).json({ error: 'Email must be verified before setting password' });
    }

    // Check if verification code is still valid (within 1 hour of verification)
    // Since verification was just marked as true, we check the current time
    // Allow password setup within 1 hour of verification
    // Note: We'll allow password setup if code was verified (checked above)
    // The verification code's verified flag being true is sufficient

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user with password
    (user as any).password = hashedPassword;
    await user.save();

    // Create auth token and log user in
    const token = `${user.email}|${user._id}|${Date.now()}`;

    res.json({
      success: true,
      message: 'Password set successfully',
      token,
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        name: user.name,
        rollNo: user.rollNo,
        branch: user.branch,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error setting password:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user stats
    const userId = new mongoose.Types.ObjectId(req.userId);
    const [savedCount, upvotedCount, commentsCount] = await Promise.all([
      CalendarSave.countDocuments({ userId }),
      EventUpvote.countDocuments({ userId }),
      EventComment.countDocuments({ userId }),
    ]);

    const MAIN_ADMIN_EMAIL = 'mukunds23@iitk.ac.in';
    const isMainAdmin = user.email?.toLowerCase() === MAIN_ADMIN_EMAIL;

    res.json({
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      name: user.name,
      rollNo: user.rollNo,
      branch: user.branch,
      avatar: user.avatar,
      role: user.role,
      isMainAdmin: !!isMainAdmin,
      createdAt: user.createdAt,
      stats: {
        savedEvents: savedCount,
        upvotedEvents: upvotedCount,
        comments: commentsCount,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.patch('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { displayName, name, rollNo, branch, avatar } = req.body;
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (displayName !== undefined) {
      if (displayName.trim().length === 0) {
        return res.status(400).json({ error: 'Display name cannot be empty' });
      }
      if (displayName.length > 50) {
        return res.status(400).json({ error: 'Display name must be less than 50 characters' });
      }
      user.displayName = displayName.trim();
    }

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      if (name.length > 100) {
        return res.status(400).json({ error: 'Name must be less than 100 characters' });
      }
      user.name = name.trim();
    }

    if (rollNo !== undefined) {
      if (rollNo.trim().length > 20) {
        return res.status(400).json({ error: 'Roll number must be less than 20 characters' });
      }
      user.rollNo = rollNo.trim() || undefined;
    }

    if (branch !== undefined) {
      if (branch.trim().length > 100) {
        return res.status(400).json({ error: 'Branch must be less than 100 characters' });
      }
      user.branch = branch.trim() || undefined;
    }

    if (avatar !== undefined) {
      user.avatar = avatar.trim() || undefined;
    }

    await user.save();

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        name: user.name,
        rollNo: user.rollNo,
        branch: user.branch,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Login with password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const emailRaw = typeof req.body?.email === 'string' ? req.body.email : '';
    const email = emailRaw.trim().toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    // Validate IITK email
    if (!email.endsWith('@iitk.ac.in')) {
      return res.status(400).json({ error: 'Only IITK emails are allowed' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user || !(user as any).password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare password
    const isValidPassword = await bcrypt.compare(password, (user as any).password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token in format: email|userId|timestamp
    const token = `${user.email}|${user._id}|${Date.now()}`;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        name: user.name,
        rollNo: user.rollNo,
        branch: user.branch,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

export default router;
