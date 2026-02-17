"use server";

import { redirect } from "next/navigation";
import { startOfDay, subDays, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSession, getSessionTimeoutMinutes } from "@/lib/auth";
import { calculateSessions } from "@/lib/presence-service";

export async function getOverviewStats(days: number = 30) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const now = new Date();
  const todayStart = startOfDay(now);
  const rangeStart = subDays(todayStart, days);
  const timeoutMinutes = await getSessionTimeoutMinutes();

  const userIds = await prisma.user
    .findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true },
    })
    .then((u) => u.map((x) => x.id));

  if (userIds.length === 0) {
    return {
      currentInOffice: 0,
      totalHoursToday: 0,
      activeEmployeesCount: 0,
      averageHoursToday: 0,
      hoursPerDay: [] as { date: string; totalHours: number }[],
    };
  }

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
    if (
      lastSession &&
      lastSession.end.getTime() >= now.getTime() - timeoutMinutes * 60 * 1000
    ) {
      currentInOffice++;
    }
  }

  const activeCount = userIds.length;
  const averageHoursToday = activeCount > 0 ? totalMinutesToday / 60 / activeCount : 0;

  const hoursPerDay: { date: string; totalHours: number }[] = [];
  const oneDayMs = 24 * 60 * 60 * 1000;

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
    const byUser = new Map<string, { timestamp: Date; status: string }[]>();
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

  return {
    currentInOffice,
    totalHoursToday: Math.round((totalMinutesToday / 60) * 10) / 10,
    activeEmployeesCount: activeCount,
    averageHoursToday: Math.round(averageHoursToday * 10) / 10,
    hoursPerDay,
  };
}
