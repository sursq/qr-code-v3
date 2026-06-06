import { NextRequest, NextResponse } from 'next/server';
import { listPatients, createPatient } from '@/lib/db';

export const runtime = 'nodejs';

// قائمة المراجعين مع بحث وتصفية
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = (searchParams.get('q') || '').trim();
  const status = searchParams.get('status') || '';

  const patients = await listPatients({ q, status });
  return NextResponse.json({ patients });
}

// إنشاء مراجع جديد + رقم مرجعي فريد + رمز عام ثابت لـ QR
export async function POST(req: NextRequest) {
  let body: { name?: string; phone?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'اسم المراجع مطلوب' }, { status: 400 });
  }

  const patient = await createPatient({
    name,
    phone: (body.phone || '').trim() || null,
    notes: (body.notes || '').trim() || null,
  });

  return NextResponse.json({ patient }, { status: 201 });
}
