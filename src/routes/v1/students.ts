import { Router, Response } from 'express';
import prisma from '../../lib/prisma';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../../middleware/rbac';
import { sendSuccess, sendError } from '../../utils/response';
import { generateBookableSlots } from '../../services/slotGenerator';
import { bookSessionTransaction } from '../../services/bookingService';
import { logAuditEvent } from '../../utils/auditLogger';

const router = Router();

// Protect student endpoints with JWT
router.use(authenticateJWT, requireRoles(['STUDENT', 'ADMIN', 'SUPER_ADMIN']));

/**
 * GET /api/v1/students/counselors
 * Directory of active counselors with credentials & ratings
 */
router.get('/counselors', async (req: AuthenticatedRequest, res: Response) => {
  const counselors = await prisma.counselorProfile.findMany({
    where: { status: 'ACTIVE', deletedAt: null },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      receivedFeedback: {
        select: { rating: true },
      },
    },
  });

  const formatted = counselors.map((c) => {
    const ratings = c.receivedFeedback.map((f) => f.rating);
    const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '5.0';

    return {
      id: c.id,
      userId: c.userId,
      name: `${c.user.firstName} ${c.user.lastName}`,
      credentials: c.credentials,
      specializations: c.specializations,
      bio: c.bio,
      avatarUrl: c.avatarUrl,
      averageRating: parseFloat(avgRating),
      totalReviews: ratings.length,
    };
  });

  sendSuccess(res, formatted);
});

/**
 * GET /api/v1/students/counselors/slots
 * Bi-directional slot generator endpoint
 * Query params: counselorId (optional), date (ISO date string, e.g. "2026-07-29")
 */
router.get('/counselors/slots', async (req: AuthenticatedRequest, res: Response) => {
  const counselorId = typeof req.query.counselorId === 'string' ? req.query.counselorId : undefined;
  const dateStr = typeof req.query.date === 'string' ? req.query.date : undefined;

  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const startDateUtc = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0));
  const endDateUtc = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 23, 59, 59));

  if (counselorId) {
    // Mode 1: Fetch all slots for selected counselor on date
    const slots = await generateBookableSlots(counselorId, startDateUtc, endDateUtc);
    sendSuccess(res, { counselorId, date: targetDate.toISOString().split('T')[0], slots });
    return;
  }

  // Mode 2: Fetch available counselors for a given time window / date
  const activeCounselors = await prisma.counselorProfile.findMany({
    where: { status: 'ACTIVE', deletedAt: null },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });

  const counselorSlotResults = await Promise.all(
    activeCounselors.map(async (c) => {
      const slots = await generateBookableSlots(c.id, startDateUtc, endDateUtc);
      const availableSlots = slots.filter((s) => s.isAvailable);
      return {
        counselorId: c.id,
        name: `${c.user.firstName} ${c.user.lastName}`,
        specializations: c.specializations,
        availableSlotsCount: availableSlots.length,
        slots,
      };
    })
  );

  sendSuccess(res, counselorSlotResults);
});

/**
 * POST /api/v1/students/sessions/book
 * Atomic session booking with double-booking lock
 */
router.post('/sessions/book', async (req: AuthenticatedRequest, res: Response) => {
  const { counselorId, startTime, endTime } = req.body as {
    counselorId?: string;
    startTime?: string;
    endTime?: string;
  };

  if (!counselorId || !startTime || !endTime) {
    sendError(res, 'INVALID_INPUT', 'counselorId, startTime, and endTime are required', 400);
    return;
  }

  try {
    const session = await bookSessionTransaction({
      studentId: req.user!.sub,
      counselorId,
      startTimeUtc: new Date(startTime),
      endTimeUtc: new Date(endTime),
      ipAddress: req.ip || undefined,
    });

    sendSuccess(res, session, 201);
  } catch (err: any) {
    if (err.message === 'SLOT_ALREADY_BOOKED') {
      sendError(res, 'SLOT_ALREADY_BOOKED', 'Selected slot is no longer available. Please select another slot.', 409);
    } else {
      sendError(res, 'BOOKING_FAILED', err.message || 'Failed to book session', 400);
    }
  }
});

/**
 * GET /api/v1/students/sessions/me
 * List student's booked sessions
 */
router.get('/sessions/me', async (req: AuthenticatedRequest, res: Response) => {
  const sessions = await prisma.counselorSession.findMany({
    where: { studentId: req.user?.sub, deletedAt: null },
    include: {
      counselor: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      },
      studentFeedback: true,
    },
    orderBy: { startTime: 'desc' },
  });

  sendSuccess(res, sessions);
});

/**
 * POST /api/v1/students/sessions/:id/cancel
 * Student session cancellation
 */
router.post('/sessions/:id/cancel', async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const { reason } = req.body as { reason?: string };

  const session = await prisma.counselorSession.findFirst({
    where: { id, studentId: req.user?.sub },
  });

  if (!session) {
    sendError(res, 'NOT_FOUND', 'Session not found', 404);
    return;
  }

  // Check 30-minute cancellation rule
  const now = new Date();
  const diffMins = Math.floor((session.startTime.getTime() - now.getTime()) / (1000 * 60));
  if (diffMins < 30) {
    sendError(res, 'CANCELLATION_RESTRICTED', 'Sessions cannot be cancelled within 30 minutes of start time', 400);
    return;
  }

  const updated = await prisma.counselorSession.update({
    where: { id },
    data: {
      status: 'CANCELLED_BY_STUDENT',
      cancellationReason: reason || 'Cancelled by student',
    },
  });

  logAuditEvent({
    actorId: req.user?.sub || null,
    action: 'CANCEL_SESSION_BY_STUDENT',
    targetEntity: 'CounselorSession',
    targetId: id,
  });

  sendSuccess(res, updated);
});

/**
 * POST /api/v1/students/sessions/:id/feedback
 * Submit student feedback & rating for counselor
 */
router.post('/sessions/:id/feedback', async (req: AuthenticatedRequest, res: Response) => {
  const sessionId = String(req.params.id);
  const { rating, comments, answers } = req.body as {
    rating?: number;
    comments?: string;
    answers?: any;
  };

  const session = await prisma.counselorSession.findFirst({
    where: { id: sessionId, studentId: req.user?.sub },
  });

  if (!session) {
    sendError(res, 'NOT_FOUND', 'Session not found', 404);
    return;
  }

  const feedback = await prisma.studentFeedback.create({
    data: {
      sessionId,
      counselorId: session.counselorId,
      studentId: session.studentId,
      rating: rating || 5,
      comments: comments || '',
      answers: answers || {},
    },
  });

  sendSuccess(res, feedback, 201);
});

export default router;
