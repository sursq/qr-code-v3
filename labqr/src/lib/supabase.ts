import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ===== عميل Supabase (جهة الخادم فقط) =====
// نستخدم مفتاح الخدمة (service role) للوصول الكامل من واجهات API،
// ولا يُكشف هذا المفتاح للعميل أبداً. كل عمليات قاعدة البيانات والتخزين
// تمرّ عبر واجهات API لدينا (أكثر أماناً).

export const RESULTS_BUCKET = 'lab-results';

const globalForSupabase = globalThis as unknown as {
  __supabase?: SupabaseClient;
};

export function getSupabase(): SupabaseClient {
  if (globalForSupabase.__supabase) return globalForSupabase.__supabase;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'إعداد Supabase غير مكتمل: تأكّد من ضبط SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في متغيّرات البيئة.'
    );
  }

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  globalForSupabase.__supabase = client;
  return client;
}
