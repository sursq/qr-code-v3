import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/settings';
import { getProvider } from '@/lib/whatsapp';

export const runtime = 'nodejs';

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings, provider: getProvider() });
}

export async function PATCH(req: NextRequest) {
  let body: { labName?: string; whatsappEnabled?: boolean; messageTemplate?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }

  const data: { labName?: string; whatsappEnabled?: boolean; messageTemplate?: string } = {};
  if (typeof body.labName === 'string') data.labName = body.labName.trim() || 'مختبر التحاليل الطبية';
  if (typeof body.whatsappEnabled === 'boolean') data.whatsappEnabled = body.whatsappEnabled;
  if (typeof body.messageTemplate === 'string' && body.messageTemplate.trim()) {
    data.messageTemplate = body.messageTemplate.trim();
  }

  const settings = await updateSettings(data);
  return NextResponse.json({ settings });
}
