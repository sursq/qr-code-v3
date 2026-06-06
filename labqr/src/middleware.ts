import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

// المسارات المحمية: لوحة الإدارة + واجهات API الإدارية
// المسارات العامة: /result و /api/files و /login
const PROTECTED_PREFIXES = [
  '/admin',
  '/api/patients',
  '/api/settings',
  '/api/qr',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (session) return NextResponse.next();

  // واجهات API ترجع 401؛ صفحات الإدارة تُعاد توجيهاً لصفحة الدخول
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
  }
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/patients/:path*', '/api/settings/:path*', '/api/qr/:path*'],
};
