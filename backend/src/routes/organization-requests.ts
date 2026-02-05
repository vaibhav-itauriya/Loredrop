import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware';
import { OrganizationRequest, OrganizationMember, Organization, User, Notification } from '../models';
import mongoose from 'mongoose';

const MAIN_ADMIN_EMAIL = 'mukunds23@iitk.ac.in';

const router: Router = Router();

async function getMainAdminUserId(): Promise<mongoose.Types.ObjectId | null> {
  const admin = await User.findOne({ email: MAIN_ADMIN_EMAIL });
  return admin ? admin._id : null;
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
      .populate('userId', 'displayName email')
      .populate('organizationId', 'name slug')
      .sort({ requestedAt: -1 });
    res.json(requests);
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
    const member = new OrganizationMember({
      organizationId: orgId,
      userId: request.userId,
      role: 'member',
    });
    await member.save();

    request.status = 'approved';
    request.respondedAt = new Date();
    await request.save();

    res.json({ success: true, message: 'Request approved' });
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

    request.status = 'rejected';
    request.respondedAt = new Date();
    await request.save();

    res.json({ success: true, message: 'Request rejected' });
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

    // Check if already a member
    const isMember = await OrganizationMember.findOne({
      organizationId: new mongoose.Types.ObjectId(orgId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (isMember) {
      return res.status(400).json({ error: 'Already a member of this organization' });
    }

    // Check if already requested
    const existingRequest = await OrganizationRequest.findOne({
      organizationId: new mongoose.Types.ObjectId(orgId),
      userId: new mongoose.Types.ObjectId(userId),
      status: 'pending',
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'Request already pending' });
    }

    // Create new request
    const request = new OrganizationRequest({
      organizationId: new mongoose.Types.ObjectId(orgId),
      userId: new mongoose.Types.ObjectId(userId),
      status: 'pending',
    });
    await request.save();

    // Notify main admin (mukunds23@iitk.ac.in)
    const mainAdminId = await getMainAdminUserId();
    if (mainAdminId) {
      const org = await Organization.findById(orgId).select('name');
      const requester = await User.findById(userId).select('displayName email');
      const requesterName = requester?.displayName || requester?.email || 'A user';
      const orgName = (org as any)?.name || 'an organization';
      await Notification.create({
        userId: mainAdminId,
        type: 'access_request',
        fromUserId: new mongoose.Types.ObjectId(userId),
        requestId: request._id,
        message: `${requesterName} requested access to ${orgName}`,
        read: false,
      });
    }

    res.json({
      success: true,
      message: 'Access request sent to organization admins',
      request,
    });
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

    // Check if user is admin of this organization
    const isAdmin = await OrganizationMember.findOne({
      organizationId: new mongoose.Types.ObjectId(orgId),
      userId: new mongoose.Types.ObjectId(userId),
      role: 'admin',
    });

    if (!isAdmin) {
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

    // Check if user is admin
    const isAdmin = await OrganizationMember.findOne({
      organizationId: new mongoose.Types.ObjectId(orgId),
      userId: new mongoose.Types.ObjectId(userId),
      role: 'admin',
    });

    if (!isAdmin) {
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

    // Check if user is admin
    const isAdmin = await OrganizationMember.findOne({
      organizationId: new mongoose.Types.ObjectId(orgId),
      userId: new mongoose.Types.ObjectId(userId),
      role: 'admin',
    });

    if (!isAdmin) {
      return res.status(403).json({ error: 'Not an admin' });
    }

    const request = await OrganizationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    request.status = 'rejected';
    request.respondedAt = new Date();
    await request.save();

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
