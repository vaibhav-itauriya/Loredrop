import { Router, Request, Response } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../middleware';
import { Event, Organization, User, EventUpvote, EventComment, CalendarSave, Notification, OrganizationMember, EventRSVP } from '../models';
import mongoose from 'mongoose';
import { canOrgAction } from '../permissions';
import { logAudit } from '../audit';

// Notify all eligible users when an event is published (all users except author for now)
async function notifyEligibleUsersOnPublish(event: any) {
  try {
    const authorId = event.authorId?.toString?.() || event.authorId;
    const allUsers = await User.find({ _id: { $ne: authorId } }).select('_id');
    const org = await Organization.findById(event.organizationId).select('name');
    const orgName = (org as any)?.name || 'An organization';
    const message = `New event: "${event.title}" from ${orgName}`;
    const notifications = allUsers.map((u: any) => ({
      userId: u._id,
      type: 'new_org_event' as const,
      eventId: event._id,
      message,
      read: false,
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (err) {
    console.error('Failed to send event publish notifications:', err);
  }
}

const router: Router = Router();

function buildRecurringDates(
  baseDate: Date,
  recurrence?: { frequency?: 'weekly' | 'monthly'; interval?: number; count?: number; until?: string },
) {
  if (!recurrence || !recurrence.frequency) return [baseDate];
  const interval = Math.max(1, Number(recurrence.interval || 1));
  const count = Math.max(1, Math.min(52, Number(recurrence.count || 1)));
  const until = recurrence.until ? new Date(recurrence.until) : null;
  const dates: Date[] = [baseDate];
  let cursor = new Date(baseDate);

  for (let i = 1; i < count; i++) {
    cursor = new Date(cursor);
    if (recurrence.frequency === 'weekly') {
      cursor.setDate(cursor.getDate() + 7 * interval);
    } else {
      cursor.setMonth(cursor.getMonth() + interval);
    }
    if (until && cursor > until) break;
    dates.push(new Date(cursor));
  }

  return dates;
}

function buildEventIcs(event: any) {
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const dtStart = new Date(event.dateTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const endDate = event.endDateTime ? new Date(event.endDateTime) : new Date(new Date(event.dateTime).getTime() + 60 * 60 * 1000);
  const dtEnd = endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const safe = (v?: string) => (v || '').replace(/\r?\n/g, ' ').replace(/,/g, '\\,');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LoreDrop//Events//EN',
    'BEGIN:VEVENT',
    `UID:${event._id}@loredrop`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${safe(event.title)}`,
    `DESCRIPTION:${safe(event.description)}`,
    `LOCATION:${safe(event.venue)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// Get feed events (paginated, with optional filters)
router.get('/feed', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const organizationId = req.query.organizationId as string;

    let query: any = { isPublished: true };

    if (organizationId) {
      query.organizationId = new mongoose.Types.ObjectId(organizationId);
    }

    const events = await Event.find(query)
      .populate('organizationId', 'name logo slug type description')
      .populate('authorId', 'displayName avatar email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(query);

    // Enrich with user interaction data
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        let hasUpvoted = false;
        let hasCalendarSave = false;
        let rsvpStatus: 'none' | 'rsvp' | 'waitlist' | 'checked_in' = 'none';

        if (req.userId) {
          hasUpvoted = !!(await EventUpvote.exists({
            eventId: event._id,
            userId: new mongoose.Types.ObjectId(req.userId),
          }));

          hasCalendarSave = !!(await CalendarSave.exists({
            eventId: event._id,
            userId: new mongoose.Types.ObjectId(req.userId),
          }));
          const rsvp = await EventRSVP.findOne({
            eventId: event._id,
            userId: new mongoose.Types.ObjectId(req.userId),
          }).select('status');
          rsvpStatus = (rsvp as any)?.status || 'none';
        }

        return {
          ...event.toObject(),
          hasUpvoted: !!hasUpvoted,
          hasCalendarSave: !!hasCalendarSave,
          rsvpStatus,
        };
      })
    );

    res.json({ data: enrichedEvents, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// Get upcoming events
router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const now = new Date();

    const events = await Event.find({
      isPublished: true,
      dateTime: { $gte: now },
    })
      .populate('organizationId', 'name logo slug type description')
      .populate('authorId', 'displayName email')
      .sort({ dateTime: 1 })
      .limit(limit);

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// Calendar range for month/week/day UIs
router.get('/calendar/range', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const start = req.query.start ? new Date(String(req.query.start)) : new Date();
    const end = req.query.end ? new Date(String(req.query.end)) : new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
    const organizationId = req.query.organizationId as string | undefined;
    const query: any = {
      isPublished: true,
      dateTime: { $gte: start, $lte: end },
    };
    if (organizationId) {
      query.organizationId = new mongoose.Types.ObjectId(organizationId);
    }

    const events = await Event.find(query)
      .populate('organizationId', 'name slug type')
      .populate('authorId', 'displayName')
      .sort({ dateTime: 1 });

    const withColor = events.map((event: any) => {
      const orgId = String(event.organizationId?._id || '');
      const hash = orgId.split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0);
      const hue = hash % 360;
      return {
        ...event.toObject(),
        calendarColor: `hsl(${hue} 70% 45%)`,
      };
    });

    res.json(withColor);
  } catch (error) {
    console.error('Calendar range error:', error);
    res.status(500).json({ error: 'Failed to fetch calendar range' });
  }
});

// Export single event as ICS
router.get('/:eventId/ics', async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const ics = buildEventIcs(event);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="event-${event._id}.ics"`);
    res.send(ics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export calendar event' });
  }
});

// Get single event
router.get('/:eventId', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate('organizationId')
      .populate('authorId', 'displayName avatar email');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    let hasUpvoted = false;
    let hasCalendarSave = false;
    let rsvpStatus: 'none' | 'rsvp' | 'waitlist' | 'checked_in' = 'none';

    if (req.userId) {
      hasUpvoted = !!(await EventUpvote.exists({
        eventId: event._id,
        userId: new mongoose.Types.ObjectId(req.userId),
      }));

      hasCalendarSave = !!(await CalendarSave.exists({
        eventId: event._id,
        userId: new mongoose.Types.ObjectId(req.userId),
      }));
      const rsvp = await EventRSVP.findOne({
        eventId: event._id,
        userId: new mongoose.Types.ObjectId(req.userId),
      }).select('status');
      rsvpStatus = (rsvp as any)?.status || 'none';
    }

    res.json({
      ...event.toObject(),
      hasUpvoted: !!hasUpvoted,
      hasCalendarSave: !!hasCalendarSave,
      rsvpStatus,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create event (authenticated - organization members only)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, description, organizationId, dateTime, endDateTime, venue, location, mode, tags, audience, media, registrationLink, allowTimeConflict, recurrence, capacity } = req.body;
    const venueValue = venue || location || '';
    const modeValue = mode || 'offline';

    if (!title || !description || !organizationId || !dateTime || !venueValue) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const createPermission = await canOrgAction(req.userId, organizationId, 'create_event');
    if (!createPermission.allowed) {
      return res.status(403).json({ error: 'You are not allowed to create events for this organization' });
    }

    const requestedDateTime = new Date(dateTime);
    const recurringDates = buildRecurringDates(requestedDateTime, recurrence);
    const conflicts = await Promise.all(
      recurringDates.map(async (candidateDate) => {
        const found = await Event.exists({
          organizationId: new mongoose.Types.ObjectId(organizationId),
          dateTime: candidateDate,
          isPublished: true,
        });
        return found ? candidateDate.toISOString() : null;
      })
    );
    const conflictingDates = conflicts.filter(Boolean);

    if (conflictingDates.length > 0 && !allowTimeConflict) {
      return res.status(409).json({
        error: 'Another event already exists at one or more selected date/time slots',
        code: 'EVENT_TIME_CONFLICT',
        conflictingDates,
      });
    }

    const firstEvent = await Event.create({
      title,
      description,
      organizationId: new mongoose.Types.ObjectId(organizationId),
      authorId: new mongoose.Types.ObjectId(req.userId),
      dateTime: requestedDateTime,
      endDateTime: endDateTime ? new Date(endDateTime) : undefined,
      venue: venueValue,
      mode: modeValue,
      capacity: typeof capacity === 'number' ? capacity : undefined,
      rsvpCount: 0,
      waitlistCount: 0,
      tags: tags || [],
      audience: audience || [],
      media: media || [],
      registrationLink,
      recurrence: recurrence?.frequency
        ? {
            frequency: recurrence.frequency,
            interval: Math.max(1, Number(recurrence.interval || 1)),
            count: recurrence.count ? Number(recurrence.count) : undefined,
            until: recurrence.until ? new Date(recurrence.until) : undefined,
            occurrenceIndex: 0,
          }
        : undefined,
      isPublished: true,
      upvoteCount: 0,
      commentCount: 0,
    });

    await Event.updateOne({ _id: firstEvent._id }, { $set: { seriesId: firstEvent._id } });

    const createdEvents = [firstEvent];
    if (recurringDates.length > 1) {
      const additionalDocs = recurringDates.slice(1).map((candidateDate, index) => ({
        title,
        description,
        organizationId: new mongoose.Types.ObjectId(organizationId),
        authorId: new mongoose.Types.ObjectId(req.userId),
        dateTime: candidateDate,
        endDateTime: endDateTime ? new Date(endDateTime) : undefined,
        venue: venueValue,
        mode: modeValue,
        capacity: typeof capacity === 'number' ? capacity : undefined,
        rsvpCount: 0,
        waitlistCount: 0,
        tags: tags || [],
        audience: audience || [],
        media: media || [],
        registrationLink,
        recurrence: recurrence?.frequency
          ? {
              frequency: recurrence.frequency,
              interval: Math.max(1, Number(recurrence.interval || 1)),
              count: recurrence.count ? Number(recurrence.count) : undefined,
              until: recurrence.until ? new Date(recurrence.until) : undefined,
              occurrenceIndex: index + 1,
            }
          : undefined,
        seriesId: firstEvent._id,
        isPublished: true,
        upvoteCount: 0,
        commentCount: 0,
      }));
      if (additionalDocs.length > 0) {
        const others = await Event.insertMany(additionalDocs);
        createdEvents.push(...others);
      }
    }

    // Notify all eligible users when event is published
    notifyEligibleUsersOnPublish(firstEvent).catch(() => {});
    await logAudit({
      actorUserId: req.userId,
      action: 'event.created',
      entityType: 'event',
      entityId: firstEvent._id,
      organizationId,
      metadata: {
        role: createPermission.role,
        recurringCount: createdEvents.length,
      },
    });

    res.status(201).json({
      ...firstEvent.toObject(),
      recurringInstancesCreated: createdEvents.length,
      seriesId: firstEvent._id,
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event (authenticated - organization admin only, and must be author)
router.patch('/:eventId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const permission = await canOrgAction(req.userId, event.organizationId, 'edit_event');
    const isAuthor = event.authorId.toString() === req.userId;
    if (!permission.allowed && !isAuthor) {
      return res.status(403).json({ error: 'You are not allowed to edit this event' });
    }

    const { title, description, dateTime, endDateTime, venue, location, mode, tags, audience, media, registrationLink, isPublished } = req.body;
    const update: any = {};

    if (title) update.title = title;
    if (description) update.description = description;
    if (dateTime) update.dateTime = new Date(dateTime);
    if (endDateTime !== undefined) update.endDateTime = endDateTime ? new Date(endDateTime) : undefined;
    if (venue || location) update.venue = venue || location;
    if (mode) update.mode = mode;
    if (tags) update.tags = tags;
    if (audience) update.audience = audience;
    if (media) update.media = media;
    if (registrationLink !== undefined) update.registrationLink = registrationLink;
    if (isPublished !== undefined) update.isPublished = isPublished;

    const updated = await Event.findByIdAndUpdate(event._id, { $set: update }, { new: true });
    await logAudit({
      actorUserId: req.userId,
      action: 'event.updated',
      entityType: 'event',
      entityId: event._id,
      organizationId: event.organizationId,
      metadata: {
        role: permission.role,
        updatedFields: Object.keys(update),
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Get events by organization
router.get('/by-organization/:orgId', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;

    const events = await Event.find({
      organizationId: new mongoose.Types.ObjectId(orgId),
      isPublished: true,
    })
      .populate('organizationId', 'name logo slug type description')
      .populate('authorId', 'displayName avatar email')
      .sort({ dateTime: -1 });

    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        let hasUpvoted = false;
        let hasCalendarSave = false;
        let rsvpStatus: 'none' | 'rsvp' | 'waitlist' | 'checked_in' = 'none';
        if (req.userId) {
          hasUpvoted = !!(await EventUpvote.exists({
            eventId: event._id,
            userId: new mongoose.Types.ObjectId(req.userId),
          }));
          hasCalendarSave = !!(await CalendarSave.exists({
            eventId: event._id,
            userId: new mongoose.Types.ObjectId(req.userId),
          }));
          const rsvp = await EventRSVP.findOne({
            eventId: event._id,
            userId: new mongoose.Types.ObjectId(req.userId),
          }).select('status');
          rsvpStatus = (rsvp as any)?.status || 'none';
        }
        return {
          ...event.toObject(),
          hasUpvoted: !!hasUpvoted,
          hasCalendarSave: !!hasCalendarSave,
          rsvpStatus,
        };
      })
    );

    res.json(enrichedEvents);
  } catch (error) {
    console.error('Fetch events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export default router;
