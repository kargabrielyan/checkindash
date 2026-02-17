import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const presenceSourceEnum = z.enum([
  "APP_LAUNCH",
  "APP_RESUME",
  "TIMER_FOREGROUND",
  "NETWORK_CHANGE",
  "BACKGROUND_TASK",
]);
const presenceStatusEnum = z.enum(["IN_OFFICE", "OUT_OF_OFFICE", "UNKNOWN"]);
const platformEnum = z.enum(["ios", "android"]);

const eventSchema = z.object({
  deviceId: z.string().optional().nullable(),
  timestamp: z.coerce.date(),
  status: presenceStatusEnum,
  source: presenceSourceEnum,
  beaconUrl: z.string().optional().nullable(),
  beaconHttpStatus: z.number().int().optional().nullable(),
  beaconLatencyMs: z.number().int().optional().nullable(),
  platform: platformEnum.optional().nullable(),
});

export async function POST(request: Request) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as NextResponse;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, isActive: true, deletedAt: true },
  });
  if (!user || user.deletedAt != null || !user.isActive) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  await prisma.presenceEvent.create({
    data: {
      userId: user.id,
      deviceId: data.deviceId ?? null,
      timestamp: data.timestamp,
      status: data.status,
      source: data.source,
      beaconUrl: data.beaconUrl ?? null,
      beaconHttpStatus: data.beaconHttpStatus ?? null,
      beaconLatencyMs: data.beaconLatencyMs ?? null,
      platform: data.platform ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
