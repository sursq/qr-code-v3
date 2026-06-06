import { SignJWT, jwtVerify } from 'jose';

// ===== إدارة جلسة المدير =====
// نستخدم jose لأنها تعمل على Edge runtime (مطلوبة في middleware)
// ونوقّع رمز جلسة (JWT) ونخزّنه في كوكي httpOnly آمن.

const COOKIE_NAME = 'lab_session';
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 ساعة

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'AUTH_SECRET غير مضبوط أو قصير جداً. ضع قيمة عشوائية طويلة في ملف .env'
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // اسم المستخدم
  role: 'admin';
}

export async function createSessionToken(username: string): Promise<string> {
  return await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.role !== 'admin' || typeof payload.sub !== 'string') return null;
    return { sub: payload.sub, role: 'admin' };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
