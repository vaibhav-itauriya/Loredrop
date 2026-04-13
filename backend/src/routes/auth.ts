import { Router, Request, Response } from 'express';
import { VerificationCode, User, CalendarSave, EventUpvote, EventComment, EventRSVP, EventFeedback } from '../models';
import { sendVerificationEmail } from '../email';
import { authMiddleware } from '../middleware';
import { signPasswordSetupToken, signSessionToken, verifyPasswordSetupToken } from '../auth-token';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const router: Router = Router();

type AcademicTimetableSlotInput = {
  id?: string;
  title?: string;
  day?: number;
  startTime?: string;
  endTime?: string;
  location?: string;
};

function isValidTimeString(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function normalizeAcademicTimetableSlots(input: unknown) {
  if (!Array.isArray(input)) {
    return { error: 'Academic timetable must be an array' as const };
  }

  const slots = input as AcademicTimetableSlotInput[];
  if (slots.length > 500) {
    return { error: 'Academic timetable is too large' as const };
  }

  const normalized = slots.map((slot, index) => {
    const title = typeof slot?.title === 'string' ? slot.title.trim() : '';
    const location = typeof slot?.location === 'string' ? slot.location.trim() : '';
    const day = typeof slot?.day === 'number' ? slot.day : Number(slot?.day);
    const startTime = typeof slot?.startTime === 'string' ? slot.startTime.trim() : '';
    const endTime = typeof slot?.endTime === 'string' ? slot.endTime.trim() : '';
    const id = typeof slot?.id === 'string' && slot.id.trim() ? slot.id.trim() : `${Date.now()}-${index}`;

    if (!title) {
      throw new Error(`Slot ${index + 1}: title is required`);
    }
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      throw new Error(`Slot ${index + 1}: day must be between 0 and 6`);
    }
    if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) {
      throw new Error(`Slot ${index + 1}: start and end times must use HH:MM format`);
    }
    if (endTime <= startTime) {
      throw new Error(`Slot ${index + 1}: end time must be after start time`);
    }

    return {
      id,
      title,
      day,
      startTime,
      endTime,
      location: location || undefined,
    };
  });

  return { slots: normalized };
}

