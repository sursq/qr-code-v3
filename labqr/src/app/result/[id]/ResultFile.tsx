'use client';

import { useState } from 'react';

export function ResultFile({
  publicId,
  storedName,
  originalName,
  mimeType,
  sizeLabel,
}: {
  publicId: string;
  storedName: string;
  originalName: string;
  mimeType: string;
  sizeLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const src = `/api/files/${publicId}/${storedName}`;
  const downloadHref = `${src}?download=1`;
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-brand-600">
            {isPdf ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            )}
          </span>
          <span className="truncate text-sm font-semibold text-slate-700" title={originalName}>
            {originalName}
          </span>
        </div>
        <span className="shrink-0 text-xs text-slate-400">{sizeLabel}</span>
      </div>

      <div className="bg-slate-50">
        {isImage && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="block w-full"
            aria-label="تكبير الصورة"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={originalName}
              className={`mx-auto w-full object-contain transition-all ${expanded ? 'max-h-none' : 'max-h-[420px]'}`}
              loading="lazy"
            />
          </button>
        )}
        {isPdf && (
          <object data={src} type="application/pdf" className="h-[520px] w-full">
            <div className="p-6 text-center text-sm text-slate-500">
              لا يمكن عرض ملف PDF داخل المتصفح. استخدم زر التحميل بالأسفل.
            </div>
          </object>
        )}
        {!isImage && !isPdf && (
          <div className="p-6 text-center text-sm text-slate-500">ملف مرفق</div>
        )}
      </div>

      <div className="px-4 py-3">
        <a href={downloadHref} download={originalName} className="btn-primary w-full">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          تحميل النتيجة
        </a>
      </div>
    </div>
  );
}
