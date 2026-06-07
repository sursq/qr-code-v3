import 'server-only';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from './auth';

// قراءة الجلسة الحالية من الكوكي (للاستخدام في Server Components و API)
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

// التحقق من بيانات الدخول مقابل متغيرات البيئة
export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME ?? 'admin';
  const expectedPass = process.env.ADMIN_PASSWORD ?? '';

  if (!expectedPass) return false;

  // مقارنة آمنة ضد هجمات التوقيت
  const userOk = safeEqual(username, expectedUser);

  // ندعم كلمة مرور مُجزّأة (تبدأ بـ $2) أو نص صريح
  let passOk = false;
  if (expectedPass.startsWith('$2')) {
    passOk = bcrypt.compareSync(password, expectedPass);
  } else {
    passOk = safeEqual(password, expectedPass);
  }

  return userOk && passOk;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // ما زلنا نقارن لتثبيت زمن التنفيذ تقريباً
    let res = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      res |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return false;
  }
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}
