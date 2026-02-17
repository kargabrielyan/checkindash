import { NextResponse } from "next/server";
import { startOfDay, startOfWeek, startOfMonth, subDays, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getSessionTimeoutMinutes } from "@/lib/auth";
import { calculateSessions } from "@/lib/presence-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as NextResponse;
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") ?? "14", 10) || 14));

  const user = await prisma.user.findUnique({
    where: { id, deletedAt: null },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const timeoutMinutes = await getSessionTimeoutMinutes();

  let rangeStart: Date;
  let rangeEnd: Date;
  if (fromParam && toParam) {
    rangeStart = new Date(fromParam);
    rangeEnd = new Date(toParam);
  } else {
    rangeEnd = now;
    rangeStart = subDays(todayStart, days);
  }

  const lookbackStart = new Date(rangeStart.getTime() - 24 * 60 * 60 * 1000);

  const events = await prisma.presenceEvent.findMany({
    where: {
      userId: id,
      timestamp: { gte: lookbackStart, lte: rangeEnd },
    },
    orderBy: { timestamp: "asc" },
    select: { timestamp: true, status: true },
  });

  const eventsInRange = events.filter(
    (e) => e.timestamp >= rangeStart && e.timestamp <= rangeEnd
  );

  const { sessions, totalDurationMinutes } = calculateSessions(
    eventsInRange,
    rangeEnd,
    timeoutMinutes
  );

  const todayEvents = events.filter((e) => e.timestamp >= todayStart);
  const weekEvents = events.filter((e) => e.timestamp >= weekStart);
  const monthEvents = events.filter((e) => e.timestamp >= monthStart);

  const { totalDurationMinutes: todayMinutes } = calculateSessions(
    todayEvents,
    now,
    timeoutMinutes
  );
  const { totalDurationMinutes: weekMinutes } = calculateSessions(
    weekEvents,
    now,
    timeoutMinutes
  );
  const { totalDurationMinutes: monthMinutes } = calculateSessions(
    monthEvents,
    now,
    timeoutMinutes
  );

  const hoursPerDay: { date: string; hours: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(todayStart, i);
    const dayEnd = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
    const dayEvents = events.filter(
      (e) => e.timestamp >= d && e.timestamp <= dayEnd
    );
    const { totalDurationMinutes: dm } = calculateSessions(
      dayEvents,
      dayEnd,
      timeoutMinutes
    );
    hoursPerDay.push({
      date: format(d, "yyyy-MM-dd"),
      hours: Math.round((dm / 60) * 10) / 10,
    });
  }

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
    summary: {
      todayHours: Math.round((todayMinutes / 60) * 10) / 10,
      weekHours: Math.round((weekMinutes / 60) * 10) / 10,
      monthHours: Math.round((monthMinutes / 60) * 10) / 10,
    },
    sessions: sessions.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      durationMinutes: Math.round(s.durationMinutes * 10) / 10,
    })),
    totalDurationMinutes: Math.round(totalDurationMinutes * 10) / 10,
    hoursPerDay,
    rawEvents: eventsInRange.map((e) => ({
      timestamp: e.timestamp.toISOString(),
      status: e.status,
    })),
  });
}
