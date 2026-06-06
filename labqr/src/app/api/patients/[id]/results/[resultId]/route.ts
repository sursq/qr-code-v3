import { NextRequest, NextResponse } from 'next/server';
import { getResultWithPatient, deleteResult } from '@/lib/db';
import { deleteResultFile } from '@/lib/storage';

export const runtime = 'nodejs';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  const { id, resultId } = await params;
  const result = await getResultWithPatient(resultId);

  if (!result || result.patient.id !== id) {
    return NextResponse.json({ error: 'الملف غير موجود' }, { status: 404 });
  }

  await deleteResultFile(result.patient.publicId, result.storedName);
  await deleteResult(result.id);

  return NextResponse.json({ ok: true });
}
