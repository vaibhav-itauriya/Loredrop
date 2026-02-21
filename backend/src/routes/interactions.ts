import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware';
import { EventUpvote, EventComment, CalendarSave, Notification, Event, User, EventRSVP } from '../models';
import mongoose from 'mongoose';
import { canOrgAction } from '../permissions';
import { logAudit } from '../audit';
import crypto from 'crypto';

const router: Router = Router();

async function promoteWaitlistIfPossible(eventId: mongoose.Types.ObjectId) {
  const event = await Event.findById(eventId);
  if (!event) return null;
  const capacity = typeof (event as any).capacity === 'number' ? Number((event as any).capacity) : null;
  if (!capacity || capacity <= 0) return null;
  if ((event as any).rsvpCount >= capacity) return null;

  const nextWaitlist = await EventRSVP.findOne({ eventId, status: 'waitlist' }).sort({ createdAt: 1 });
  if (!nextWaitlist) return null;
  nextWaitlist.status = 'rsvp';
  await nextWaitlist.save();
  await Event.updateOne({ _id: eventId }, { $inc: { waitlistCount: -1, rsvpCount: 1 } });
  return nextWaitlist;
}

async function createUpcomingEventReminders(userId: mongoose.Types.ObjectId) {
  const now = new Date();
  const reminderWindowEnd = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  const saves = await CalendarSave.find({ userId }).populate('eventId', 'title dateTime');
  const reminderCandidates = saves
    .map((save) => save.eventId as any)
    .filter((event) => {
      if (!event?.dateTime) return false;
      const eventTime = new Date(event.dateTime);
      return eventTime >= now && eventTime <= reminderWindowEnd;
    });

  if (reminderCandidates.length === 0) return;

  const existingReminderEventIds = await Notification.find({
    userId,
    type: 'event_reminder',
    eventId: { $in: reminderCandidates.map((event) => event._id) },
  }).distinct('eventId');

  const existingIdSet = new Set(existingReminderEventIds.map((id) => String(id)));

  const pendingNotifications = reminderCandidates
    .filter((event) => !existingIdSet.has(String(event._id)))
    .map((event) => {
      const hoursUntil = Math.max(1, Math.round((new Date(event.dateTime).getTime() - now.getTime()) / 3600000));
      return {
        userId,
        type: 'event_reminder' as const,
        eventId: event._id,
        message: `Reminder: "${event.title}" is in about ${hoursUntil} hour${hoursUntil === 1 ? '' : 's'}.`,
      };
    });

  if (pendingNotifications.length > 0) {
    await Notification.insertMany(pendingNotifications);
  }
}

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
    await createUpcomingEventReminders(userId);

    const saves = await CalendarSave.find({ userId })
      .populate({
        path: 'eventId',
        populate: [
          { path: 'organizationId', select: 'name logo slug type description' },
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
    await createUpcomingEventReminders(userId);

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

// RSVP / waitlist join/leave
router.post('/rsvp/:eventId', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const eventId = new mongoose.Types.ObjectId(req.params.eventId);
    const userId = new mongoose.Types.ObjectId(req.userId);
    const action = (req.body?.action as 'join' | 'leave' | undefined) || 'join';

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const existing = await EventRSVP.findOne({ eventId, userId });
    if (action === 'leave') {
      if (!existing) {
        return res.json({ status: 'none' });
      }
      if (existing.status === 'rsvp' || existing.status === 'checked_in') {
        await Event.updateOne({ _id: eventId }, { $inc: { rsvpCount: -1 } });
      } else if (existing.status === 'waitlist') {
        await Event.updateOne({ _id: eventId }, { $inc: { waitlistCount: -1 } });
      }
      await EventRSVP.deleteOne({ _id: existing._id });
      const promoted = await promoteWaitlistIfPossible(eventId);
      await logAudit({
        actorUserId: req.userId,
        action: 'rsvp.left',
        entityType: 'rsvp',
        entityId: eventId,
        organizationId: event.organizationId,
        metadata: {
          previousStatus: existing.status,
          promotedUserId: promoted?.userId,
        },
      });
      return res.json({ status: 'none', promotedUserId: promoted?.userId || null });
    }

    if (existing) {
      return res.json({ status: existing.status, checkInToken: existing.checkInToken });
    }

    const capacity = typeof (event as any).capacity === 'number' ? Number((event as any).capacity) : null;
    const seatsFull = !!capacity && capacity > 0 && Number((event as any).rsvpCount || 0) >= capacity;
    const status: 'rsvp' | 'waitlist' = seatsFull ? 'waitlist' : 'rsvp';
    const checkInToken = crypto.randomBytes(8).toString('hex');

    const rsvp = await EventRSVP.create({
      eventId,
      userId,
      status,
      checkInToken,
    });
    if (status === 'rsvp') {
      await Event.updateOne({ _id: eventId }, { $inc: { rsvpCount: 1 } });
    } else {
      await Event.updateOne({ _id: eventId }, { $inc: { waitlistCount: 1 } });
    }

    await logAudit({
      actorUserId: req.userId,
      action: status === 'rsvp' ? 'rsvp.joined' : 'rsvp.waitlisted',
      entityType: 'rsvp',
      entityId: rsvp._id,
      organizationId: event.organizationId,
      metadata: { eventId },
    });

    res.json({ status, checkInToken });
  } catch (error) {
    console.error('RSVP error:', error);
    res.status(500).json({ error: 'Failed to process RSVP' });
  }
});

router.get('/rsvp/:eventId/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const eventId = new mongoose.Types.ObjectId(req.params.eventId);
    const userId = new mongoose.Types.ObjectId(req.userId);
    const [event, rsvp] = await Promise.all([
      Event.findById(eventId).select('capacity rsvpCount waitlistCount'),
      EventRSVP.findOne({ eventId, userId }).select('status checkInToken'),
    ]);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({
      status: rsvp?.status || 'none',
      checkInToken: rsvp?.checkInToken || null,
      capacity: (event as any).capacity ?? null,
      rsvpCount: (event as any).rsvpCount || 0,
      waitlistCount: (event as any).waitlistCount || 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch RSVP status' });
  }
});

router.get('/rsvp/:eventId/list', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const eventId = new mongoose.Types.ObjectId(req.params.eventId);
    const event = await Event.findById(eventId).select('organizationId');
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const permission = await canOrgAction(req.userId, (event as any).organizationId, 'view_rsvp');
    if (!permission.allowed) {
      return res.status(403).json({ error: 'Not allowed to view RSVP list' });
    }
    const list = await EventRSVP.find({ eventId })
      .populate('userId', 'displayName email')
      .sort({ createdAt: 1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch RSVP list' });
  }
});

router.post('/rsvp/:eventId/check-in', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const eventId = new mongoose.Types.ObjectId(req.params.eventId);
    const { token, userId } = req.body || {};
    const event = await Event.findById(eventId).select('organizationId');
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const permission = await canOrgAction(req.userId, (event as any).organizationId, 'check_in');
    if (!permission.allowed) {
      return res.status(403).json({ error: 'Not allowed to check in attendees' });
    }
    let query: any = { eventId };
    if (token) query.checkInToken = token;
    if (userId) query.userId = new mongoose.Types.ObjectId(userId);
    const rsvp = await EventRSVP.findOne(query);
    if (!rsvp) {
      return res.status(404).json({ error: 'RSVP record not found for check-in' });
    }
    if (rsvp.status === 'waitlist') {
      return res.status(400).json({ error: 'Waitlisted attendee cannot be checked in' });
    }
    rsvp.status = 'checked_in';
    rsvp.checkedInAt = new Date();
    await rsvp.save();
    await logAudit({
      actorUserId: req.userId,
      action: 'rsvp.checked_in',
      entityType: 'rsvp',
      entityId: rsvp._id,
      organizationId: (event as any).organizationId,
      metadata: { attendeeUserId: rsvp.userId },
    });
    res.json({ success: true, status: 'checked_in' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check in attendee' });
  }
});

export default router;
