import crypto from 'crypto';
import prisma from '../lib/prisma';
import { queueEmail } from '../utils/emailQueue';
import { logAuditEvent } from '../utils/auditLogger';

export interface BookSessionParams {
  studentId: string;
  counselorId: string;
  startTimeUtc: Date;
  endTimeUtc: Date;
  ipAddress?: string;
}

export async function bookSessionTransaction(params: BookSessionParams) {
  const { studentId, counselorId, startTimeUtc, endTimeUtc, ipAddress } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Verify counselor status is ACTIVE
    const counselor = await tx.counselorProfile.findUnique({
      where: { id: counselorId },
      include: { user: true },
    });

    if (!counselor || counselor.status !== 'ACTIVE' || counselor.deletedAt) {
      throw new Error('COUNSELOR_NOT_AVAILABLE');
    }

    // 2. Concurrency Lock: Atomic check for overlapping active sessions
    const conflictingSession = await tx.counselorSession.findFirst({
      where: {
        counselorId,
        status: { notIn: ['CANCELLED_BY_STUDENT', 'CANCELLED_BY_COUNSELOR', 'EXPIRED'] },
        startTime: { lt: endTimeUtc },
        endTime: { gt: startTimeUtc },
      },
    });

    if (conflictingSession) {
      throw new Error('SLOT_ALREADY_BOOKED');
    }

    // 3. Fetch student details
    const student = await tx.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new Error('STUDENT_NOT_FOUND');
    }

    // 4. Generate obfuscated UUID meeting link for Jitsi
    const meetingRoomUuid = crypto.randomUUID();
    const meetingLink = `https://meet.jit.si/wellmindly-counseling-${meetingRoomUuid}`;

    // 5. Create CounselorSession record
    const session = await tx.counselorSession.create({
      data: {
        counselorId,
        studentId,
        startTime: startTimeUtc,
        endTime: endTimeUtc,
        status: 'CONFIRMED',
        meetingLink,
      },
      include: {
        counselor: {
          include: { user: true },
        },
        student: true,
      },
    });

    // 6. Log audit event asynchronously
    logAuditEvent({
      actorId: studentId,
      action: 'BOOK_COUNSELING_SESSION',
      targetEntity: 'CounselorSession',
      targetId: session.id,
      ipAddress: ipAddress || null,
      details: { counselorId, startTime: startTimeUtc, endTime: endTimeUtc },
    });

    // 7. Queue async confirmation emails
    const formattedTime = startTimeUtc.toUTCString();

    // Confirmation to Student
    queueEmail({
      to: student.email,
      subject: `Confirmed: Counseling Session on ${formattedTime}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
          <h2 style="color: #4f46e5;">Session Booking Confirmed</h2>
          <p>Hello <strong>${student.firstName}</strong>,</p>
          <p>Your session with <strong>${counselor.user.firstName} ${counselor.user.lastName}</strong> has been successfully booked.</p>
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #4f46e5; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Date & Time (UTC):</strong> ${formattedTime}</p>
            <p style="margin: 4px 0;"><strong>Counselor:</strong> ${counselor.user.firstName} ${counselor.user.lastName} (${counselor.credentials})</p>
          </div>
          <p>
            <a href="${meetingLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Join Video Meeting</a>
          </p>
        </div>
      `,
    });

    // Notification to Counselor
    queueEmail({
      to: counselor.user.email,
      subject: `New Session Booked by ${student.firstName} ${student.lastName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
          <h2 style="color: #4f46e5;">New Session Scheduled</h2>
          <p>Hello <strong>${counselor.user.firstName}</strong>,</p>
          <p>Student <strong>${student.firstName} ${student.lastName}</strong> has booked a counseling session with you.</p>
          <p><strong>Scheduled UTC Time:</strong> ${formattedTime}</p>
          <p><a href="${meetingLink}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Open Video Meeting Room</a></p>
        </div>
      `,
    });

    return session;
  });
}
