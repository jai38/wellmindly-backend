import prisma from '../lib/prisma';

export interface TimeSlot {
  startTime: string; // ISO string in UTC
  endTime: string;   // ISO string in UTC
  counselorId: string;
  isAvailable: boolean;
  reason?: string;
}

export async function generateBookableSlots(
  counselorId: string,
  startDateUtc: Date,
  endDateUtc: Date
): Promise<TimeSlot[]> {
  // 1. Layer 1: Fetch recurring rules (if defined) or fallback to default 08:00 - 18:00 (8 AM to 6 PM)
  const availabilities = await prisma.counselorAvailability.findMany({
    where: { counselorId, isAvailable: true },
  });

  const rulesByDay: Record<number, typeof availabilities> = {};
  for (const rule of availabilities) {
    if (!rulesByDay[rule.dayOfWeek]) rulesByDay[rule.dayOfWeek] = [];
    rulesByDay[rule.dayOfWeek].push(rule);
  }

  const candidateSlots: { start: Date; end: Date }[] = [];
  const curr = new Date(startDateUtc);

  while (curr <= endDateUtc) {
    const dayOfWeek = curr.getUTCDay();
    const dayRules = rulesByDay[dayOfWeek];

    if (dayRules && dayRules.length > 0) {
      for (const rule of dayRules) {
        const [startHour, startMin] = rule.startTime.split(':').map(Number);
        const [endHour, endMin] = rule.endTime.split(':').map(Number);

        let slotStart = new Date(Date.UTC(curr.getUTCFullYear(), curr.getUTCMonth(), curr.getUTCDate(), startHour, startMin));
        const windowEnd = new Date(Date.UTC(curr.getUTCFullYear(), curr.getUTCMonth(), curr.getUTCDate(), endHour, endMin));

        while (slotStart < windowEnd) {
          const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // Fixed 60 mins (1 hour)
          if (slotEnd <= windowEnd) {
            candidateSlots.push({ start: slotStart, end: slotEnd });
          }
          slotStart = slotEnd;
        }
      }
    } else {
      // Default working hours: 08:00 to 18:00 UTC with fixed 1-hour slots
      let slotStart = new Date(Date.UTC(curr.getUTCFullYear(), curr.getUTCMonth(), curr.getUTCDate(), 8, 0));
      const windowEnd = new Date(Date.UTC(curr.getUTCFullYear(), curr.getUTCMonth(), curr.getUTCDate(), 18, 0));

      while (slotStart < windowEnd) {
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // 1 hour
        if (slotEnd <= windowEnd) {
          candidateSlots.push({ start: slotStart, end: slotEnd });
        }
        slotStart = slotEnd;
      }
    }

    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  if (candidateSlots.length === 0) return [];

  // 2. Layer 2: Fetch date-specific exceptions / blocked hours
  const exceptions = await prisma.counselorAvailabilityException.findMany({
    where: {
      counselorId,
      startDate: { lte: endDateUtc },
      endDate: { gte: startDateUtc },
    },
  });

  // 3. Layer 3: Fetch active booked sessions
  const existingSessions = await prisma.counselorSession.findMany({
    where: {
      counselorId,
      status: { notIn: ['CANCELLED_BY_STUDENT', 'CANCELLED_BY_COUNSELOR', 'EXPIRED'] },
      startTime: { lte: endDateUtc },
      endTime: { gte: startDateUtc },
    },
  });

  return candidateSlots.map((slot) => {
    const isBlocked = exceptions.some(
      (exc) => slot.start < exc.endDate && slot.end > exc.startDate
    );

    const isBooked = existingSessions.some(
      (sess) => slot.start < sess.endTime && slot.end > sess.startTime
    );

    const isAvailable = !isBlocked && !isBooked;
    let reason: string | undefined = undefined;
    if (isBlocked) reason = 'BLOCKED_BY_COUNSELOR';
    else if (isBooked) reason = 'SLOT_ALREADY_BOOKED';

    return {
      startTime: slot.start.toISOString(),
      endTime: slot.end.toISOString(),
      counselorId,
      isAvailable,
      ...(reason ? { reason } : {}),
    };
  });
}
