import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware';
import { EventUpvote, EventComment, CalendarSave, Notification, Event, User } from '../models';
import mongoose from 'mongoose';

const router: Router = Router();

// Toggle upvote on event
router.post('/upvote/:eventId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const eventId = new mongoose.Types.ObjectId(req.params.eventId);
    const userId = new mongoose.Types.ObjectId(req.userId);

    const existing = await EventUpvote.findOne({ eventId, userId });

    if (existing) {
      await EventUpvote.deleteOne({ _id: existing._id });
      await Event.updateOne({ _id: eventId }, { $inc: { upvoteCount: -1 } });
      res.json({ upvoted: false });
    } else {
      await EventUpvote.create({ eventId, userId });
      await Event.updateOne({ _id: eventId }, { $inc: { upvoteCount: 1 } });
      res.json({ upvoted: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle upvote' });
  }
});

// Check if user has upvoted event
router.get('/upvote/:eventId/check', authMiddleware, async (req: Request, res: Response) => {
  try {
    const eventId = new mongoose.Types.ObjectId(req.params.eventId);
    const userId = new mongoose.Types.ObjectId(req.userId);

    const hasUpvoted = await EventUpvote.exists({ eventId, userId });
    res.json({ hasUpvoted: !!hasUpvoted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check upvote' });
  }
});

// Add comment
router.post('/comments/:eventId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const eventId = new mongoose.Types.ObjectId(req.params.eventId);
    const userId = new mongoose.Types.ObjectId(req.userId);

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text required' });
    }

    const comment = await EventComment.create({ eventId, userId, text });
    await Event.updateOne({ _id: eventId }, { $inc: { commentCount: 1 } });

    const populatedComment = await EventComment.findById(comment._id).populate('userId', 'displayName avatar');
    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get comments for event
router.get('/comments/:eventId', async (req: Request, res: Response) => {
  try {
    const eventId = new mongoose.Types.ObjectId(req.params.eventId);

    const comments = await EventComment.find({ eventId })
      .populate('userId', 'displayName avatar email')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Toggle calendar save
router.post('/calendar/:eventId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const eventId = new mongoose.Types.ObjectId(req.params.eventId);
    const userId = new mongoose.Types.ObjectId(req.userId);

    const existing = await CalendarSave.findOne({ eventId, userId });

    if (existing) {
      await CalendarSave.deleteOne({ _id: existing._id });
      res.json({ saved: false });
    } else {
      await CalendarSave.create({ eventId, userId });
      res.json({ saved: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle calendar save' });
  }
});

// Check if event is saved to calendar
router.get('/calendar/:eventId/check', authMiddleware, async (req: Request, res: Response) => {
  try {
    const eventId = new mongoose.Types.ObjectId(req.params.eventId);
    const userId = new mongoose.Types.ObjectId(req.userId);

    const hasSaved = await CalendarSave.exists({ eventId, userId });
    res.json({ saved: !!hasSaved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check calendar save' });
  }
});

// Get user's calendar saves
router.get('/calendar/saved/all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const saves = await CalendarSave.find({ userId })
      .populate({
        path: 'eventId',
        populate: [
          { path: 'organizationId', select: 'name logo' },
          { path: 'authorId', select: 'displayName avatar' },
        ],
      })
      .sort({ savedAt: -1 });

    res.json(saves);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calendar saves' });
  }
});

// Get notifications
router.get('/notifications', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const notifications = await Notification.find({ userId })
      .populate('fromUserId', 'displayName avatar')
      .populate('eventId', 'title')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/notifications/:notificationId/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    await Notification.updateOne({ _id: req.params.notificationId }, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.patch('/notifications/read/all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    await Notification.updateMany({ userId, read: false }, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

export default router;
