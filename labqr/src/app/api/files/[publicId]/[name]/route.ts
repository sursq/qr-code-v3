import { NextRequest, NextResponse } from 'next/server';
import { getPatientRecordByPublicId, findResultByStoredName } from '@/lib/db';
import { readResultFile } from '@/lib/storage';

export const runtime = 'nodejs';

// خدمة ملفات النتائج للعرض العام عبر رابط QR.
// البوابة الأمنية هي publicId غير القابل للتخمين (16 حرفاً).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string; name: string }> }
) {
  const { publicId, name } = await params;
  const patient = await getPatientRecordByPublicId(publicId);
  if (!patient) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  }

  const result = await findResultByStoredName(patient.id, name);
  if (!result) {
    return NextResponse.json({ error: 'الملف غير موجود' }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await readResultFile(publicId, name);
  } catch {
    return NextResponse.json({ error: 'تعذّر قراءة الملف' }, { status: 404 });
  }

  const download = req.nextUrl.searchParams.get('download') === '1';
  // اسم آمن ASCII كاحتياط + الاسم العربي الصحيح عبر filename* (RFC 5987)
  const asciiFallback = result.storedName;
  const utf8Name = encodeURIComponent(result.originalName);
  const disposition = download
    ? `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Name}`
    : 'inline';

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': result.mimeType,
      'Content-Disposition': disposition,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}
