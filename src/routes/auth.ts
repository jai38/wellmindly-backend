import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { env } from '../config/env';

const router = Router();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

/**
 * POST /api/auth/google/callback
 *
 * Accepts a Google ID token from the frontend (sent after Google Sign-In),
 * validates it, checks university domain membership, and issues a JWT.
 *
 * Body: { idToken: string }
 */
router.post('/google/callback', async (req: Request, res: Response) => {
  const { idToken } = req.body as { idToken?: string };

  if (!idToken) {
    res.status(400).json({ error: 'idToken is required' });
    return;
  }

  // 1. Verify the Google ID token
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
  } catch {
    res.status(401).json({ error: 'Invalid or expired Google token' });
    return;
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    res.status(401).json({ error: 'Google token payload is missing email' });
    return;
  }

  const { sub: googleId, email, given_name: firstName = '', family_name: lastName = '' } = payload;

  // 2. Extract the domain from the email and look up a verified university
  const domain = email.split('@')[1];
  const university = await prisma.university.findUnique({
    where: { domain },
  });

  // 3. Upsert the user — create on first login, find on subsequent logins
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      googleId,
      // Keep universityId in sync in case the university was verified after first login
      ...(university ? { universityId: university.id } : {}),
    },
    create: {
      email,
      googleId,
      firstName,
      lastName,
      role: 'STUDENT',
      universityId: university?.id ?? null,
    },
  });

  // 4. Issue a structured JWT
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    universityId: user.universityId,
  });

  res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      universityId: user.universityId,
      universityDomain: university?.domain ?? null,
      universityVerified: university?.verified ?? false,
    },
  });
});

interface OtpEntry {
  code: string;
  expiresAt: number;
}

const otpStore = new Map<string, OtpEntry>();

/**
 * POST /api/auth/send-otp
 *
 * Generates and sends a 6-digit verification code to the user's email.
 */
router.post('/send-otp', async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

  otpStore.set(email.toLowerCase(), { code, expiresAt });

  console.log(`
==================================================
📧  WELLMINDLY EMAIL VERIFICATION
To: ${email}
Code: ${code}
Expires in: 5 minutes
==================================================
  `);

  res.status(200).json({ message: 'Verification code sent to your email.' });
});

/**
 * POST /api/auth/login
 *
 * Traditional email/password login for Admins and University Staff.
 */
router.post('/login', async (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { university: true },
  });

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Validate password
  const bcrypt = require('bcrypt'); // require dynamically or add to top
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Optional: Ensure the requested role matches their profile
  if (role && user.role !== role) {
    res.status(403).json({ error: 'Unauthorized role access' });
    return;
  }

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    universityId: user.universityId,
  });

  res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      universityId: user.universityId,
      universityDomain: user.university?.domain ?? null,
      universityVerified: user.university?.verified ?? false,
    },
  });
});

/**
 * POST /api/auth/register
 *
 * Traditional email/password registration for Students.
 */
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, otp } = req.body;

  if (!email || !password || !firstName || !lastName || !otp) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const domain = email.split('@')[1];
  if (!domain) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }

  // Validate OTP
  const storedOtp = otpStore.get(email.toLowerCase());
  if (!storedOtp) {
    res.status(400).json({ error: 'Please request a verification code first' });
    return;
  }

  if (Date.now() > storedOtp.expiresAt) {
    otpStore.delete(email.toLowerCase());
    res.status(400).json({ error: 'Verification code has expired' });
    return;
  }

  if (storedOtp.code !== otp.trim()) {
    res.status(400).json({ error: 'Incorrect verification code' });
    return;
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const university = await prisma.university.findUnique({
      where: { domain },
    });

    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: 'STUDENT',
        universityId: university?.id ?? null,
      },
    });

    // Clear OTP on successful signup
    otpStore.delete(email.toLowerCase());

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      universityId: user.universityId,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        universityId: user.universityId,
        universityDomain: university?.domain ?? null,
        universityVerified: university?.verified ?? false,
      },
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/**
 * POST /api/auth/waitlist
 *
 * Adds an email and feature to the waitlist.
 * Body: { email: string, feature: string }
 */
router.post('/waitlist', async (req: Request, res: Response) => {
  const { email, feature } = req.body as { email?: string; feature?: string };

  if (!email || !feature) {
    res.status(400).json({ error: 'Email and feature are required' });
    return;
  }

  const emailLower = email.toLowerCase().trim();
  if (!emailLower.includes('@')) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }

  try {
    const waitlistEntry = await prisma.waitlist.upsert({
      where: {
        email_feature: {
          email: emailLower,
          feature,
        },
      },
      update: {}, // No-op if it already exists
      create: {
        email: emailLower,
        feature,
      },
    });

    res.status(200).json({
      message: 'Successfully joined the waitlist.',
      waitlist: waitlistEntry,
    });
  } catch (err: any) {
    console.error('Waitlist error:', err);
    res.status(500).json({ error: 'Failed to join waitlist. Please try again.' });
  }
});

export default router;

