import 'server-only';
import { resultUrl } from './qr';

// ===== وحدة إشعارات واتساب (اختيارية بالكامل) =====
// النظام يعمل كاملاً بدون هذه الوحدة. تُتحكَّم بمفتاح التفعيل في لوحة الإعدادات.
// المزوّد يُحدَّد عبر WHATSAPP_PROVIDER في .env:
//   link   (افتراضي) → يولّد رابط wa.me للإرسال اليدوي بنقرة (بدون أي API)
//   meta            → إرسال تلقائي عبر Meta WhatsApp Cloud API
//   twilio          → إرسال تلقائي عبر Twilio
//   custom          → إرسال POST إلى webhook خاص بك

export type WhatsAppResult =
  | { mode: 'sent'; provider: string }
  | { mode: 'link'; url: string }
  | { mode: 'disabled' }
  | { mode: 'no_phone' }
  | { mode: 'error'; message: string };

export function buildMessage(
  template: string,
  vars: { name: string; link: string; lab: string }
): string {
  return template
    .replaceAll('{name}', vars.name)
    .replaceAll('{link}', vars.link)
    .replaceAll('{lab}', vars.lab);
}

// تنسيق رقم الهاتف إلى أرقام فقط (صيغة دولية بدون + أو مسافات)
export function normalizePhone(phone: string): string {
  let p = phone.replace(/[^\d+]/g, '');
  p = p.replace(/^\+/, '');
  p = p.replace(/^00/, '');
  return p;
}

export function waMeLink(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

export function getProvider(): string {
  return (process.env.WHATSAPP_PROVIDER ?? 'link').toLowerCase();
}

export async function sendWhatsApp(
  phone: string | null | undefined,
  patientName: string,
  publicId: string,
  template: string,
  labName: string
): Promise<WhatsAppResult> {
  if (!phone || !phone.trim()) return { mode: 'no_phone' };

  const message = buildMessage(template, {
    name: patientName,
    link: resultUrl(publicId),
    lab: labName,
  });
  const provider = getProvider();

  try {
    switch (provider) {
      case 'meta':
        return await sendViaMeta(phone, message);
      case 'twilio':
        return await sendViaTwilio(phone, message);
      case 'custom':
        return await sendViaCustom(phone, message);
      case 'link':
      default:
        return { mode: 'link', url: waMeLink(phone, message) };
    }
  } catch (err) {
    return {
      mode: 'error',
      message: err instanceof Error ? err.message : 'فشل الإرسال',
    };
  }
}

async function sendViaMeta(phone: string, message: string): Promise<WhatsAppResult> {
  const phoneId = process.env.WHATSAPP_META_PHONE_ID;
  const token = process.env.WHATSAPP_META_TOKEN;
  if (!phoneId || !token) throw new Error('إعدادات Meta غير مكتملة في .env');

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizePhone(phone),
      type: 'text',
      text: { body: message },
    }),
  });
  if (!res.ok) throw new Error(`Meta API: ${res.status} ${await res.text()}`);
  return { mode: 'sent', provider: 'meta' };
}

async function sendViaTwilio(phone: string, message: string): Promise<WhatsAppResult> {
  const sid = process.env.WHATSAPP_TWILIO_SID;
  const token = process.env.WHATSAPP_TWILIO_TOKEN;
  const from = process.env.WHATSAPP_TWILIO_FROM;
  if (!sid || !token || !from) throw new Error('إعدادات Twilio غير مكتملة في .env');

  const body = new URLSearchParams({
    To: `whatsapp:+${normalizePhone(phone)}`,
    From: from,
    Body: message,
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }
  );
  if (!res.ok) throw new Error(`Twilio API: ${res.status} ${await res.text()}`);
  return { mode: 'sent', provider: 'twilio' };
}

async function sendViaCustom(phone: string, message: string): Promise<WhatsAppResult> {
  const url = process.env.WHATSAPP_CUSTOM_URL;
  if (!url) throw new Error('WHATSAPP_CUSTOM_URL غير مضبوط في .env');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.WHATSAPP_CUSTOM_TOKEN) {
    headers.Authorization = `Bearer ${process.env.WHATSAPP_CUSTOM_TOKEN}`;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ phone: normalizePhone(phone), message }),
  });
  if (!res.ok) throw new Error(`Custom webhook: ${res.status}`);
  return { mode: 'sent', provider: 'custom' };
}
