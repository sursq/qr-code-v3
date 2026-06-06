import { NextRequest, NextResponse } from 'next/server';
import { getPatientRecord } from '@/lib/db';
import { qrPngBuffer, qrSvg } from '@/lib/qr';

export const runtime = 'nodejs';

// QR الخاص بمراجع. يُعرض inline افتراضياً (للمعاينة)،
// ويُحمَّل كملف عند إضافة ?download=1. الصيغة: png (افتراضي) أو ?format=svg
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const patient = await getPatientRecord(id);
  if (!patient) {
    return NextResponse.json({ error: 'المراجع غير موجود' }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const download = sp.get('download') === '1';
  const format = sp.get('format');

  if (format === 'svg') {
    const svg = await qrSvg(patient.publicId);
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        ...(download
          ? { 'Content-Disposition': `attachment; filename="QR-${patient.refNumber}.svg"` }
          : {}),
      },
    });
  }

  const png = await qrPngBuffer(patient.publicId);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      ...(download
        ? { 'Content-Disposition': `attachment; filename="QR-${patient.refNumber}.png"` }
        : {}),
    },
  });
}
