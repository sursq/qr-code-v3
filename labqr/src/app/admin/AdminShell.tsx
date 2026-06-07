'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  {
    href: '/admin',
    label: 'المراجعون',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    ),
  },
  {
    href: '/admin/settings',
    label: 'الإعدادات',
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </>
    ),
  },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-pop">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082" />
        </svg>
      </div>
      <div className="leading-tight">
        <p className="text-sm font-extrabold text-slate-900">نظام المختبر</p>
        <p className="text-[11px] text-slate-400">لوحة الإدارة</p>
      </div>
    </div>
  );
}

export function AdminShell({
  labName,
  username,
  children,
}: {
  labName: string;
  username: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === '/admin')
      return pathname === '/admin' || pathname.startsWith('/admin/patients');
    return pathname.startsWith(href);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  const navList = (
    <nav className="flex flex-col gap-1">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${
            isActive(l.href)
              ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-100'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            {l.icon}
          </svg>
          {l.label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="mt-auto border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center gap-2.5 px-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
          {username.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-700">{username}</p>
          <p className="truncate text-[11px] text-slate-400">{labName}</p>
        </div>
      </div>
      <button
        onClick={logout}
        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
        </svg>
        تسجيل الخروج
      </button>
    </div>
  );

  return (
    <div className="min-h-screen lg:pr-[264px]">
      {/* الشريط الجانبي — سطح المكتب */}
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-[264px] flex-col border-l border-slate-200 bg-white/90 px-4 py-5 backdrop-blur lg:flex">
        <div className="px-1">
          <Logo />
        </div>
        <div className="mt-7 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          القائمة
        </div>
        <div className="mt-2">{navList}</div>
        {footer}
      </aside>

      {/* الشريط العلوي — الجوال */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl p-2 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          aria-label="فتح القائمة"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </header>

      {/* درج الجوال */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[280px] flex-col bg-white px-4 py-5 shadow-pop animate-fade-in">
            <div className="flex items-center justify-between px-1">
              <Logo />
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="إغلاق">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-7 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">القائمة</div>
            <div className="mt-2">{navList}</div>
            {footer}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
