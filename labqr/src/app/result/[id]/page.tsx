import { notFound } from 'next/navigation';
import { getPatientByPublicId } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { formatDate, formatBytes } from '@/lib/format';
import { ResultFile } from './ResultFile';

export const dynamic = 'force-dynamic';

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatientByPublicId(id);

  if (!patient) notFound();

  const settings = await getSettings();
  const isReady = patient.status === 'completed' && patient.results.length > 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      {/* الترويسة */}
      <header className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">{settings.labName}</h1>
        <p className="mt-1 text-sm text-slate-500">نتائج التحاليل المخبرية</p>
      </header>

      {/* بطاقة بيانات المراجع */}
      <div className="card mb-5 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-400">المراجع</p>
            <p className="text-lg font-bold text-slate-900">{patient.name}</p>
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-400">رقم المرجع</p>
            <p className="font-mono text-sm font-bold text-brand-700">{patient.refNumber}</p>
          </div>
        </div>
      </div>

      {/* المحتوى */}
      {isReady ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
            <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              ● النتائج جاهزة
            </span>
          </div>
          {patient.results.map((r) => (
            <ResultFile
              key={r.id}
              publicId={patient.publicId}
              storedName={r.storedName}
              originalName={r.originalName}
              mimeType={r.mimeType}
              sizeLabel={formatBytes(r.size)}
            />
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center px-6 py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">التحاليل قيد التجهيز</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            لم تكتمل نتائج تحاليلك بعد. يرجى المحاولة لاحقاً، وسيتم عرض النتائج هنا فور جاهزيتها.
          </p>
        </div>
      )}

      <footer className="mt-auto pt-10 text-center text-xs text-slate-400">
        <p>آخر تحديث: {formatDate(patient.updatedAt)}</p>
        <p className="mt-1">© {new Date().getFullYear()} {settings.labName}</p>
      </footer>
    </div>
  );
}
