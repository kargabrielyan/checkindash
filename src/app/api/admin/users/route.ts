import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";

const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["ADMIN", "EMPLOYEE"]).default("EMPLOYEE"),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch (res) {
    return res as NextResponse;
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as NextResponse;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, password, role } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    if (existing.deletedAt == null) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        passwordHash,
        role,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ user, restored: true });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role,
      isActive: true,
    },
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
