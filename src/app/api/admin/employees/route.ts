import { NextResponse } from "next/server";
import { startOfDay, startOfWeek, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getSessionTimeoutMinutes } from "@/lib/auth";
import { calculateSessions } from "@/lib/presence-service";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as NextResponse;
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const timeoutMinutes = await getSessionTimeoutMinutes();

  const users = await prisma.user.findMany({
    where: { deletedAt: null, role: "EMPLOYEE" },
    select: { id: true, name: true, email: true },
  });

  const lookback = subDays(todayStart, 1);
  const events = await prisma.presenceEvent.findMany({
    where: {
      userId: { in: users.map((u) => u.id) },
      timestamp: { gte: lookback },
    },
    orderBy: { timestamp: "asc" },
    select: { userId: true, timestamp: true, status: true },
  });

  const byUser = new Map<string, { timestamp: Date; status: string }[]>();
  for (const e of events) {
    if (!byUser.has(e.userId)) byUser.set(e.userId, []);
    byUser.get(e.userId)!.push({ timestamp: e.timestamp, status: e.status });
  }

  const result = await Promise.all(
    users.map(async (user) => {
      const userEvents = byUser.get(user.id) ?? [];
      const todayEvents = userEvents.filter((e) => e.timestamp >= todayStart);
      const weekEvents = userEvents.filter((e) => e.timestamp >= weekStart);

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

      const lastEvent = userEvents[userEvents.length - 1];
      let currentStatus: "IN_OFFICE" | "OUT_OF_OFFICE" | "UNKNOWN" = "UNKNOWN";
      if (lastEvent) {
        const { sessions } = calculateSessions(userEvents, now, timeoutMinutes);
        const lastSession = sessions[sessions.length - 1];
        if (
          lastSession &&
          lastSession.end.getTime() >= now.getTime() - timeoutMinutes * 60 * 1000
        ) {
          currentStatus = "IN_OFFICE";
        } else {
          currentStatus = lastEvent.status === "IN_OFFICE" ? "OUT_OF_OFFICE" : lastEvent.status;
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        currentStatus,
        lastSeen: lastEvent?.timestamp ?? null,
        todayHours: Math.round((todayMinutes / 60) * 10) / 10,
        weekHours: Math.round((weekMinutes / 60) * 10) / 10,
      };
    })
  );

  return NextResponse.json({ employees: result });
}
