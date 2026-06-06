'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function AdminNav({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: '/admin', label: 'المراجعون' },
    { href: '/admin/settings', label: 'الإعدادات' },
  ];

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin' || pathname.startsWith('/admin/patients');
    return pathname.startsWith(href);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            isActive(l.href)
              ? 'bg-brand-50 text-brand-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {l.label}
        </Link>
      ))}
      <button
        onClick={logout}
        className="ms-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
        title={`خروج (${username})`}
      >
        خروج
      </button>
    </nav>
  );
}
