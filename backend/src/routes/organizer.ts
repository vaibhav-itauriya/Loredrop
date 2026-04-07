import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware';
import {
  OrganizerTask,
  OrganizationMember,
  Event,
  EventRSVP,
  EventFeedback,
  User,
  Notification,
  ChatChannel,
  ChatMessage,
} from '../models';
import { canOrgAction } from '../permissions';

const router: Router = Router();

async function ensureOrgAccess(userId: string, organizationId: string, action: 'manage_tasks' | 'view_analytics' | 'manage_chat') {
  return canOrgAction(userId, organizationId, action);
}

async function canAccessChannel(userId: string, channel: any) {
  if (channel.type === 'organization' && channel.organizationId) {
    const membership = await OrganizationMember.exists({
      organizationId: channel.organizationId,
      userId: new mongoose.Types.ObjectId(userId),
    });
    return !!membership;
  }

  if (channel.type === 'event' && channel.eventId) {
    const [membership, rsvp] = await Promise.all([
      channel.organizationId
        ? OrganizationMember.exists({
            organizationId: channel.organizationId,
            userId: new mongoose.Types.ObjectId(userId),
          })
        : Promise.resolve(null),
      EventRSVP.exists({
        eventId: channel.eventId,
        userId: new mongoose.Types.ObjectId(userId),
      }),
    ]);
    return !!membership || !!rsvp;
  }

  return false;
}

router.get('/organization/:orgId/tasks', authMiddleware, async (req: Request, res: Response) => {
  try {
    const permission = await ensureOrgAccess(req.userId!, req.params.orgId, 'manage_tasks');
    if (!permission.allowed) {
      return res.status(403).json({ error: 'Not allowed to manage organizer tasks' });
    }

    const query: any = { organizationId: new mongoose.Types.ObjectId(req.params.orgId) };
    if (req.query.eventId) {
      query.eventId = new mongoose.Types.ObjectId(String(req.query.eventId));
    }

    const tasks = await OrganizerTask.find(query)
      .populate('assignedToUserId', 'displayName email')
      .populate('createdByUserId', 'displayName email')
      .sort({ dueDate: 1, createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Failed to fetch organizer tasks:', error);
    res.status(500).json({ error: 'Failed to fetch organizer tasks' });
  }
});

router.get('/organization/:orgId/members', authMiddleware, async (req: Request, res: Response) => {
  try {
    const permission = await ensureOrgAccess(req.userId!, req.params.orgId, 'manage_tasks');
    if (!permission.allowed) {
      return res.status(403).json({ error: 'Not allowed to view organization members' });
    }

    const members = await OrganizationMember.find({
      organizationId: new mongoose.Types.ObjectId(req.params.orgId),
    })
      .populate('userId', 'displayName email avatar')
      .sort({ role: 1, joinedAt: 1 });

    const normalized = members.map((member: any) => ({
      _id: String(member._id),
      role: member.role,
      joinedAt: member.joinedAt,
      user: member.userId
        ? {
            _id: String(member.userId._id),
            displayName: member.userId.displayName || '',
            email: member.userId.email || '',
            avatar: member.userId.avatar || '',
          }
        : null,
    }));

    res.json(normalized);
  } catch (error) {
    console.error('Failed to fetch organization members:', error);
    res.status(500).json({ error: 'Failed to fetch organization members' });
  }
});

router.post('/organization/:orgId/tasks', authMiddleware, async (req: Request, res: Response) => {
  try {
    const permission = await ensureOrgAccess(req.userId!, req.params.orgId, 'manage_tasks');
    if (!permission.allowed) {
      return res.status(403).json({ error: 'Not allowed to create organizer tasks' });
    }

    const {
      title,
      description,
      status = 'todo',
      category = 'planning',
      assignedToUserId,
      budgetAmount,
      inventoryItems = [],
      dueDate,
      eventId,
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const task = await OrganizerTask.create({
      organizationId: new mongoose.Types.ObjectId(req.params.orgId),
      eventId: eventId ? new mongoose.Types.ObjectId(eventId) : undefined,
      title: String(title).trim(),
      description: description ? String(description).trim() : undefined,
      status,
      category,
      assignedToUserId: assignedToUserId ? new mongoose.Types.ObjectId(assignedToUserId) : undefined,
      budgetAmount: typeof budgetAmount === 'number' ? budgetAmount : undefined,
      inventoryItems: Array.isArray(inventoryItems)
        ? inventoryItems.map((item) => String(item).trim()).filter(Boolean)
        : [],
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdByUserId: new mongoose.Types.ObjectId(req.userId),
    });

    const populated = await OrganizerTask.findById(task._id)
      .populate('assignedToUserId', 'displayName email')
      .populate('createdByUserId', 'displayName email');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Failed to create organizer task:', error);
    res.status(500).json({ error: 'Failed to create organizer task' });
  }
});

router.patch('/tasks/:taskId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const task = await OrganizerTask.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const permission = await ensureOrgAccess(req.userId!, String(task.organizationId), 'manage_tasks');
    if (!permission.allowed) {
      return res.status(403).json({ error: 'Not allowed to update organizer tasks' });
    }

    const update: any = {};
    const fields = ['title', 'description', 'status', 'category'];
    for (const field of fields) {
      if (req.body?.[field] !== undefined) {
        update[field] = req.body[field];
      }
    }
    if (req.body?.assignedToUserId !== undefined) {
      update.assignedToUserId = req.body.assignedToUserId ? new mongoose.Types.ObjectId(req.body.assignedToUserId) : undefined;
    }
    if (req.body?.budgetAmount !== undefined) {
      update.budgetAmount = req.body.budgetAmount;
    }
    if (req.body?.dueDate !== undefined) {
      update.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : undefined;
    }
    if (req.body?.inventoryItems !== undefined) {
      update.inventoryItems = Array.isArray(req.body.inventoryItems)
        ? req.body.inventoryItems.map((item: unknown) => String(item).trim()).filter(Boolean)
        : [];
    }

    const updated = await OrganizerTask.findByIdAndUpdate(task._id, { $set: update }, { new: true })
      .populate('assignedToUserId', 'displayName email')
      .populate('createdByUserId', 'displayName email');
    res.json(updated);
  } catch (error) {
    console.error('Failed to update organizer task:', error);
    res.status(500).json({ error: 'Failed to update organizer task' });
  }
});

router.delete('/tasks/:taskId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const task = await OrganizerTask.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const permission = await ensureOrgAccess(req.userId!, String(task.organizationId), 'manage_tasks');
    if (!permission.allowed) {
      return res.status(403).json({ error: 'Not allowed to delete organizer tasks' });
    }

    await OrganizerTask.deleteOne({ _id: task._id });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete organizer task:', error);
    res.status(500).json({ error: 'Failed to delete organizer task' });
  }
});

