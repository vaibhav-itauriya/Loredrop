import { Router, Request, Response } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../middleware';
import { Event, Organization, User, EventUpvote, EventComment, CalendarSave, Notification, OrganizationMember } from '../models';
import mongoose from 'mongoose';

const router: Router = Router();

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
      .populate('organizationId', 'name logo')
      .populate('authorId', 'displayName avatar email')
      .sort({ dateTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(query);

    // Enrich with user interaction data
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        let hasUpvoted = false;
        let hasCalendarSave = false;

        if (req.userId) {
          hasUpvoted = !!(await EventUpvote.exists({
            eventId: event._id,
            userId: new mongoose.Types.ObjectId(req.userId),
          }));

          hasCalendarSave = !!(await CalendarSave.exists({
            eventId: event._id,
            userId: new mongoose.Types.ObjectId(req.userId),
          }));
        }

        return {
          ...event.toObject(),
          hasUpvoted: !!hasUpvoted,
          hasCalendarSave: !!hasCalendarSave,
        };
      })
    );

    res.json({ data: enrichedEvents, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// Search events - MUST be before /:eventId (otherwise "search" is matched as eventId)
router.get('/search', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchRegex = new RegExp(query.trim().replace(/\s+/g, ' '), 'i');

    // Find matching organization IDs first for org name search
    const matchingOrgs = await Organization.find({ name: searchRegex }).select('_id');
    const matchingOrgIds = matchingOrgs.map((o) => o._id);

    const eventQuery: any = {
      isPublished: true,
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        ...(matchingOrgIds.length > 0 ? [{ organizationId: { $in: matchingOrgIds } }] : []),
      ],
    };

    const events = await Event.find(eventQuery)
      .populate('organizationId', 'name logo slug')
      .populate('authorId', 'displayName avatar email')
      .sort({ dateTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(eventQuery);

    // Enrich with user interaction data
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        let hasUpvoted = false;
        let hasCalendarSave = false;
        if (req.userId) {
          hasUpvoted = !!(await EventUpvote.exists({
            eventId: event._id,
            userId: new mongoose.Types.ObjectId(req.userId),
          }));
          hasCalendarSave = !!(await CalendarSave.exists({
            eventId: event._id,
            userId: new mongoose.Types.ObjectId(req.userId),
          }));
        }
        return {
          ...event.toObject(),
          hasUpvoted: !!hasUpvoted,
          hasCalendarSave: !!hasCalendarSave,
        };
      })
    );

    res.json({ data: enrichedEvents, events: enrichedEvents, total, page, pages: Math.ceil(total / limit), limit });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search events' });
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
      .populate('organizationId', 'name logo')
      .populate('authorId', 'displayName email')
      .sort({ dateTime: 1 })
      .limit(limit);

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
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

    if (req.userId) {
      hasUpvoted = !!(await EventUpvote.exists({
        eventId: event._id,
        userId: new mongoose.Types.ObjectId(req.userId),
      }));

      hasCalendarSave = !!(await CalendarSave.exists({
        eventId: event._id,
        userId: new mongoose.Types.ObjectId(req.userId),
      }));
    }

    res.json({
      ...event.toObject(),
      hasUpvoted: !!hasUpvoted,
      hasCalendarSave: !!hasCalendarSave,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create event (authenticated - organization members only)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, description, organizationId, dateTime, endDateTime, venue, mode, tags, audience, media, registrationLink } = req.body;

    if (!title || !description || !organizationId || !dateTime || !venue || !mode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user is a member of the organization with admin or moderator role
    const membership = await OrganizationMember.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      userId: new mongoose.Types.ObjectId(req.userId),
      role: { $in: ['admin', 'moderator'] },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only organization admins and moderators can create events' });
    }

    const event = await Event.create({
      title,
      description,
      organizationId: new mongoose.Types.ObjectId(organizationId),
      authorId: new mongoose.Types.ObjectId(req.userId),
      dateTime: new Date(dateTime),
      endDateTime: endDateTime ? new Date(endDateTime) : undefined,
      venue,
      mode,
      tags: tags || [],
      audience: audience || [],
      media: media || [],
      registrationLink,
      isPublished: true,
      upvoteCount: 0,
      commentCount: 0,
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Get events by organization
router.get('/by-organization/:orgId', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;

    const events = await Event.find({
      organizationId: new mongoose.Types.ObjectId(orgId),
    })
      .populate('organizationId', 'name logo')
      .populate('authorId', 'displayName avatar email')
      .sort({ dateTime: -1 });

    res.json(events);
  } catch (error) {
    console.error('Fetch events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export default router;
