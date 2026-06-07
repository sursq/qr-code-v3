-- =====================================================================
--  نظام نتائج التحاليل المخبرية — مخطّط قاعدة بيانات Supabase
--  شغّل هذا الملف بالكامل داخل: Supabase → SQL Editor → New query → Run
-- =====================================================================

-- جدول المراجعين
create table if not exists public.patients (
  id           text primary key,
  ref_number   text not null unique,
  public_id    text not null unique,
  name         text not null,
  phone        text,
  notes        text,
  status       text not null default 'pending',   -- pending | completed
  notified_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists patients_created_at_idx on public.patients (created_at desc);
create index if not exists patients_status_idx     on public.patients (status);

-- جدول ملفات النتائج (يُحذف تلقائياً عند حذف المراجع)
create table if not exists public.results (
  id            text primary key,
  patient_id    text not null references public.patients(id) on delete cascade,
  original_name text not null,
  mime_type     text not null,
  size          bigint not null default 0,
  storage_path  text not null,   -- المسار داخل bucket لحذف الملف
  public_url    text not null,   -- الرابط العام المعروض
  created_at    timestamptz not null default now()
);

create index if not exists results_patient_idx on public.results (patient_id);

-- جدول الإعدادات (صف واحد فقط: singleton)
create table if not exists public.settings (
  id               text primary key default 'singleton',
  lab_name         text not null default 'مختبر التحاليل الطبية',
  whatsapp_enabled boolean not null default false,
  message_template text not null default 'مرحباً {name}، نتائج تحاليلك من {lab} أصبحت جاهزة. اطّلع عليها هنا: {link}',
  updated_at       timestamptz not null default now()
);

insert into public.settings (id) values ('singleton')
on conflict (id) do nothing;

-- =====================================================================
--  أمان (RLS):
--  التطبيق يصل إلى البيانات عبر مفتاح service_role من جهة الخادم فقط،
--  وهذا المفتاح يتجاوز RLS. لذلك نُفعّل RLS بدون سياسات عامة، فلا يمكن
--  لأي مفتاح عام (anon) قراءة الجداول مباشرةً.
-- =====================================================================
alter table public.patients enable row level security;
alter table public.results  enable row level security;
alter table public.settings enable row level security;

-- =====================================================================
--  التخزين (Storage):
--  أنشئ Bucket عاماً (Public) باسم lab-results من واجهة Supabase:
--    Storage → New bucket → Name: lab-results → Public bucket: ON
--  أو نفّذ هذا (إن لم يكن موجوداً):
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('lab-results', 'lab-results', true)
on conflict (id) do nothing;
