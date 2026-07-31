import { Router, Response } from 'express';
import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../../middleware/rbac';
import { sendSuccess, sendError } from '../../utils/response';
import { queueEmail } from '../../utils/emailQueue';
import { logAuditEvent } from '../../utils/auditLogger';

const router = Router();

// Protect all admin routes with JWT and ADMIN/SUPER_ADMIN roles
router.use(authenticateJWT, requireRoles(['ADMIN', 'SUPER_ADMIN']));

/**
 * POST /api/v1/admin/counselors/invite
 * Create or refresh an invitation for a counselor and send setup email
 */
router.post('/counselors/invite', async (req: AuthenticatedRequest, res: Response) => {
  const { email, firstName, lastName } = req.body as {
    email?: string;
    firstName?: string;
    lastName?: string;
  };

  if (!email || !firstName || !lastName) {
    sendError(res, 'INVALID_INPUT', 'Email, firstName, and lastName are required', 400);
    return;
  }

  const cleanEmail = email.trim().toLowerCase();

  // Check if a registered user already exists with this email
  const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existingUser) {
    sendError(res, 'USER_EXISTS', `A registered user with email '${cleanEmail}' already exists.`, 400);
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Upsert invitation so re-inviting refreshes the token and expiration
  const invitation = await prisma.counselorInvitation.upsert({
    where: { email: cleanEmail },
    update: {
      firstName,
      lastName,
      token,
      expiresAt,
      used: false,
    },
    create: {
      email: cleanEmail,
      firstName,
      lastName,
      token,
      expiresAt,
    },
  });

  const setupUrl = `${process.env.COUNSELOR_PORTAL_URL || 'http://localhost:5174'}/setup-profile?token=${token}`;

  queueEmail({
    to: cleanEmail,
    subject: 'Invitation to Join WellMindly as a Counselor',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #4f46e5; margin-top: 0;">Welcome to WellMindly</h2>
        <p>Hello <strong>${firstName} ${lastName}</strong>,</p>
        <p>You have been invited to join the WellMindly team as a professional counselor.</p>
        <p>Please click the button below to complete your registration, set up your password, and define your profile:</p>
        <p style="margin: 28px 0;">
          <a href="${setupUrl}" style="background-color: #4f46e5; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">Setup Counselor Profile</a>
        </p>
        <p style="color: #64748b; font-size: 13px;">Direct Link: <a href="${setupUrl}" style="color: #4f46e5;">${setupUrl}</a></p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">This invitation link will expire in 7 days.</p>
      </div>
    `,
  });

  console.log(`📧 [Counselor Invite] Setup link generated for ${cleanEmail}: ${setupUrl}`);

  logAuditEvent({
    actorId: req.user?.sub,
    action: 'INVITE_COUNSELOR',
    targetEntity: 'CounselorInvitation',
    targetId: invitation.id,
    ipAddress: req.ip || null,
    details: { email: cleanEmail, firstName, lastName, setupUrl },
  });

  sendSuccess(res, { message: 'Invitation sent successfully', setupUrl, invitation }, 201);
});

/**
 * GET /api/v1/admin/counselors
 * List all counselors with pagination & status filters
 */
router.get('/counselors', async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;

  const where: any = { deletedAt: null };
  if (status) where.status = status;

  const [total, counselors] = await Promise.all([
    prisma.counselorProfile.count({ where }),
    prisma.counselorProfile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            timezone: true,
          },
        },
        _count: {
          select: {
            sessions: true,
            receivedFeedback: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  sendSuccess(res, counselors, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

/**
 * PUT /api/v1/admin/counselors/:id/status
 * Change counselor status (e.g., UNDER_REVIEW -> ACTIVE or SUSPENDED)
 */
router.put('/counselors/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { status } = req.body as { status?: string };

  if (!status) {
    sendError(res, 'INVALID_INPUT', 'Status is required', 400);
    return;
  }

  const updated = await prisma.counselorProfile.update({
    where: { id },
    data: { status: status as any },
    include: { user: true },
  });

  logAuditEvent({
    actorId: req.user?.sub || null,
    action: 'UPDATE_COUNSELOR_STATUS',
    targetEntity: 'CounselorProfile',
    targetId: id,
    ipAddress: typeof req.ip === 'string' ? req.ip : null,
    details: { status },
  });

  sendSuccess(res, updated);
});

/**
 * GET /api/v1/admin/calendar
 * Master calendar filterable counselor-wise and student-wise
 */
router.get('/calendar', async (req: AuthenticatedRequest, res: Response) => {
  const counselorId = typeof req.query.counselorId === 'string' ? req.query.counselorId : undefined;
  const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
  const startDate = typeof req.query.startDate === 'string' ? new Date(req.query.startDate) : undefined;
  const endDate = typeof req.query.endDate === 'string' ? new Date(req.query.endDate) : undefined;

  const where: any = { deletedAt: null };
  if (counselorId) where.counselorId = counselorId;
  if (studentId) where.studentId = studentId;

  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) where.startTime.gte = startDate;
    if (endDate) where.startTime.lte = endDate;
  }

  const sessions = await prisma.counselorSession.findMany({
    where,
    include: {
      counselor: {
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
      student: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  sendSuccess(res, sessions);
});

/**
 * PUT /api/v1/admin/sessions/:id/cancel
 * Admin cancels a scheduled counseling session
 */
router.put('/sessions/:id/cancel', async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { reason } = req.body as { reason?: string };

  const session = await prisma.counselorSession.findUnique({ where: { id } });
  if (!session || session.deletedAt) {
    sendError(res, 'NOT_FOUND', 'Session not found', 404);
    return;
  }

  const updated = await prisma.counselorSession.update({
    where: { id },
    data: {
      status: 'CANCELLED_BY_COUNSELOR',
      cancellationReason: reason || 'Cancelled by Administrator from Master Calendar',
    },
    include: {
      counselor: { include: { user: { select: { firstName: true, lastName: true } } } },
      student: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  logAuditEvent({
    actorId: req.user?.sub || null,
    action: 'CANCEL_SESSION_BY_ADMIN',
    targetEntity: 'CounselorSession',
    targetId: id,
    details: { reason },
  });

  sendSuccess(res, updated);
});

/**
 * DELETE /api/v1/admin/sessions/:id
 * Admin soft-deletes a counseling session from Master Calendar
 */
router.delete('/sessions/:id', async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);

  const session = await prisma.counselorSession.findUnique({ where: { id } });
  if (!session) {
    sendError(res, 'NOT_FOUND', 'Session not found', 404);
    return;
  }

  await prisma.counselorSession.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  logAuditEvent({
    actorId: req.user?.sub || null,
    action: 'DELETE_SESSION_BY_ADMIN',
    targetEntity: 'CounselorSession',
    targetId: id,
  });

  sendSuccess(res, { message: 'Session deleted successfully' });
});

/**
 * PUT /api/v1/admin/sessions/:id/reschedule
 * Admin reschedules a counseling session to a new date, time, or counselor
 */
router.put('/sessions/:id/reschedule', async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { startTime, endTime, counselorId } = req.body as {
    startTime?: string;
    endTime?: string;
    counselorId?: string;
  };

  if (!startTime || !endTime) {
    sendError(res, 'INVALID_INPUT', 'startTime and endTime are required for rescheduling', 400);
    return;
  }

  const existingSession = await prisma.counselorSession.findUnique({ where: { id } });
  if (!existingSession || existingSession.deletedAt) {
    sendError(res, 'NOT_FOUND', 'Session not found', 404);
    return;
  }

  const targetCounselorId = counselorId || existingSession.counselorId;
  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);

  // Check for conflicting active bookings for target counselor
  const conflict = await prisma.counselorSession.findFirst({
    where: {
      id: { not: id },
      counselorId: targetCounselorId,
      status: { notIn: ['CANCELLED_BY_STUDENT', 'CANCELLED_BY_COUNSELOR', 'EXPIRED'] },
      deletedAt: null,
      startTime: { lte: newEnd },
      endTime: { gte: newStart },
    },
  });

  if (conflict) {
    sendError(res, 'SLOT_ALREADY_BOOKED', 'Target counselor has a conflicting booking at this time.', 409);
    return;
  }

  const updated = await prisma.counselorSession.update({
    where: { id },
    data: {
      counselorId: targetCounselorId,
      startTime: newStart,
      endTime: newEnd,
      status: 'CONFIRMED',
    },
    include: {
      counselor: { include: { user: { select: { firstName: true, lastName: true } } } },
      student: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  logAuditEvent({
    actorId: req.user?.sub || null,
    action: 'RESCHEDULE_SESSION_BY_ADMIN',
    targetEntity: 'CounselorSession',
    targetId: id,
    details: { newStart, newEnd, targetCounselorId },
  });

  sendSuccess(res, updated);
});

/**
 * GET /api/v1/admin/feedback
 * Dual feedback overview (Student -> Counselor and Counselor -> Student)
 */
router.get('/feedback', async (req: AuthenticatedRequest, res: Response) => {
  const [studentFeedbacks, counselorFeedbacks] = await Promise.all([
    prisma.studentFeedback.findMany({
      include: {
        counselor: { include: { user: { select: { firstName: true, lastName: true } } } },
        session: { include: { student: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.counselorFeedback.findMany({
      include: {
        counselor: { include: { user: { select: { firstName: true, lastName: true } } } },
        session: { include: { student: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  sendSuccess(res, { studentToCounselor: studentFeedbacks, counselorToStudent: counselorFeedbacks });
});

/**
 * GET /api/v1/admin/analytics
 * Platform aggregated performance metrics
 */
router.get('/analytics', async (req: AuthenticatedRequest, res: Response) => {
  const [totalCounselors, totalStudents, totalSessions, completedSessions, avgRating] = await Promise.all([
    prisma.counselorProfile.count({ where: { status: 'ACTIVE', deletedAt: null } }),
    prisma.user.count({ where: { role: 'STUDENT', deletedAt: null } }),
    prisma.counselorSession.count({ where: { deletedAt: null } }),
    prisma.counselorSession.count({ where: { status: 'COMPLETED', deletedAt: null } }),
    prisma.studentFeedback.aggregate({ _avg: { rating: true } }),
  ]);

  sendSuccess(res, {
    totalCounselors,
    totalStudents,
    totalSessions,
    completedSessions,
    completionRate: totalSessions > 0 ? ((completedSessions / totalSessions) * 100).toFixed(1) + '%' : '0%',
    averageRating: avgRating._avg.rating ? avgRating._avg.rating.toFixed(2) : 'N/A',
  });
});

/**
 * GET /api/v1/admin/audit-logs
 * Fetch recent audit logs
 */
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  const logs = await prisma.auditLog.findMany({
    include: {
      actor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  sendSuccess(res, logs);
});

export default router;
