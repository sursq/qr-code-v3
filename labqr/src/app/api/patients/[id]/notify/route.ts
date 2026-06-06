import { NextRequest, NextResponse } from 'next/server';
import { getPatientRecord, markPatientNotified } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { sendWhatsApp } from '@/lib/whatsapp';

export const runtime = 'nodejs';

// إرسال/توليد إشعار واتساب يدوياً من لوحة الإدارة
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const patient = await getPatientRecord(id);
  if (!patient) {
    return NextResponse.json({ error: 'المراجع غير موجود' }, { status: 404 });
  }

  const settings = await getSettings();
  if (!settings.whatsappEnabled) {
    return NextResponse.json(
      { error: 'ميزة واتساب غير مفعّلة. فعّلها من الإعدادات أولاً.' },
      { status: 400 }
    );
  }

  const whatsapp = await sendWhatsApp(
    patient.phone,
    patient.name,
    patient.publicId,
    settings.messageTemplate,
    settings.labName
  );

  if (whatsapp.mode === 'sent') {
    await markPatientNotified(patient.id);
  }

  return NextResponse.json({ whatsapp });
}