router.get('/organization/:orgId/analytics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const permission = await ensureOrgAccess(req.userId!, req.params.orgId, 'view_analytics');
    if (!permission.allowed) {
      return res.status(403).json({ error: 'Not allowed to view analytics' });
    }

    const organizationId = new mongoose.Types.ObjectId(req.params.orgId);
    const events = await Event.find({ organizationId }).select('_id title dateTime audience upvoteCount commentCount rsvpCount waitlistCount');
    const eventIds = events.map((event) => event._id);

    const [rsvps, feedback, tasks] = await Promise.all([
      EventRSVP.find({ eventId: { $in: eventIds } }).populate('userId', 'academicLevel role isAlumni'),
      EventFeedback.find({ eventId: { $in: eventIds } }),
      OrganizerTask.find({ organizationId }),
    ]);

    const checkedIn = rsvps.filter((item) => item.status === 'checked_in');
    const audienceBreakdown = {
      ug: 0,
      pg: 0,
      phd: 0,
      faculty: 0,
      staff: 0,
      alumni: 0,
      unknown: 0,
    };

    for (const rsvp of checkedIn) {
      const attendee = rsvp.userId as any;
      if (attendee?.isAlumni) audienceBreakdown.alumni += 1;
      const level = attendee?.academicLevel;
      if (level && Object.prototype.hasOwnProperty.call(audienceBreakdown, level)) {
        (audienceBreakdown as any)[level] += 1;
      } else {
        audienceBreakdown.unknown += 1;
      }
    }

    const hourlyEngagement = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: events.filter((event) => new Date(event.dateTime).getHours() === hour).length,
    }));

    const eventSummaries = events.map((event) => {
      const eventRsvps = rsvps.filter((item) => String(item.eventId) === String(event._id));
      const eventCheckIns = eventRsvps.filter((item) => item.status === 'checked_in').length;
      const eventFeedback = feedback.filter((item) => String(item.eventId) === String(event._id));
      const averageRating = eventFeedback.length
        ? eventFeedback.reduce((sum, item) => sum + item.rating, 0) / eventFeedback.length
        : 0;

      return {
        eventId: event._id,
        title: event.title,
        dateTime: event.dateTime,
        rsvps: eventRsvps.length,
        checkedIn: eventCheckIns,
        conversionRate: eventRsvps.length ? Math.round((eventCheckIns / eventRsvps.length) * 100) : 0,
        waitlistCount: event.waitlistCount || 0,
        upvoteCount: event.upvoteCount || 0,
        commentCount: event.commentCount || 0,
        averageRating: Number(averageRating.toFixed(1)),
      };
    });

    const totalBudget = tasks.reduce((sum, task) => sum + (task.budgetAmount || 0), 0);
    const inventoryItems = tasks.flatMap((task) => task.inventoryItems || []);

    res.json({
      summary: {
        totalEvents: events.length,
        totalRsvps: rsvps.length,
        totalCheckedIn: checkedIn.length,
        conversionRate: rsvps.length ? Math.round((checkedIn.length / rsvps.length) * 100) : 0,
        averageRating: feedback.length
          ? Number((feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(1))
          : 0,
        feedbackResponses: feedback.length,
        totalBudget,
        inventoryTracked: inventoryItems.length,
      },
      audienceBreakdown,
      hourlyEngagement,
      taskBoard: {
        todo: tasks.filter((task) => task.status === 'todo').length,
        inProgress: tasks.filter((task) => task.status === 'in_progress').length,
        done: tasks.filter((task) => task.status === 'done').length,
      },
      eventSummaries,
    });
  } catch (error) {
    console.error('Failed to fetch organizer analytics:', error);
    res.status(500).json({ error: 'Failed to fetch organizer analytics' });
  }
});

