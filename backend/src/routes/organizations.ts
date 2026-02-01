import { Router, Request, Response } from 'express';
import { Organization } from '../models';

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

export default router;
