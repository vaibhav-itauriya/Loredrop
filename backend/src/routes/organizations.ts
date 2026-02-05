import { Router, Request, Response } from 'express';
import { Organization, OrganizationMember } from '../models';
import { authMiddleware } from '../middleware';
import mongoose from 'mongoose';

const router: Router = Router();

// Get all organizations
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizations = await Organization.find().sort({ name: 1 });
    res.json(organizations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organizations' });
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

export default router;