router.get('/feedback/pending', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const checkedIn = await EventRSVP.find({ userId, status: 'checked_in' }).select('eventId checkedInAt');
    const eventIds = checkedIn.map((item) => item.eventId);
    const existing = await EventFeedback.find({ userId, eventId: { $in: eventIds } }).distinct('eventId');
    const submittedSet = new Set(existing.map((id) => String(id)));
    const events = await Event.find({
      _id: { $in: eventIds.filter((id) => !submittedSet.has(String(id))) },
      dateTime: { $lte: new Date() },
    }).select('title dateTime venue organizationId').populate('organizationId', 'name');

    res.json(events);
  } catch (error) {
    console.error('Failed to fetch pending feedback:', error);
    res.status(500).json({ error: 'Failed to fetch pending feedback' });
  }
});

router.post('/feedback/:eventId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const eventId = new mongoose.Types.ObjectId(req.params.eventId);
    const userId = new mongoose.Types.ObjectId(req.userId);
    const rating = Number(req.body?.rating);
    const feedback = typeof req.body?.feedback === 'string' ? req.body.feedback.trim() : '';

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const rsvp = await EventRSVP.findOne({ eventId, userId, status: 'checked_in' });
    if (!rsvp) {
      return res.status(403).json({ error: 'Only checked-in attendees can submit feedback' });
    }

    const saved = await EventFeedback.findOneAndUpdate(
      { eventId, userId },
      { $set: { rating, feedback, submittedAt: new Date() } },
      { upsert: true, new: true },
    );

    await Notification.deleteMany({
      userId,
      eventId,
      type: 'feedback_request',
    });

    res.json(saved);
  } catch (error) {
    console.error('Failed to submit event feedback:', error);
    res.status(500).json({ error: 'Failed to submit event feedback' });
  }
});

