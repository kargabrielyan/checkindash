import { NextResponse } from "next/server";
import { startOfDay, subDays, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getSessionTimeoutMinutes } from "@/lib/auth";
import { calculateSessions } from "@/lib/presence-service";
import type { PresenceStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as NextResponse;
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(90, Math.max(7, parseInt(searchParams.get("days") ?? "30", 10) || 30));

  const now = new Date();
  const todayStart = startOfDay(now);
  const rangeStart = subDays(todayStart, days);

  const timeoutMinutes = await getSessionTimeoutMinutes();

  // All users (employees + admin) for "currently in office" and today stats
  const userIds = await prisma.user.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true },
  }).then((u) => u.map((x) => x.id));

  if (userIds.length === 0) {
    return NextResponse.json({
      currentInOffice: 0,
      totalHoursToday: 0,
      activeEmployeesCount: 0,
      averageHoursToday: 0,
      hoursPerDay: [],
    });
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  const lookbackStart = new Date(rangeStart.getTime() - oneDayMs);

  const eventsToday = await prisma.presenceEvent.findMany({
    where: {
      userId: { in: userIds },
      timestamp: { gte: todayStart, lte: now },
    },
    orderBy: { timestamp: "asc" },
    select: { userId: true, timestamp: true, status: true },
  });

  const eventsByUserToday = new Map<string, typeof eventsToday>();
  for (const e of eventsToday) {
    if (!eventsByUserToday.has(e.userId)) eventsByUserToday.set(e.userId, []);
    eventsByUserToday.get(e.userId)!.push(e);
  }

  let totalMinutesToday = 0;
  let currentInOffice = 0;

  for (const userId of userIds) {
    const userEvents = eventsByUserToday.get(userId) ?? [];
    const { sessions, totalDurationMinutes } = calculateSessions(
      userEvents,
      now,
      timeoutMinutes
    );
    totalMinutesToday += totalDurationMinutes;
    const lastSession = sessions[sessions.length - 1];
    if (lastSession && lastSession.end.getTime() >= now.getTime() - timeoutMinutes * 60 * 1000) {
      currentInOffice++;
    }
  }

  const activeCount = userIds.length;
  const averageHoursToday = activeCount > 0 ? totalMinutesToday / 60 / activeCount : 0;

  // Hours per day for chart (last N days)
  const hoursPerDay: { date: string; totalHours: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(todayStart, i);
    const dayEnd = new Date(d.getTime() + oneDayMs - 1);
    const dayEvents = await prisma.presenceEvent.findMany({
      where: {
        userId: { in: userIds },
        timestamp: { gte: d, lte: dayEnd },
      },
      orderBy: { timestamp: "asc" },
      select: { userId: true, timestamp: true, status: true },
    });
    const byUser = new Map<string, { timestamp: Date; status: PresenceStatus }[]>();
    for (const e of dayEvents) {
      if (!byUser.has(e.userId)) byUser.set(e.userId, []);
      byUser.get(e.userId)!.push({ timestamp: e.timestamp, status: e.status });
    }
    let dayTotal = 0;
    for (const [, evs] of byUser) {
      const { totalDurationMinutes } = calculateSessions(evs, dayEnd, timeoutMinutes);
      dayTotal += totalDurationMinutes;
    }
    hoursPerDay.push({
      date: format(d, "yyyy-MM-dd"),
      totalHours: Math.round((dayTotal / 60) * 10) / 10,
    });
  }

  return NextResponse.json({
    currentInOffice,
    totalHoursToday: Math.round((totalMinutesToday / 60) * 10) / 10,
    activeEmployeesCount: activeCount,
    averageHoursToday: Math.round(averageHoursToday * 10) / 10,
    hoursPerDay,
  });
}