function deriveBadges(profile: {
  isAlumni?: boolean;
  role?: string;
  points?: number;
  savedEvents?: number;
  upvotedEvents?: number;
  comments?: number;
  checkedInEvents?: number;
}) {
  const badges = new Set<string>();
  if (profile.isAlumni) badges.add('Alumni Network');
  if (profile.role === 'professor') badges.add('Faculty Mentor');
  if ((profile.savedEvents || 0) >= 5) badges.add('Planner');
  if ((profile.upvotedEvents || 0) >= 10) badges.add('Trend Spotter');
  if ((profile.comments || 0) >= 5) badges.add('Conversation Starter');
  if ((profile.checkedInEvents || 0) >= 5) badges.add('Campus Regular');
  if ((profile.points || 0) >= 250) badges.add('Tech Enthusiast');
  return Array.from(badges);
}

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
    const verificationCode = await VerificationCode.findOne({ email, code, verified: false });

    if (!verificationCode) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (new Date() > verificationCode.expiresAt) {
      await VerificationCode.deleteMany({ email });
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

    const verificationToken = signPasswordSetupToken({
      userId: user._id.toString(),
      email: user.email,
    });

    // If user doesn't have a password, return flag to set password
    if (!hasPassword) {
      return res.json({
        success: true,
        message: 'Email verified successfully. Please set your password.',
        needsPassword: true,
        email: user.email,
        verificationToken,
      });
    }

    // If user has password, create auth token and log them in
    const token = signSessionToken({
      userId: user._id.toString(),
      email: user.email,
    });

    res.json({
      success: true,
      message: 'Email verified successfully',
      needsPassword: false,
      token,
      verificationToken,
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
    const verificationToken =
      typeof req.body?.verificationToken === 'string' ? req.body.verificationToken.trim() : '';

    if (!email || !password || !verificationToken) {
      return res.status(400).json({ error: 'Missing email, password, or verification token' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    let decodedVerificationToken;
    try {
      decodedVerificationToken = verifyPasswordSetupToken(verificationToken);
    } catch {
      return res.status(401).json({ error: 'Verification session expired. Please verify email again.' });
    }

    if (decodedVerificationToken.email.toLowerCase() !== email) {
      return res.status(400).json({ error: 'Verification token does not match email' });
    }

    const user = await User.findById(decodedVerificationToken.userId);
    if (!user || user.email.toLowerCase() !== email) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure there was a recent successful email verification for this email.
    const latestVerifiedCode = await VerificationCode.findOne({ email, verified: true }).sort({ updatedAt: -1 });
    if (!latestVerifiedCode) {
      return res.status(400).json({ error: 'Email must be verified before setting password' });
    }

    const latestVerificationAt = new Date((latestVerifiedCode as any).updatedAt || latestVerifiedCode.expiresAt).getTime();
    const verificationWindowMs = 15 * 60 * 1000;
    if (Date.now() - latestVerificationAt > verificationWindowMs) {
      await VerificationCode.deleteMany({ email });
      return res.status(401).json({ error: 'Verification expired. Please verify email again.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user with password
    (user as any).password = hashedPassword;
    await user.save();

    // Consume verification state after successful password update.
    await VerificationCode.deleteMany({ email });

    // Create auth token and log user in
    const token = signSessionToken({
      userId: user._id.toString(),
      email: user.email,
    });

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
    const [savedCount, upvotedCount, commentsCount, checkedInCount, feedbackCount] = await Promise.all([
      CalendarSave.countDocuments({ userId }),
      EventUpvote.countDocuments({ userId }),
      EventComment.countDocuments({ userId }),
      EventRSVP.countDocuments({ userId, status: 'checked_in' }),
      EventFeedback.countDocuments({ userId }),
    ]);

    const MAIN_ADMIN_EMAIL = 'mukunds23@iitk.ac.in';
    const isMainAdmin = user.email?.toLowerCase() === MAIN_ADMIN_EMAIL;
    const points =
      checkedInCount * 25 +
      upvotedCount * 2 +
      commentsCount * 5 +
      savedCount * 3 +
      feedbackCount * 8;
    const badges = deriveBadges({
      isAlumni: user.isAlumni,
      role: user.role,
      points,
      savedEvents: savedCount,
      upvotedEvents: upvotedCount,
      comments: commentsCount,
      checkedInEvents: checkedInCount,
    });

    if ((user.points || 0) !== points || JSON.stringify(user.badges || []) !== JSON.stringify(badges)) {
      user.points = points;
      user.badges = badges;
      await user.save();
    }

    res.json({
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      name: user.name,
      rollNo: user.rollNo,
      branch: user.branch,
      avatar: user.avatar,
      role: user.role,
      academicLevel: user.academicLevel,
      isAlumni: !!user.isAlumni,
      points,
      badges,
      academicTimetable: Array.isArray(user.academicTimetable) ? user.academicTimetable : [],
      fcmTokenCount: Array.isArray(user.fcmTokens) ? user.fcmTokens.length : 0,
      isMainAdmin: !!isMainAdmin,
      createdAt: user.createdAt,
      stats: {
        savedEvents: savedCount,
        upvotedEvents: upvotedCount,
        comments: commentsCount,
        checkedInEvents: checkedInCount,
        feedbackSubmitted: feedbackCount,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.get('/academic-timetable', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('academicTimetable');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      slots: Array.isArray(user.academicTimetable) ? user.academicTimetable : [],
    });
  } catch (error) {
    console.error('Error fetching academic timetable:', error);
    res.status(500).json({ error: 'Failed to fetch academic timetable' });
  }
});

router.put('/academic-timetable', authMiddleware, async (req: Request, res: Response) => {
  try {
    const normalized = normalizeAcademicTimetableSlots(req.body?.slots);
    if ('error' in normalized) {
      return res.status(400).json({ error: normalized.error });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { academicTimetable: normalized.slots } },
      { new: true },
    ).select('academicTimetable');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      slots: user.academicTimetable || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update academic timetable';
    const status = error instanceof Error && /^Slot \d+:/.test(error.message) ? 400 : 500;
    if (status === 500) {
      console.error('Error updating academic timetable:', error);
    }
    res.status(status).json({ error: message });
  }
});

// Update user profile
router.patch('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { displayName, name, rollNo, branch, avatar, academicLevel, isAlumni } = req.body;
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

    if (academicLevel !== undefined) {
      const allowedLevels = ['ug', 'pg', 'phd', 'faculty', 'staff'];
      if (academicLevel && !allowedLevels.includes(academicLevel)) {
        return res.status(400).json({ error: 'Invalid academic level' });
      }
      user.academicLevel = academicLevel || undefined;
    }

    if (isAlumni !== undefined) {
      user.isAlumni = !!isAlumni;
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
        academicLevel: user.academicLevel,
        isAlumni: !!user.isAlumni,
        points: user.points || 0,
        badges: user.badges || [],
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/push-token', authMiddleware, async (req: Request, res: Response) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      return res.status(400).json({ error: 'Push token is required' });
    }
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $addToSet: { fcmTokens: token } },
      { new: true },
    ).select('fcmTokens');
    res.json({ success: true, tokenCount: user?.fcmTokens?.length || 0 });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

router.delete('/push-token', authMiddleware, async (req: Request, res: Response) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      return res.status(400).json({ error: 'Push token is required' });
    }
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $pull: { fcmTokens: token } },
      { new: true },
    ).select('fcmTokens');
    res.json({ success: true, tokenCount: user?.fcmTokens?.length || 0 });
  } catch (error) {
    console.error('Error removing push token:', error);
    res.status(500).json({ error: 'Failed to remove push token' });
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

    // Generate signed session token
    const token = signSessionToken({
      userId: user._id.toString(),
      email: user.email,
    });

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