router.get('/event/:eventId/feedback', authMiddleware, async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.eventId).select('organizationId');
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const permission = await ensureOrgAccess(req.userId!, String(event.organizationId), 'view_analytics');
    if (!permission.allowed) {
      return res.status(403).json({ error: 'Not allowed to view event feedback' });
    }

    const feedback = await EventFeedback.find({ eventId: event._id })
      .populate('userId', 'displayName academicLevel isAlumni')
      .sort({ submittedAt: -1 });

    res.json(feedback);
  } catch (error) {
    console.error('Failed to fetch event feedback:', error);
    res.status(500).json({ error: 'Failed to fetch event feedback' });
  }
});

router.get('/organization/:orgId/channels', authMiddleware, async (req: Request, res: Response) => {
  try {
    const permission = await ensureOrgAccess(req.userId!, req.params.orgId, 'manage_chat');
    if (!permission.allowed) {
      return res.status(403).json({ error: 'Not allowed to access organization channels' });
    }

    const orgId = new mongoose.Types.ObjectId(req.params.orgId);
    const channels = await ChatChannel.find({
      $or: [{ organizationId: orgId }, { eventId: { $in: await Event.find({ organizationId: orgId }).distinct('_id') } }],
    }).sort({ updatedAt: -1 });

    res.json(channels);
  } catch (error) {
    console.error('Failed to fetch channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

router.post('/organization/:orgId/channels', authMiddleware, async (req: Request, res: Response) => {
  try {
    const permission = await ensureOrgAccess(req.userId!, req.params.orgId, 'manage_chat');
    if (!permission.allowed) {
      return res.status(403).json({ error: 'Not allowed to create channels' });
    }

    const { name, type = 'organization', eventId } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    const organizationId = new mongoose.Types.ObjectId(req.params.orgId);
    let resolvedEventId: mongoose.Types.ObjectId | undefined;
    if (type === 'event') {
      if (!eventId) {
        return res.status(400).json({ error: 'eventId is required for event channels' });
      }

      const event = await Event.findById(eventId).select('_id organizationId');
      if (!event || String(event.organizationId) !== String(req.params.orgId)) {
        return res.status(400).json({ error: 'Invalid event for this organization' });
      }
      resolvedEventId = new mongoose.Types.ObjectId(String(event._id));

      const existingEventChannel = await ChatChannel.findOne({
        eventId: resolvedEventId,
        type: 'event',
      }).select('_id');
      if (existingEventChannel) {
        return res.status(409).json({ error: 'An event channel already exists for this event' });
      }
    }

    const channel = await ChatChannel.create({
      organizationId,
      eventId: resolvedEventId,
      type,
      name: String(name).trim(),
      createdByUserId: new mongoose.Types.ObjectId(req.userId),
    });

    res.status(201).json(channel);
  } catch (error) {
    console.error('Failed to create channel:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

router.get('/channels/:channelId/messages', authMiddleware, async (req: Request, res: Response) => {
  try {
    const channel = await ChatChannel.findById(req.params.channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const allowed = await canAccessChannel(req.userId!, channel);
    if (!allowed) {
      return res.status(403).json({ error: 'Not allowed to access this channel' });
    }

    const messages = await ChatMessage.find({ channelId: channel._id })
      .populate('userId', 'displayName avatar email isAlumni')
      .sort({ createdAt: 1 })
      .limit(200);

    res.json(messages);
  } catch (error) {
    console.error('Failed to fetch channel messages:', error);
    res.status(500).json({ error: 'Failed to fetch channel messages' });
  }
});

router.post('/channels/:channelId/messages', authMiddleware, async (req: Request, res: Response) => {
  try {
    const channel = await ChatChannel.findById(req.params.channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const allowed = await canAccessChannel(req.userId!, channel);
    if (!allowed) {
      return res.status(403).json({ error: 'Not allowed to post to this channel' });
    }

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const created = await ChatMessage.create({
      channelId: channel._id,
      userId: new mongoose.Types.ObjectId(req.userId),
      message,
    });

    await ChatChannel.updateOne({ _id: channel._id }, { $set: { updatedAt: new Date() } });

    const populated = await ChatMessage.findById(created._id).populate('userId', 'displayName avatar email isAlumni');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Failed to post channel message:', error);
    res.status(500).json({ error: 'Failed to post channel message' });
  }
});

export default router;
