import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';

const router = Router();

const generalContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
});

const universityContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  universityName: z.string().min(1, 'University name is required'),
  role: z.string().min(1, 'Role is required'),
  phone: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
});

const counselorContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  credentials: z.string().min(1, 'Credentials are required'),
  experience: z.string().min(1, 'Experience detail is required'),
  message: z.string().min(1, 'Message is required'),
});

// --- Public Endpoints ---

router.post('/general', async (req: Request, res: Response) => {
  try {
    const data = generalContactSchema.parse(req.body);
    const request = await prisma.contactRequest.create({ data });
    res.status(201).json({ success: true, message: 'Message sent successfully', data: request });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0].message });
      return;
    }
    console.error('Error creating general contact:', error);
    res.status(500).json({ error: 'Failed to submit contact request' });
  }
});

router.post('/university', async (req: Request, res: Response) => {
  try {
    const data = universityContactSchema.parse(req.body);
    const request = await prisma.universityOnboarding.create({ data });
    res.status(201).json({ success: true, message: 'University onboarding request sent successfully', data: request });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0].message });
      return;
    }
    console.error('Error creating university contact:', error);
    res.status(500).json({ error: 'Failed to submit university onboarding request' });
  }
});

router.post('/counselor', async (req: Request, res: Response) => {
  try {
    const data = counselorContactSchema.parse(req.body);
    const request = await prisma.counselorOnboarding.create({ data });
    res.status(201).json({ success: true, message: 'Counselor application submitted successfully', data: request });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0].message });
      return;
    }
    console.error('Error creating counselor contact:', error);
    res.status(500).json({ error: 'Failed to submit counselor onboarding request' });
  }
});

router.get('/coaches', async (_req: Request, res: Response) => {
  try {
    const counselors = await prisma.counselorProfile.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const gradients = [
      'from-[#d8472f] to-[#a8331f]',
      'from-[#0e7c6e] to-[#0a5a4a]',
      'from-[#6d28d9] to-[#4818a0]',
      'from-[#c8973a] to-[#a06f1f]',
    ];

    const formatted = counselors.map((c, index) => {
      const name = `${c.user.firstName} ${c.user.lastName}`;
      const init = `${c.user.firstName?.[0] || ''}${c.user.lastName?.[0] || ''}`.toUpperCase() || 'WC';

      return {
        id: c.id,
        name,
        firstName: c.user.firstName,
        lastName: c.user.lastName,
        role: c.credentials ? `${c.credentials.split(',')[0]}` : 'Wellbeing Coach',
        credentials: c.credentials,
        specializations: c.specializations,
        specs: c.specializations.slice(0, 3),
        bio: c.bio,
        avatarUrl: c.avatarUrl,
        init,
        c1: gradients[index % gradients.length],
      };
    });

    res.status(200).json({ success: true, coaches: formatted });
  } catch (error) {
    console.error('Error fetching public coaches:', error);
    res.status(500).json({ error: 'Failed to fetch coaches' });
  }
});

// --- Admin Endpoints (Auth required + ADMIN role) ---

router.get(
  '/general',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [contacts, total] = await Promise.all([
        prisma.contactRequest.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.contactRequest.count(),
      ]);

      res.status(200).json({ contacts, total, page, limit });
    } catch (error) {
      console.error('Error fetching general contacts:', error);
      res.status(500).json({ error: 'Failed to fetch general contacts' });
    }
  }
);

router.get(
  '/university',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [requests, total] = await Promise.all([
        prisma.universityOnboarding.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.universityOnboarding.count(),
      ]);

      res.status(200).json({ requests, total, page, limit });
    } catch (error) {
      console.error('Error fetching university contacts:', error);
      res.status(500).json({ error: 'Failed to fetch university requests' });
    }
  }
);

router.get(
  '/counselor',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [requests, total] = await Promise.all([
        prisma.counselorOnboarding.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.counselorOnboarding.count(),
      ]);

      res.status(200).json({ requests, total, page, limit });
    } catch (error) {
      console.error('Error fetching counselor contacts:', error);
      res.status(500).json({ error: 'Failed to fetch counselor applications' });
    }
  }
);

router.delete(
  '/general/:id',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await prisma.contactRequest.delete({ where: { id } });
      res.status(200).json({ success: true, message: 'Contact request deleted' });
    } catch (error) {
      console.error('Error deleting contact request:', error);
      res.status(500).json({ error: 'Failed to delete contact request' });
    }
  }
);

router.delete(
  '/university/:id',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await prisma.universityOnboarding.delete({ where: { id } });
      res.status(200).json({ success: true, message: 'University request deleted' });
    } catch (error) {
      console.error('Error deleting university request:', error);
      res.status(500).json({ error: 'Failed to delete university onboarding request' });
    }
  }
);

router.delete(
  '/counselor/:id',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await prisma.counselorOnboarding.delete({ where: { id } });
      res.status(200).json({ success: true, message: 'Counselor request deleted' });
    } catch (error) {
      console.error('Error deleting counselor request:', error);
      res.status(500).json({ error: 'Failed to delete counselor onboarding request' });
    }
  }
);

export default router;
