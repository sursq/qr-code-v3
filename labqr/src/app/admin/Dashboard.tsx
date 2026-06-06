'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { PatientListItem } from '@/lib/types';
import { formatDateShort, statusLabel } from '@/lib/format';

export function Dashboard() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    const res = await fetch(`/api/patients?${sp.toString()}`);
    const data = await res.json();
    setPatients(data.patients || []);
    setLoading(false);
  }, [q, status]);

  // تحميل أولي + بحث متأخر (debounce)
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const total = patients.length;
  const completed = patients.filter((p) => p.status === 'completed').length;
  const pending = total - completed;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">المراجعون</h1>
          <p className="text-sm text-slate-500">إدارة المراجعين ونتائج التحاليل ورموز QR</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          مراجع جديد
        </button>
      </div>

      {/* الإحصائيات */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard label="الإجمالي" value={total} tone="brand" />
        <StatCard label="قيد الانتظار" value={pending} tone="amber" />
        <StatCard label="مكتمل" value={completed} tone="emerald" />
      </div>

      {/* البحث والتصفية */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            className="input pe-10"
            placeholder="ابحث بالاسم أو رقم المرجع أو الهاتف…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          <option value="pending">قيد الانتظار</option>
          <option value="completed">مكتمل</option>
        </select>
      </div>

      {/* القائمة */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">جارٍ التحميل…</div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-semibold text-slate-600">لا يوجد مراجعون</p>
            <p className="mt-1 text-sm text-slate-400">أضف أول مراجع للبدء</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {patients.map((p) => (
              <Link
                key={p.id}
                href={`/admin/patients/${p.id}`}
                className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900">{p.name}</p>
                  <p className="font-mono text-xs text-slate-400">{p.refNumber}</p>
                </div>
                <div className="hidden text-xs text-slate-400 sm:block">
                  {p._count?.results ?? 0} ملف
                </div>
                <div className="hidden text-xs text-slate-400 sm:block">
                  {formatDateShort(p.createdAt)}
                </div>
                <StatusBadge status={p.status} />
                <svg className="h-4 w-4 shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddPatientModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'brand' | 'amber' | 'emerald' }) {
  const tones = {
    brand: 'text-brand-700',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
  };
  return (
    <div className="card px-4 py-4 text-center">
      <p className={`text-3xl font-extrabold ${tones[tone]}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{label}</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">{statusLabel(status)}</span>;
  }
  return <span className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-100">{statusLabel(status)}</span>;
}

function AddPatientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) {
      setError('اسم المراجع مطلوب');
      return;
    }
    setSaving(true);
    setError('');
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, notes }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'تعذّر الحفظ');
      setSaving(false);
      return;
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-extrabold text-slate-900">إضافة مراجع جديد</h2>
        <div className="space-y-3">
          <div>
            <label className="label">الاسم *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="اسم المراجع الكامل" />
          </div>
          <div>
            <label className="label">رقم الهاتف (مع رمز الدولة)</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="مثال: 9647701234567" inputMode="tel" />
          </div>
          <div>
            <label className="label">ملاحظات (اختياري)</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        </div>
        <div className="mt-5 flex gap-2">
          <button className="btn-primary flex-1" onClick={submit} disabled={saving}>
            {saving ? 'جارٍ الحفظ…' : 'إنشاء + توليد QR'}
          </button>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
