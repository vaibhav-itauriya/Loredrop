import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware';
import { OrganizationRequest, OrganizationMember, Organization, User, Notification } from '../models';
import mongoose from 'mongoose';
import { canOrgAction } from '../permissions';
import { logAudit } from '../audit';

const MAIN_ADMIN_EMAIL = 'mukunds23@iitk.ac.in';
let cachedMainAdminId: mongoose.Types.ObjectId | null = null;
let hasLoadedMainAdminId = false;

const router: Router = Router();

async function getMainAdminUserId(): Promise<mongoose.Types.ObjectId | null> {
  if (hasLoadedMainAdminId) {
    return cachedMainAdminId;
  }
  const admin = await User.findOne({ email: MAIN_ADMIN_EMAIL });
  cachedMainAdminId = admin ? admin._id : null;
  hasLoadedMainAdminId = true;
  return cachedMainAdminId;
}

function mainAdminOnlyMiddleware(req: Request, res: Response, next: NextFunction) {
  const email = (req as any).user?.email;
  if (!email || email.toLowerCase() !== MAIN_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Only the main admin can perform this action' });
  }
  next();
}

// ----- Main admin only routes (mukunds23@iitk.ac.in) -----

// Get all pending access requests (main admin only)
router.get('/all-pending', authMiddleware, mainAdminOnlyMiddleware, async (req: Request, res: Response) => {
  try {
    const requests = await OrganizationRequest.find({ status: 'pending' })
      .select('_id userId organizationId status requestedAt')
      .sort({ requestedAt: -1 })
      .lean();

    const userIds = Array.from(
      new Set(requests.map((request: any) => String(request.userId)).filter(Boolean)),
    ).map((id) => new mongoose.Types.ObjectId(id));
    const organizationIds = Array.from(
      new Set(requests.map((request: any) => String(request.organizationId)).filter(Boolean)),
    ).map((id) => new mongoose.Types.ObjectId(id));

    const [users, organizations] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select('_id displayName email').lean(),
      Organization.find({ _id: { $in: organizationIds } }).select('_id name slug').lean(),
    ]);

    const usersById = new Map(users.map((user: any) => [String(user._id), user]));
    const organizationsById = new Map(
      organizations.map((organization: any) => [String(organization._id), organization]),
    );

    res.json(
      requests.map((request: any) => ({
        ...request,
        userId: usersById.get(String(request.userId)) || null,
        organizationId: organizationsById.get(String(request.organizationId)) || null,
      })),
    );
  } catch (error) {
    console.error('Error fetching all pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Approve any request (main admin only)
router.post('/approve/:requestId', authMiddleware, mainAdminOnlyMiddleware, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const request = await OrganizationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is no longer pending' });
    }

    const orgId = request.organizationId;
    await Promise.all([
      OrganizationMember.create({
        organizationId: orgId,
        userId: request.userId,
        role: 'member',
      }),
      OrganizationRequest.updateOne(
        { _id: request._id },
        { $set: { status: 'approved', respondedAt: new Date() } },
      ),
    ]);

    res.json({ success: true, message: 'Request approved' });

    void logAudit({
      actorUserId: req.userId,
      action: 'organization_request.approved_main_admin',
      entityType: 'organization_request',
      entityId: request._id,
      organizationId: orgId,
      metadata: {
        requestedUserId: request.userId,
      },
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// Reject any request (main admin only)
router.post('/reject/:requestId', authMiddleware, mainAdminOnlyMiddleware, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const request = await OrganizationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is no longer pending' });
    }

    await OrganizationRequest.updateOne(
      { _id: request._id },
      { $set: { status: 'rejected', respondedAt: new Date() } },
    );

    res.json({ success: true, message: 'Request rejected' });

    void logAudit({
      actorUserId: req.userId,
      action: 'organization_request.rejected_main_admin',
      entityType: 'organization_request',
      entityId: request._id,
      organizationId: request.organizationId,
      metadata: {
        requestedUserId: request.userId,
      },
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Request access to an organization
router.post('/:orgId/request-access', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const userId = req.userId;
    const organizationObjectId = new mongoose.Types.ObjectId(orgId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [isMember, existingRequest] = await Promise.all([
      OrganizationMember.findOne({
        organizationId: organizationObjectId,
        userId: userObjectId,
      }).lean(),
      OrganizationRequest.findOne({
        organizationId: organizationObjectId,
        userId: userObjectId,
        status: 'pending',
      }).lean(),
    ]);

    if (isMember) {
      return res.status(400).json({ error: 'Already a member of this organization' });
    }

    if (existingRequest) {
      return res.status(400).json({ error: 'Request already pending' });
    }

    // Create new request
    const request = new OrganizationRequest({
      organizationId: organizationObjectId,
      userId: userObjectId,
      status: 'pending',
    });
    await request.save();

    res.json({
      success: true,
      message: 'Access request sent to organization admins',
      request,
    });

    void (async () => {
      try {
        const [mainAdminId, org, requester] = await Promise.all([
          getMainAdminUserId(),
          Organization.findById(orgId).select('name').lean(),
          User.findById(userId).select('displayName email').lean(),
        ]);

        if (!mainAdminId) return;

        const requesterName = requester?.displayName || requester?.email || 'A user';
        const orgName = (org as any)?.name || 'an organization';
        await Notification.create({
          userId: mainAdminId,
          type: 'access_request',
          fromUserId: userObjectId,
          requestId: request._id,
          message: `${requesterName} requested access to ${orgName}`,
          read: false,
        });
      } catch (notificationError) {
        console.error('Failed to enqueue access request notification:', notificationError);
      }
    })();
  } catch (error) {
    console.error('Error requesting access:', error);
    res.status(500).json({ error: 'Failed to request access' });
  }
});

// Get pending requests for organization (admin only)
router.get('/:orgId/pending-requests', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin of this organization
    const permission = await canOrgAction(userId, orgId, 'manage_requests');
    if (!permission.allowed) {
      return res.status(403).json({ error: 'Not an admin of this organization' });
    }

    const requests = await OrganizationRequest.find({
      organizationId: new mongoose.Types.ObjectId(orgId),
      status: 'pending',
    })
      .populate('userId', 'displayName email')
      .sort({ requestedAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Approve organization request
router.post('/:orgId/approve-request/:requestId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orgId, requestId } = req.params;
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const permission = await canOrgAction(userId, orgId, 'manage_requests');
    if (!permission.allowed) {
      return res.status(403).json({ error: 'Not an admin' });
    }

    const request = await OrganizationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Add user as member
    const member = new OrganizationMember({
      organizationId: new mongoose.Types.ObjectId(orgId),
      userId: request.userId,
      role: 'member',
    });
    await member.save();

    // Update request status
    request.status = 'approved';
    request.respondedAt = new Date();
    await request.save();
    await logAudit({
      actorUserId: userId,
      action: 'organization_request.approved_org_admin',
      entityType: 'organization_request',
      entityId: request._id,
      organizationId: orgId,
      metadata: {
        requestedUserId: request.userId,
        actorRole: permission.role,
      },
    });

    res.json({
      success: true,
      message: 'Request approved',
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// Reject organization request
router.post('/:orgId/reject-request/:requestId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orgId, requestId } = req.params;
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const permission = await canOrgAction(userId, orgId, 'manage_requests');
    if (!permission.allowed) {
      return res.status(403).json({ error: 'Not an admin' });
    }

    const request = await OrganizationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    request.status = 'rejected';
    request.respondedAt = new Date();
    await request.save();
    await logAudit({
      actorUserId: userId,
      action: 'organization_request.rejected_org_admin',
      entityType: 'organization_request',
      entityId: request._id,
      organizationId: orgId,
      metadata: {
        requestedUserId: request.userId,
        actorRole: permission.role,
      },
    });

    res.json({
      success: true,
      message: 'Request rejected',
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

export default router;
