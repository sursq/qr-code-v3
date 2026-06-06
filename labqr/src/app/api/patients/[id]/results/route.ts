import { NextRequest, NextResponse } from 'next/server';
import { getPatientRecord, addResult } from '@/lib/db';
import { saveResultFile, isAllowedType, maxFileSize } from '@/lib/storage';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const patient = await getPatientRecord(id);
  if (!patient) {
    return NextResponse.json({ error: 'المراجع غير موجود' }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'صيغة الرفع غير صالحة' }, { status: 400 });
  }

  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: 'لم يتم اختيار أي ملف' }, { status: 400 });
  }

  const saved = [];
  const errors: string[] = [];

  for (const file of files) {
    if (!isAllowedType(file.type)) {
      errors.push(`${file.name}: نوع غير مدعوم (الصور وPDF فقط)`);
      continue;
    }
    if (file.size > maxFileSize()) {
      errors.push(`${file.name}: حجم كبير جداً (الحد ${maxFileSize() / 1048576} مب)`);
      continue;
    }
    try {
      const info = await saveResultFile(patient.publicId, file);
      const result = await addResult(patient.id, {
        storedName: info.storedName,
        originalName: info.originalName,
        mimeType: info.mimeType,
        size: info.size,
      });
      saved.push(result);
    } catch {
      errors.push(`${file.name}: فشل الحفظ`);
    }
  }

  return NextResponse.json({ saved, errors }, { status: saved.length ? 201 : 400 });
}
