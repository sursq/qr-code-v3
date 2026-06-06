import { NextRequest, NextResponse } from 'next/server';
import {
  getPatientById,
  updatePatientInfo,
  deletePatient,
} from '@/lib/db';
import { deletePatientDir } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const patient = await getPatientById(id);
  if (!patient) {
    return NextResponse.json({ error: 'المراجع غير موجود' }, { status: 404 });
  }
  return NextResponse.json({ patient });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { name?: string; phone?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }

  const data: { name?: string; phone?: string | null; notes?: string | null } = {};
  if (typeof body.name === 'string') {
    const n = body.name.trim();
    if (!n) return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
    data.name = n;
  }
  if (typeof body.phone === 'string') data.phone = body.phone.trim() || null;
  if (typeof body.notes === 'string') data.notes = body.notes.trim() || null;

  const patient = await updatePatientInfo(id, data);
  if (!patient) {
    return NextResponse.json({ error: 'المراجع غير موجود' }, { status: 404 });
  }
  return NextResponse.json({ patient });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await deletePatient(id);
  if (!deleted) {
    return NextResponse.json({ error: 'المراجع غير موجود' }, { status: 404 });
  }
  // حذف ملفات المراجع من القرص بعد إزالة سجلّاته
  await deletePatientDir(deleted.publicId);
  return NextResponse.json({ ok: true });
}
