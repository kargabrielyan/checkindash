import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "EMPLOYEE"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(100).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as NextResponse;
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt != null) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.role != null) updates.role = parsed.data.role;
  if (parsed.data.isActive != null) updates.isActive = parsed.data.isActive;
  if (parsed.data.email != null) updates.email = parsed.data.email.toLowerCase();
  if (parsed.data.password != null) {
    updates.passwordHash = await hashPassword(parsed.data.password);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updates,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as NextResponse;
  }

  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt != null) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  return NextResponse.json({ ok: true });
}
