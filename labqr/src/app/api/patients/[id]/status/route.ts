import { NextRequest, NextResponse } from 'next/server';
import { getPatientRecord, setPatientStatus, markPatientNotified } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { sendWhatsApp, type WhatsAppResult } from '@/lib/whatsapp';

export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }

  const status = body.status;
  if (status !== 'pending' && status !== 'completed') {
    return NextResponse.json({ error: 'حالة غير صالحة' }, { status: 400 });
  }

  const existing = await getPatientRecord(id);
  if (!existing) {
    return NextResponse.json({ error: 'المراجع غير موجود' }, { status: 404 });
  }

  const patient = await setPatientStatus(id, status);
  if (!patient) {
    return NextResponse.json({ error: 'المراجع غير موجود' }, { status: 404 });
  }

  // محاولة إشعار واتساب عند الاكتمال (إن كانت الميزة مفعّلة)
  let whatsapp: WhatsAppResult | null = null;
  if (status === 'completed') {
    const settings = await getSettings();
    if (settings.whatsappEnabled) {
      whatsapp = await sendWhatsApp(
        patient.phone,
        patient.name,
        patient.publicId,
        settings.messageTemplate,
        settings.labName
      );
      if (whatsapp.mode === 'sent') {
        await markPatientNotified(patient.id);
      }
    }
  }

  return NextResponse.json({ patient, whatsapp });
}
