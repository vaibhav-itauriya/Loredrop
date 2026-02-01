import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware';
import { OrganizationRequest, OrganizationMember, Organization, User } from '../models';
import mongoose from 'mongoose';

const router: Router = Router();

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
