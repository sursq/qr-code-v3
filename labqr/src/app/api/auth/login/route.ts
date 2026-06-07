import { NextRequest, NextResponse } from 'next/server';
import { checkCredentials } from '@/lib/session';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }

  const username = (body.username ?? '').trim();
  const password = body.password ?? '';

  if (!username || !password) {
    return NextResponse.json(
      { error: 'يرجى إدخال اسم المستخدم وكلمة المرور' },
      { status: 400 }
    );
  }

  if (!checkCredentials(username, password)) {
    // تأخير بسيط لإبطاء محاولات التخمين
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json(
      { error: 'بيانات الدخول غير صحيحة' },
      { status: 401 }
    );
  }

  const token = await createSessionToken(username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
