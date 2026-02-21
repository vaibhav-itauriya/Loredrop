import { Router, Request, Response } from 'express';
import { Organization, OrganizationMember, User, Event, CalendarSave, EventUpvote, EventComment, EventRSVP, AuditLog } from '../models';
import { authMiddleware } from '../middleware';
import mongoose from 'mongoose';
import { logAudit } from '../audit';

const router: Router = Router();
const MAIN_ADMIN_EMAIL = 'mukunds23@iitk.ac.in';

async function isMainAdmin(userId: string) {
  const user = await User.findById(userId).select('email');
  const email = (user as any)?.email?.toLowerCase?.() || '';
  return email === MAIN_ADMIN_EMAIL;
}

// Get all organizations
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizations = await Organization.find().sort({ name: 1 });
    res.json(organizations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Main admin: list organization admins
router.get('/main-admin/organization-admins', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const allowed = await isMainAdmin(req.userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Only main admin can manage organization admins' });
    }

    const organizations = await Organization.find({})
      .select('_id name slug')
      .sort({ name: 1 });

    const adminMemberships = await OrganizationMember.find({ role: { $in: ['owner', 'admin'] } })
      .populate('organizationId', '_id name slug')
      .populate('userId', '_id displayName email');

    const adminsByOrgId = new Map<string, any[]>();
    for (const membership of adminMemberships) {
      const org = membership.organizationId as any;
      const user = membership.userId as any;
      if (!org?._id || !user?._id) continue;
      const key = org._id.toString();
      if (!adminsByOrgId.has(key)) adminsByOrgId.set(key, []);
      adminsByOrgId.get(key)!.push({
        membershipId: membership._id,
        userId: user._id,
        name: user.displayName || user.email || 'Unknown',
        email: user.email || '',
        role: membership.role,
        joinedAt: membership.joinedAt,
      });
    }

    const payload = organizations.map((org: any) => ({
      organizationId: org._id,
      organizationName: org.name,
      organizationSlug: org.slug,
      admins: adminsByOrgId.get(org._id.toString()) || [],
    }));

    res.json(payload);
  } catch (error) {
    console.error('Failed to fetch organization admins:', error);
    res.status(500).json({ error: 'Failed to fetch organization admins' });
  }
});

// Main admin: remove admin role from a membership (downgrades to member)
router.patch('/main-admin/organization-admins/:membershipId/remove-admin', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const allowed = await isMainAdmin(req.userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Only main admin can remove organization admins' });
    }

    const { membershipId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(membershipId)) {
      return res.status(400).json({ error: 'Invalid membership id' });
    }

    const membership = await OrganizationMember.findById(membershipId);
    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    if (membership.role !== 'admin') {
      return res.status(400).json({ error: 'Selected member is not an admin' });
    }

    const adminCount = await OrganizationMember.countDocuments({
      organizationId: membership.organizationId,
      role: { $in: ['owner', 'admin'] },
    });

    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last admin of an organization' });
    }

    membership.role = 'member';
    await membership.save();
    await logAudit({
      actorUserId: req.userId,
      action: 'organization_member.admin_removed',
      entityType: 'organization_member',
      entityId: membership._id,
      organizationId: membership.organizationId,
      metadata: {
        previousRole: 'admin',
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to remove organization admin:', error);
    res.status(500).json({ error: 'Failed to remove organization admin' });
  }
});

// Main admin analytics summary
router.get('/main-admin/analytics/overview', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const allowed = await isMainAdmin(req.userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Only main admin can view analytics' });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [
      totalEvents,
      totalSaves,
      totalRsvps,
      totalCheckIns,
      topOrganizations,
      attendanceTrend,
      postingHourBuckets,
      recentAuditLogs,
    ] = await Promise.all([
      Event.countDocuments({ isPublished: true }),
      CalendarSave.countDocuments({}),
      EventRSVP.countDocuments({ status: { $in: ['rsvp', 'checked_in'] } }),
      EventRSVP.countDocuments({ status: 'checked_in' }),
      Event.aggregate([
        { $match: { isPublished: true } },
        { $group: { _id: '$organizationId', eventCount: { $sum: 1 }, totalRsvp: { $sum: '$rsvpCount' }, totalWaitlist: { $sum: '$waitlistCount' } } },
        { $sort: { eventCount: -1, totalRsvp: -1 } },
        { $limit: 8 },
        { $lookup: { from: 'organizations', localField: '_id', foreignField: '_id', as: 'organization' } },
        { $unwind: { path: '$organization', preserveNullAndEmptyArrays: true } },
        { $project: { organizationId: '$_id', organizationName: '$organization.name', eventCount: 1, totalRsvp: 1, totalWaitlist: 1 } },
      ]),
      EventRSVP.aggregate([
        { $match: { status: 'checked_in', checkedInAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$checkedInAt' },
              month: { $month: '$checkedInAt' },
              day: { $dayOfMonth: '$checkedInAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
      Event.aggregate([
        { $match: { isPublished: true, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $hour: '$createdAt' }, events: { $sum: 1 }, avgUpvotes: { $avg: '$upvoteCount' }, avgComments: { $avg: '$commentCount' } } },
        { $sort: { _id: 1 } },
      ]),
      AuditLog.find({ createdAt: { $gte: thirtyDaysAgo } })
        .populate('actorUserId', 'displayName email')
        .sort({ createdAt: -1 })
        .limit(20),
    ]);

    res.json({
      summary: {
        totalEvents,
        totalSaves,
        totalRsvps,
        totalCheckIns,
      },
      topOrganizations,
      attendanceTrend,
      bestPostingTimes: postingHourBuckets,
      recentAuditLogs,
    });
  } catch (error) {
    console.error('Failed to fetch analytics overview:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

// Get user's organizations (requires auth)
router.get('/user/memberships', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    const memberships = await OrganizationMember.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .populate('organizationId', 'name slug description logo')
      .sort({ joinedAt: -1 });

    const organizations = memberships.map((m) => ({
      ...(m.organizationId as any).toObject(),
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    res.json({
      isMember: organizations.length > 0,
      organizations,
    });
  } catch (error) {
    console.error('Error fetching user memberships:', error);
    res.status(500).json({ error: 'Failed to fetch memberships' });
  }
});

// Get organization by slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const organization = await Organization.findOne({ slug: req.params.slug });
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(organization);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

export default router;
