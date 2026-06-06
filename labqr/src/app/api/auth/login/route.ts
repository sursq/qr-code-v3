import { NextRequest, NextResponse } from 'next/server';
import { checkCredentials } from '@/lib/session';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

// يجب أن يعمل في بيئة Node (وليس Edge) لأنه يستخدم bcryptjs والكوكي
export const runtime = 'nodejs';
// منع أي تخزين مؤقت/تحسين ساكن لمسار الدخول
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1) قراءة جسم الطلب بأمان (JSON)
    let body: { username?: unknown; password?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'صيغة الطلب غير صالحة (JSON متوقّع)' },
        { status: 400 }
      );
    }

    // 2) استخلاص القيم بأمان مع التحقق من النوع (تفادي قيم undefined)
    const username =
      typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!username || !password) {
      return NextResponse.json(
        { error: 'يرجى إدخال اسم المستخدم وكلمة المرور' },
        { status: 400 }
      );
    }

    // 3) التأكد من ضبط مفتاح توقيع الجلسات قبل أي شيء.
    //    هذا هو السبب الأكثر شيوعاً لخطأ 500 على Vercel:
    //    عدم ضبط AUTH_SECRET ضمن Environment Variables.
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 16) {
      console.error(
        '[login] فشل: AUTH_SECRET غير مضبوط أو أقصر من 16 حرفاً في متغيّرات البيئة.'
      );
      return NextResponse.json(
        {
          error:
            'إعداد الخادم غير مكتمل: المتغيّر AUTH_SECRET غير مضبوط. اضبطه في إعدادات البيئة (Environment Variables) ثم أعد النشر.',
        },
        { status: 500 }
      );
    }

    // 4) التحقق من بيانات الدخول (محاطة بمعالجة أخطاء تحسّباً لكلمة مرور
    //    مُجزّأة (bcrypt) غير صالحة أو أي خطأ غير متوقّع)
    let credentialsOk = false;
    try {
      credentialsOk = checkCredentials(username, password);
    } catch (e) {
      console.error('[login] خطأ أثناء التحقق من بيانات الدخول:', e);
      return NextResponse.json(
        { error: 'تعذّر التحقق من بيانات الدخول. تحقّق من إعداد ADMIN_PASSWORD.' },
        { status: 500 }
      );
    }

    if (!credentialsOk) {
      // تأخير بسيط لإبطاء محاولات التخمين
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json(
        { error: 'بيانات الدخول غير صحيحة' },
        { status: 401 }
      );
    }

    // 5) إنشاء رمز الجلسة وضبط الكوكي الآمن
    let token: string;
    try {
      token = await createSessionToken(username);
    } catch (e) {
      console.error('[login] فشل توليد رمز الجلسة:', e);
      return NextResponse.json(
        { error: 'تعذّر إنشاء جلسة الدخول. تأكّد من صحّة AUTH_SECRET.' },
        { status: 500 }
      );
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (e) {
    // شبكة أمان نهائية: لا يخرج 500 صامت بدون رسالة مفهومة أبداً
    console.error('[login] خطأ غير متوقّع:', e);
    return NextResponse.json(
      { error: 'حدث خطأ داخلي أثناء تسجيل الدخول. حاول مجدداً.' },
      { status: 500 }
    );
  }
}
