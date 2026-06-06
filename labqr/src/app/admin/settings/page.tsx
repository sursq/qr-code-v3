'use client';

import { useEffect, useState } from 'react';
import type { AppSettings } from '@/lib/types';

const PROVIDER_LABELS: Record<string, string> = {
  link: 'رابط wa.me (إرسال يدوي بنقرة — بدون أي API)',
  meta: 'Meta WhatsApp Cloud API (إرسال تلقائي)',
  twilio: 'Twilio (إرسال تلقائي)',
  custom: 'Webhook مخصص (إرسال تلقائي)',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [provider, setProvider] = useState('link');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings);
        setProvider(d.provider || 'link');
      });
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        labName: settings.labName,
        whatsappEnabled: settings.whatsappEnabled,
        messageTemplate: settings.messageTemplate,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  if (!settings) return <div className="py-20 text-center text-sm text-slate-400">جارٍ التحميل…</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-extrabold text-slate-900">الإعدادات</h1>
      <p className="mb-6 text-sm text-slate-500">جميع الإعدادات تحت تحكمك الكامل</p>

      <div className="space-y-5">
        {/* عام */}
        <div className="card p-5">
          <h2 className="mb-4 font-extrabold text-slate-900">عام</h2>
          <label className="label">اسم المختبر</label>
          <input
            className="input"
            value={settings.labName}
            onChange={(e) => setSettings({ ...settings, labName: e.target.value })}
          />
          <p className="mt-1.5 text-xs text-slate-400">يظهر في صفحة النتائج العامة وفي لوحة الإدارة.</p>
        </div>

        {/* واتساب */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-slate-900">إشعارات واتساب</h2>
              <p className="text-xs text-slate-400">ميزة اختيارية بالكامل — النظام يعمل كاملاً بدونها.</p>
            </div>
            <Toggle
              on={settings.whatsappEnabled}
              onChange={(v) => setSettings({ ...settings, whatsappEnabled: v })}
            />
          </div>

          {settings.whatsappEnabled && (
            <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
              <div className="rounded-xl bg-brand-50/60 px-4 py-3 text-xs text-brand-800 ring-1 ring-brand-100">
                <span className="font-bold">المزوّد الحالي:</span> {PROVIDER_LABELS[provider] || provider}
                <br />
                <span className="text-brand-700/80">يُضبط عبر WHATSAPP_PROVIDER في ملف .env</span>
              </div>
              <div>
                <label className="label">قالب الرسالة</label>
                <textarea
                  className="input font-mono text-xs"
                  rows={3}
                  value={settings.messageTemplate}
                  onChange={(e) => setSettings({ ...settings, messageTemplate: e.target.value })}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  المتغيرات المتاحة: <code className="rounded bg-slate-100 px-1">{'{name}'}</code> اسم المراجع،{' '}
                  <code className="rounded bg-slate-100 px-1">{'{link}'}</code> رابط النتيجة،{' '}
                  <code className="rounded bg-slate-100 px-1">{'{lab}'}</code> اسم المختبر.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}
          </button>
          {saved && <span className="text-sm font-semibold text-emerald-600">✓ تم الحفظ</span>}
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 rounded-full transition ${on ? 'bg-brand-600' : 'bg-slate-300'}`}
      role="switch"
      aria-checked={on}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'start-1' : 'start-6'}`}
      />
    </button>
  );
}
