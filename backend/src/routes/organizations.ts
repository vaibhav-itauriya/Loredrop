import { Router, Request, Response } from 'express';
import { Organization, OrganizationMember, OrganizationSubscription, User, Event, CalendarSave, EventUpvote, EventComment, EventRSVP } from '../models';
import { authMiddleware } from '../middleware';
import mongoose from 'mongoose';
import { logAudit } from '../audit';
import { canOrgAction } from '../permissions';

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

    const [organizations, adminMemberships] = await Promise.all([
      Organization.find({})
        .select('_id name slug')
        .sort({ name: 1 })
        .lean(),
      OrganizationMember.find({ role: { $in: ['owner', 'admin'] } })
        .select('_id organizationId userId role joinedAt')
        .lean(),
    ]);

    const userIds = Array.from(
      new Set(adminMemberships.map((membership: any) => String(membership.userId)).filter(Boolean)),
    ).map((id) => new mongoose.Types.ObjectId(id));

    const users = await User.find({ _id: { $in: userIds } })
      .select('_id displayName email')
      .lean();

    const usersById = new Map(users.map((user: any) => [String(user._id), user]));

    const adminsByOrgId = new Map<string, any[]>();
    for (const membership of adminMemberships as any[]) {
      const key = String(membership.organizationId);
      const user = usersById.get(String(membership.userId));
      if (!key || !user?._id) continue;
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

// Main admin: assign admin access directly by user email
router.post('/main-admin/organization-admins/assign', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const allowed = await isMainAdmin(req.userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Only main admin can assign organization admins' });
    }

    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const organizationId = typeof req.body?.organizationId === 'string' ? req.body.organizationId.trim() : '';

    if (!email || !organizationId) {
      return res.status(400).json({ error: 'Email and organization are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({ error: 'Invalid organization id' });
    }

    const [user, organization] = await Promise.all([
      User.findOne({ email }),
      Organization.findById(organizationId).select('_id name'),
    ]);

    if (!user) {
      return res.status(404).json({ error: 'No user found with that email' });
    }

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const existingMembership = await OrganizationMember.findOne({
      organizationId: organization._id,
      userId: user._id,
    });

    if (existingMembership) {
      if (existingMembership.role === 'owner' || existingMembership.role === 'admin') {
        return res.status(400).json({ error: 'User already has admin access for this organization' });
      }
      existingMembership.role = 'admin';
      await existingMembership.save();

      await logAudit({
        actorUserId: req.userId,
        action: 'organization_member.admin_assigned',
        entityType: 'organization_member',
        entityId: existingMembership._id,
        organizationId: organization._id,
        metadata: {
          targetUserId: user._id,
          assignmentMode: 'upgrade_existing_member',
        },
      });

      return res.json({ success: true, message: 'Member upgraded to organization admin' });
    }

    const membership = await OrganizationMember.create({
      organizationId: organization._id,
      userId: user._id,
      role: 'admin',
    });

    await logAudit({
      actorUserId: req.userId,
      action: 'organization_member.admin_assigned',
      entityType: 'organization_member',
      entityId: membership._id,
      organizationId: organization._id,
      metadata: {
        targetUserId: user._id,
        assignmentMode: 'created_directly',
      },
    });

    res.json({ success: true, message: 'Organization admin created successfully' });
  } catch (error) {
    console.error('Failed to assign organization admin:', error);
    res.status(500).json({ error: 'Failed to assign organization admin' });
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

    const [
      totalEvents,
      totalSaves,
      totalRsvps,
      totalCheckIns,
    ] = await Promise.all([
      Event.countDocuments({ isPublished: true }),
      CalendarSave.countDocuments({}),
      EventRSVP.countDocuments({ status: { $in: ['rsvp', 'checked_in'] } }),
      EventRSVP.countDocuments({ status: 'checked_in' }),
    ]);

    res.json({
      summary: {
        totalEvents,
        totalSaves,
        totalRsvps,
        totalCheckIns,
      },
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

router.get('/subscriptions/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const subscriptions = await OrganizationSubscription.find({ userId })
      .populate('organizationId', 'name slug description logo followerCount')
      .sort({ createdAt: -1 });

    res.json(
      subscriptions
        .map((subscription) => (subscription.organizationId as any)?.toObject?.())
        .filter(Boolean)
    );
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

router.post('/:orgId/subscribe', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      return res.status(400).json({ error: 'Invalid organization id' });
    }

    const userId = new mongoose.Types.ObjectId(req.userId);
    const organizationId = new mongoose.Types.ObjectId(orgId);

    const [organization, existing] = await Promise.all([
      Organization.findById(organizationId),
      OrganizationSubscription.findOne({ userId, organizationId }),
    ]);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (existing) {
      return res.json({ subscribed: true });
    }

    await Promise.all([
      OrganizationSubscription.create({ userId, organizationId }),
      Organization.updateOne({ _id: organizationId }, { $inc: { followerCount: 1 } }),
    ]);

    res.json({ subscribed: true });
  } catch (error) {
    console.error('Failed to subscribe to organization:', error);
    res.status(500).json({ error: 'Failed to subscribe to organization' });
  }
});

router.delete('/:orgId/subscribe', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      return res.status(400).json({ error: 'Invalid organization id' });
    }

    const userId = new mongoose.Types.ObjectId(req.userId);
    const organizationId = new mongoose.Types.ObjectId(orgId);

    const existing = await OrganizationSubscription.findOne({ userId, organizationId });
    if (!existing) {
      return res.json({ subscribed: false });
    }

    await Promise.all([
      OrganizationSubscription.deleteOne({ _id: existing._id }),
      Organization.updateOne({ _id: organizationId }, { $inc: { followerCount: -1 } }),
    ]);

    res.json({ subscribed: false });
  } catch (error) {
    console.error('Failed to unsubscribe from organization:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from organization' });
  }
});

router.patch('/:orgId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      return res.status(400).json({ error: 'Invalid organization id' });
    }

    const permission = await canOrgAction(req.userId, orgId, 'manage_organization');
    if (!permission.allowed) {
      return res.status(403).json({ error: 'You are not allowed to manage this organization' });
    }

    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const update: Record<string, any> = {};
    const allowedStringFields = ['name', 'description', 'logo', 'coverImage'];
    for (const field of allowedStringFields) {
      if (typeof req.body?.[field] === 'string') {
        update[field] = req.body[field].trim();
      }
    }

    if (typeof req.body?.type === 'string') {
      const type = req.body.type.trim();
      if (!['council', 'club', 'festival', 'department', 'other'].includes(type)) {
        return res.status(400).json({ error: 'Invalid organization type' });
      }
      update.type = type;
    }

    if (typeof req.body?.slug === 'string') {
      const slug = req.body.slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!slug) {
        return res.status(400).json({ error: 'Slug cannot be empty' });
      }
      const existing = await Organization.findOne({ slug, _id: { $ne: organization._id } }).select('_id');
      if (existing) {
        return res.status(400).json({ error: 'Another organization already uses that slug' });
      }
      update.slug = slug;
    }

    const updated = await Organization.findByIdAndUpdate(
      organization._id,
      { $set: update },
      { new: true }
    );

    await logAudit({
      actorUserId: req.userId,
      action: 'organization.updated',
      entityType: 'system',
      entityId: organization._id,
      organizationId: organization._id,
      metadata: {
        role: permission.role,
        updatedFields: Object.keys(update),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update organization:', error);
    res.status(500).json({ error: 'Failed to update organization' });
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
