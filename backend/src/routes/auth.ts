import { Router, Request, Response } from 'express';
import { VerificationCode, User } from '../models';
import { sendVerificationEmail } from '../email';
import bcrypt from 'bcryptjs';

const router: Router = Router();

// Generate random 6-digit code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification code to email
router.post('/send-verification-code', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

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
    const { email, code } = req.body;

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

    // Create auth token in format: email|userId|timestamp
    const token = `${user.email}|${user._id}|${Date.now()}`;

    res.json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
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
    const { email, password } = req.body;

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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user with password (add to model if needed)
    (user as any).password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password set successfully',
    });
  } catch (error) {
    console.error('Error setting password:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

// Login with password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

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
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

export default router;
