import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";

const ACCESS_TOKEN_EXPIRY_DAYS = 7;

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export interface UserForToken {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Sign a long-lived access token for mobile (Bearer auth).
 * Expiration: 7 days.
 */
export async function signAccessToken(user: UserForToken): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(getSecret());
}

/**
 * Verify a Bearer access token; returns payload or null.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub;
    const email = payload.email as string;
    const role = payload.role as UserRole;
    if (!sub || !email || !role) return null;
    return {
      sub,
      email,
      role,
      iat: (payload.iat as number) ?? 0,
      exp: (payload.exp as number) ?? 0,
    };
  } catch {
    return null;
  }
}
