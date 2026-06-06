'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PatientDetail } from '@/lib/types';
import { formatBytes } from '@/lib/format';
import { StatusBadge } from '../../Dashboard';

// نسخة من نتيجة واتساب على جهة العميل (لا نستورد الوحدة الخادمية المحمية بـ server-only)
type WaResult =
  | { mode: 'sent'; provider?: string }
  | { mode: 'link'; url: string }
  | { mode: 'no_phone' }
  | { mode: 'disabled' }
  | { mode: 'error'; message: string }
  | null
  | undefined;

const PUBLIC_BASE =
  process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.length > 0
    ? process.env.NEXT_PUBLIC_BASE_URL.replace(/\/+$/, '')
    : '';

export function PatientView({ id }: { id: string }) {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [waEnabled, setWaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'err' } | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const showToast = useCallback((msg: string, tone: 'ok' | 'err' = 'ok') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([
      fetch(`/api/patients/${id}`),
      fetch('/api/settings'),
    ]);
    if (pRes.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const pData = await pRes.json();
    setPatient(pData.patient);
    if (sRes.ok) {
      const sData = await sRes.json();
      setWaEnabled(!!sData.settings?.whatsappEnabled);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const publicLink = patient ? `${PUBLIC_BASE || window.location.origin}/result/${patient.publicId}` : '';

  async function toggleStatus() {
    if (!patient) return;
    setBusy(true);
    const next = patient.status === 'completed' ? 'pending' : 'completed';
    const res = await fetch(`/api/patients/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      showToast(data.error || 'تعذّر تحديث الحالة', 'err');
      return;
    }
    setPatient((p) => (p ? { ...p, status: next } : p));
    handleWhatsAppResult(data.whatsapp);
    if (next === 'completed') showToast('تم وضع الحالة: مكتمل');
    else showToast('تم الإرجاع لقيد الانتظار');
  }

  function handleWhatsAppResult(wa: WaResult) {
    if (!wa) return;
    if (wa.mode === 'sent') showToast('تم إرسال إشعار واتساب');
    else if (wa.mode === 'link') {
      window.open(wa.url, '_blank');
      showToast('تم فتح واتساب للإرسال اليدوي');
    } else if (wa.mode === 'no_phone') showToast('لا يوجد رقم هاتف لهذا المراجع', 'err');
    else if (wa.mode === 'error') showToast(`واتساب: ${wa.message}`, 'err');
  }

  async function sendWhatsApp() {
    setBusy(true);
    const res = await fetch(`/api/patients/${id}/notify`, { method: 'POST' });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      showToast(data.error || 'تعذّر الإرسال', 'err');
      return;
    }
    handleWhatsAppResult(data.whatsapp);
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    const res = await fetch(`/api/patients/${id}/results`, { method: 'POST', body: fd });
    const data = await res.json();
    setBusy(false);
    if (data.errors?.length) showToast(data.errors[0], 'err');
    if (data.saved?.length) showToast(`تم رفع ${data.saved.length} ملف`);
    load();
  }

  async function deleteResult(resultId: string) {
    if (!confirm('حذف هذا الملف نهائياً؟')) return;
    const res = await fetch(`/api/patients/${id}/results/${resultId}`, { method: 'DELETE' });
    if (res.ok) {
      setPatient((p) => (p ? { ...p, results: p.results.filter((r) => r.id !== resultId) } : p));
      showToast('تم حذف الملف');
    } else showToast('تعذّر الحذف', 'err');
  }

  async function deletePatient() {
    if (!confirm('حذف المراجع وكل ملفاته نهائياً؟ لا يمكن التراجع.')) return;
    const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
    if (res.ok) router.replace('/admin');
    else showToast('تعذّر الحذف', 'err');
  }

  function copyLink() {
    navigator.clipboard.writeText(publicLink).then(
      () => showToast('تم نسخ الرابط'),
      () => showToast('تعذّر النسخ', 'err')
    );
  }

  function printQR() {
    if (!patient) return;
    const w = window.open('', '_blank', 'width=480,height=640');
    if (!w) return;
    w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>QR - ${patient.refNumber}</title>
      <style>
        body{font-family:system-ui,'Cairo',sans-serif;text-align:center;padding:32px;color:#0f172a}
        h1{font-size:20px;margin:0 0 4px}
        .ref{font-family:monospace;color:#0e7490;font-weight:700;margin-bottom:16px}
        img{width:320px;height:320px}
        .name{font-size:18px;font-weight:700;margin-top:12px}
        .hint{color:#64748b;font-size:13px;margin-top:8px}
      </style></head><body>
      <h1>نتائج التحاليل المخبرية</h1>
      <div class="ref">${patient.refNumber}</div>
      <img src="/api/qr/${patient.id}" alt="QR" />
      <div class="name">${patient.name}</div>
      <div class="hint">امسح الرمز لعرض نتائج التحاليل</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
      </body></html>`);
    w.document.close();
  }

  if (loading) return <div className="py-20 text-center text-sm text-slate-400">جارٍ التحميل…</div>;
  if (notFound || !patient)
    return (
      <div className="py-20 text-center">
        <p className="font-semibold text-slate-600">المراجع غير موجود</p>
        <Link href="/admin" className="mt-3 inline-block text-sm font-semibold text-brand-600">العودة للقائمة</Link>
      </div>
    );

  return (
    <div>
      {/* مسار التنقل */}
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        كل المراجعين
      </Link>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* العمود الرئيسي */}
        <div className="space-y-5 lg:col-span-2">
          {/* بطاقة المراجع */}
          <div className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-slate-900">{patient.name}</h1>
                  <StatusBadge status={patient.status} />
                </div>
                <p className="font-mono text-sm text-slate-400">{patient.refNumber}</p>
                {patient.phone && <p className="mt-1 text-sm text-slate-500">📱 {patient.phone}</p>}
                {patient.notes && <p className="mt-2 text-sm text-slate-500">{patient.notes}</p>}
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost px-3" onClick={() => setEditing(true)} title="تعديل">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                  </svg>
                </button>
                <button className="btn-danger px-3" onClick={deletePatient} title="حذف">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button className="btn-primary" onClick={toggleStatus} disabled={busy}>
                {patient.status === 'completed' ? 'إرجاع لقيد الانتظار' : 'تعيين كمكتمل ✓'}
              </button>
              {waEnabled && (
                <button className="btn-ghost" onClick={sendWhatsApp} disabled={busy}>
                  <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.04c-.24.68-1.42 1.31-1.96 1.36-.5.05-.99.24-3.33-.69-2.8-1.1-4.6-3.95-4.74-4.14-.14-.19-1.14-1.51-1.14-2.89s.72-2.05.98-2.33c.26-.28.56-.35.75-.35.19 0 .37 0 .54.01.17.01.4-.07.63.48.24.56.81 1.95.88 2.09.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.56.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.28.14.44.12.6-.07.17-.19.69-.81.88-1.09.19-.28.37-.23.63-.14.26.09 1.66.78 1.95.92.28.14.47.21.54.33.07.12.07.68-.17 1.36z" />
                  </svg>
                  إرسال واتساب
                </button>
              )}
            </div>
          </div>

          {/* النتائج */}
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-extrabold text-slate-900">ملفات النتائج ({patient.results.length})</h2>
            </div>

            <UploadZone busy={busy} onFiles={uploadFiles} />

            {patient.results.length > 0 && (
              <ul className="mt-4 space-y-2">
                {patient.results.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="text-brand-600">
                      {r.mimeType === 'application/pdf' ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 4.5h16.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5Z" /></svg>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700">{r.originalName}</p>
                      <p className="text-xs text-slate-400">{formatBytes(r.size)}</p>
                    </div>
                    <a href={`/api/files/${patient.publicId}/${r.storedName}`} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-brand-600" title="معاينة">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                    </a>
                    <button onClick={() => deleteResult(r.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="حذف">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* عمود QR */}
        <div className="space-y-5">
          <div className="card p-5 text-center">
            <h2 className="mb-3 font-extrabold text-slate-900">رمز QR الثابت</h2>
            <div className="mx-auto inline-block rounded-2xl bg-white p-3 ring-1 ring-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/qr/${patient.id}`} alt="QR" className="h-48 w-48" />
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <input readOnly value={publicLink} className="min-w-0 flex-1 bg-transparent text-xs text-slate-500 outline-none" />
              <button onClick={copyLink} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-brand-600" title="نسخ الرابط">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={printQR}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Z" /></svg>
                طباعة
              </button>
              <a className="btn-ghost" href={`/api/qr/${patient.id}?download=1`} download>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                PNG
              </a>
              <a className="btn-ghost col-span-2" href={`/api/qr/${patient.id}?format=svg&download=1`} download>
                تحميل SVG (للطباعة عالية الجودة)
              </a>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <EditModal
          patient={patient}
          onClose={() => setEditing(false)}
          onSaved={(p) => {
            setPatient((prev) => (prev ? { ...prev, ...p } : prev));
            setEditing(false);
            showToast('تم حفظ التعديلات');
          }}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg ${toast.tone === 'ok' ? 'bg-slate-900' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function UploadZone({ busy, onFiles }: { busy: boolean; onFiles: (f: FileList | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
        drag ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-400 hover:bg-slate-50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }}
      />
      <svg className="mb-2 h-8 w-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
      </svg>
      <p className="text-sm font-semibold text-slate-700">
        {busy ? 'جارٍ الرفع…' : 'اسحب الملفات هنا أو اضغط للرفع'}
      </p>
      <p className="mt-1 text-xs text-slate-400">صور (JPG/PNG/WEBP) أو PDF — حتى 25 ميجابايت</p>
    </div>
  );
}

function EditModal({
  patient,
  onClose,
  onSaved,
}: {
  patient: PatientDetail;
  onClose: () => void;
  onSaved: (p: { name: string; phone: string | null; notes: string | null }) => void;
}) {
  const [name, setName] = useState(patient.name);
  const [phone, setPhone] = useState(patient.phone ?? '');
  const [notes, setNotes] = useState(patient.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!name.trim()) { setError('الاسم مطلوب'); return; }
    setSaving(true);
    const res = await fetch(`/api/patients/${patient.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, notes }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || 'تعذّر الحفظ'); return; }
    onSaved({ name: name.trim(), phone: phone.trim() || null, notes: notes.trim() || null });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-extrabold text-slate-900">تعديل بيانات المراجع</h2>
        <div className="space-y-3">
          <div><label className="label">الاسم *</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="label">رقم الهاتف</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></div>
          <div><label className="label">ملاحظات</label><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        </div>
        <div className="mt-5 flex gap-2">
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ'}</button>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
