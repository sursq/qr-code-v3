# نظام إدارة نتائج التحاليل المخبرية — QR

نظام كامل وجاهز للإنتاج لإدارة نتائج التحاليل المخبرية، مع رمز **QR ثابت لكل مراجع** يؤدي إلى صفحة نتائج عامة. عند مسح الرمز يرى المراجع نتائجه (صور / PDF) إن كانت جاهزة، أو رسالة «قيد التجهيز» إن لم تكتمل بعد. يتضمّن لوحة إدارة آمنة بمستخدم واحد، وإشعارات واتساب اختيارية.

> **الواجهة بالكامل عربية (RTL)** ومتجاوبة مع الجوال.

---

## أبرز المزايا

- **رمز QR ثابت دائم لكل مراجع** — لا يتغيّر أبداً، يمكن طباعته مرة واحدة على بطاقة المراجع.
- **رابط عام غير قابل للتخمين** — كل مراجع له رمز سري (16 حرفاً) في الرابط، فلا يستطيع أحد تصفّح نتائج الآخرين بتغيير الرقم. الرقم المتسلسل البشري (`LAB-0001`) يظهر داخل لوحة الإدارة فقط.
- **لوحة إدارة كاملة**: إضافة / تعديل / حذف / بحث في المراجعين، تغيير الحالة (قيد الانتظار ↔ مكتمل)، رفع ملفات النتائج (صور و PDF)، طباعة وتنزيل QR (PNG / SVG).
- **صفحة نتائج عامة** تعرض «قيد التجهيز» قبل الاكتمال، ثم تعرض الملفات مع إمكانية التحميل.
- **إشعارات واتساب اختيارية** (مطفأة افتراضياً) — رابط `wa.me` بنقرة واحدة، أو إرسال تلقائي عبر Meta / Twilio / Webhook خاص.
- **تخزين مدمج بالكامل** — لا قاعدة بيانات خارجية ولا خدمات مدفوعة ولا أي شيء يعمل في الخلفية. البيانات في ملف واحد شفّاف تملكه أنت.

---

## المتطلبات

- **Node.js 18.18 أو أحدث** (يُنصح بـ 20 LTS أو أحدث).
- لا يحتاج أي صلاحيات إدارية، ولا أي مترجم (compiler)، ولا أي تنزيلات في الخلفية — لا توجد وحدات أصلية (native modules).

---

## التشغيل السريع

```bash
# 1) تثبيت الحزم
npm install

# 2) إنشاء ملف الإعدادات من القالب
cp .env.example .env
#   ثم افتح .env وغيّر كلمة المرور و AUTH_SECRET (مهم جداً)

# 3) التشغيل للتطوير
npm run dev
#   افتح http://localhost:3000  ← ستُوجَّه إلى صفحة الدخول

# أو التشغيل للإنتاج
npm run build
npm run start
```

أول دخول يكون باسم المستخدم وكلمة المرور المضبوطين في `.env`.

---

## متغيّرات البيئة (`.env`)

| المتغيّر | الوصف | إلزامي |
|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | عنوان الموقع العام؛ يُستخدم لتوليد روابط QR. في الإنتاج ضع نطاقك الحقيقي. | نعم |
| `ADMIN_USERNAME` | اسم مستخدم المدير. | نعم |
| `ADMIN_PASSWORD` | كلمة مرور المدير. تدعم نصاً صريحاً أو هاش bcrypt (يبدأ بـ `$2`). | نعم |
| `AUTH_SECRET` | مفتاح سري طويل لتوقيع الجلسات. ولّده بـ `openssl rand -base64 48`. | نعم |
| `DATABASE_FILE` | (اختياري) مسار ملف البيانات. الافتراضي `data/db.json`. | لا |
| `WHATSAPP_PROVIDER` | `link` (افتراضي) أو `meta` أو `twilio` أو `custom`. | لا |

> **كلمة مرور بصيغة hash (موصى به للإنتاج):** يمكنك توليد هاش bcrypt ووضعه مباشرة في `ADMIN_PASSWORD`:
> ```bash
> node -e "console.log(require('bcryptjs').hashSync('كلمة_السر_هنا', 10))"
> ```

---

## كيف تعمل آلية QR والخصوصية

- لكل مراجع حقلان: `refNumber` (متسلسل بشري مثل `LAB-0001` للعرض الإداري) و `publicId` (رمز عشوائي من 16 حرفاً).
- رابط QR هو: `‎{NEXT_PUBLIC_BASE_URL}/result/{publicId}` — ثابت لا يتغيّر مدى الحياة.
- صفحة النتائج العامة وخدمة الملفات تتحقّقان من `publicId` فقط؛ ولأنه غير قابل للتخمين، لا يمكن لأحد الوصول لنتائج غيره. لا يُكشف الرقم المتسلسل في أي رابط عام.
- ملفات النتائج تُخزَّن خارج مجلد `public` وتُخدَّم عبر مسار محكوم (`/api/files/...`) لا يسمح إلا بالملفات المرتبطة فعلاً بذلك المراجع.

---

## تخزين البيانات

النظام يستخدم طبقة تخزين مدمجة (`src/lib/db.ts`) تحفظ البيانات في ملف JSON واحد: `data/db.json`، مع **كتابة ذرّية** (ملف مؤقت ثم إعادة تسمية) و**طابور كتابة متسلسل** لمنع التلف عند الكتابات المتزامنة.

- **شفّاف 100%**: يمكنك فتح الملف وقراءته ونسخه احتياطياً ببساطة (انسخ `data/db.json` ومجلد `data/uploads`).
- ملفات النتائج المرفوعة تُخزَّن في `data/uploads/{publicId}/`.
- لأخذ نسخة احتياطية كاملة، يكفي نسخ مجلد `data` بأكمله.

### الانتقال إلى قاعدة بيانات أخرى لاحقاً
كل منطق التخزين معزول في ملف واحد (`src/lib/db.ts`) يصدّر دوال واضحة (`listPatients`, `createPatient`, `addResult`, ...). للانتقال إلى PostgreSQL أو غيره، استبدل تنفيذ هذه الدوال فقط دون لمس بقية النظام.

---

## إشعارات واتساب (اختيارية)

الميزة **مطفأة افتراضياً**، والنظام يعمل كاملاً بدونها. تُفعَّل من صفحة الإعدادات داخل اللوحة. المزوّد يُحدَّد عبر `WHATSAPP_PROVIDER`:

- **`link`** (افتراضي): يولّد رابط `wa.me` جاهزاً تفتحه بنقرة لإرسال الرسالة يدوياً من هاتفك — بدون أي حساب أو API.
- **`meta`**: إرسال تلقائي عبر Meta WhatsApp Cloud API. يتطلب `WHATSAPP_META_PHONE_ID` و `WHATSAPP_META_TOKEN`.
- **`twilio`**: إرسال تلقائي عبر Twilio. يتطلب `WHATSAPP_TWILIO_SID` و `WHATSAPP_TWILIO_TOKEN` و `WHATSAPP_TWILIO_FROM`.
- **`custom`**: إرسال `POST` إلى Webhook خاص بك بصيغة `{ "phone": "...", "message": "..." }`. يتطلب `WHATSAPP_CUSTOM_URL`.

قالب الرسالة قابل للتعديل من الإعدادات ويدعم المتغيّرات: `{name}` و `{link}` و `{lab}`.

---

## النشر (Deployment)

النظام تطبيق Next.js قياسي يستخدم **تخزيناً ملفّياً** (`data/db.json` + `data/uploads/`)، لذا يحتاج بيئة تشغيل توفّر:
- **قرصاً دائماً** (Persistent disk) للاحتفاظ بالبيانات بين عمليات إعادة التشغيل.
- **نسخة واحدة (instance) من التطبيق** (التخزين الملفّي مصمَّم لخادم واحد).

### ✅ الاستضافات الموصى بها (تعمل مباشرة بلا تعديل)
خادم VPS خاص، Docker، Railway، Render (مع Disk)، Fly.io (مع Volume)، DigitalOcean App Platform (مع Disk)، أو أي خادم Node يسمح بالكتابة على القرص.

الخطوات:
1. اضبط `.env` بقيم الإنتاج (خصوصاً `NEXT_PUBLIC_BASE_URL` بنطاقك الحقيقي، و `AUTH_SECRET` قوي، و `ADMIN_PASSWORD`).
2. `npm install && npm run build`.
3. `npm run start` (المنفذ 3000 افتراضياً؛ غيّره بـ `PORT=8080 npm run start`).
4. ضعه خلف Nginx/Caddy مع HTTPS، وتأكّد أن مجلد `data/` قابل للكتابة ومشمول بالنسخ الاحتياطي.

### 🐳 عبر Docker (أبسط طريقة لأي استضافة حاويات)
المشروع يتضمّن `Dockerfile` جاهزاً (يستخدم إخراج Next.js المستقل):
```bash
docker build -t lab-qr .
docker run -d -p 3000:3000 \
  --env-file .env \
  -v "$(pwd)/data:/app/data" \
  lab-qr
```
ربط الحجم `-v .../data:/app/data` ضروري للاحتفاظ بالبيانات والملفات.

### ⚠️ بخصوص Vercel (والمنصّات serverless المشابهة)

**أولاً — متغيّرات البيئة (سبب خطأ 500 عند تسجيل الدخول):**
ملف `.env` لا يُرفع إلى Vercel. يجب ضبط المتغيّرات يدوياً في:
لوحة Vercel ← المشروع ← **Settings ← Environment Variables**، ثم **إعادة النشر (Redeploy)**. على الأقل:
- `AUTH_SECRET` — قيمة عشوائية طويلة (16 حرفاً فأكثر). بدونها يفشل الدخول بخطأ 500.
- `ADMIN_USERNAME` و `ADMIN_PASSWORD`.
- `NEXT_PUBLIC_BASE_URL` — رابط مشروعك على Vercel.

**ثانياً — التخزين:**
Vercel يشغّل التطبيق في بيئة **serverless** نظام ملفاتها مؤقّت وللقراءة فقط، لذلك **لن تُحفظ البيانات أو الملفات** على Vercel بالاعتماد على التخزين الملفّي الحالي (ستُفقد عند كل تشغيل/نشر). هذا قيد في منصّة Vercel نفسها وليس خطأً في النظام. ملاحظة: تسجيل الدخول نفسه لا يكتب على القرص، لذا يعمل على Vercel بمجرّد ضبط المتغيّرات أعلاه؛ لكن إضافة المراجعين ورفع الملفات تحتاج تخزيناً دائماً.

للنشر الكامل على Vercel تحديداً، يلزم استبدال التخزين الملفّي بخدمات سحابية:
- **قاعدة بيانات** (مثل Vercel Postgres أو Supabase أو Neon) بدل `data/db.json`.
- **تخزين ملفات** (مثل Vercel Blob أو Supabase Storage أو S3) بدل `data/uploads/`.

ولأن كل منطق التخزين معزول في ملفين فقط — `src/lib/db.ts` (البيانات) و `src/lib/storage.ts` (الملفات) — فإن هذا التحويل محصور فيهما دون لمس بقية النظام. (أخبرني إن أردت نسخة جاهزة لـ Vercel بقاعدة بيانات سحابية.)

> **الخلاصة:** النظام جاهز للإنتاج 100% على أي استضافة ذات قرص دائم (وهي الأنسب لمتطلّب «التحكّم الكامل»). أما Vercel فيتطلّب التحويل إلى تخزين سحابي كما أعلاه.

---

## بنية المشروع

```
src/
  app/
    admin/                  لوحة الإدارة (محمية)
    api/                    واجهات REST (مراجعون، نتائج، QR، إعدادات، مصادقة)
    login/                  صفحة الدخول
    result/[id]/            صفحة النتائج العامة (id = publicId)
  lib/
    db.ts                   طبقة التخزين (JSON ذرّي)
    auth.ts / session.ts    المصادقة والجلسات (JWT في كوكي httpOnly)
    storage.ts              حفظ/قراءة/حذف ملفات النتائج على القرص
    qr.ts                   توليد QR (PNG / SVG)
    whatsapp.ts             وحدة الإشعارات الاختيارية
    settings.ts             إعدادات الموقع
  middleware.ts             حماية المسارات الإدارية
data/
  db.json                   بيانات النظام (يُنشأ تلقائياً)
  uploads/                  ملفات النتائج المرفوعة
```

---

## ملاحظات أمنية

- الجلسات موقّعة بـ JWT (خوارزمية HS256) وتُخزَّن في كوكي `httpOnly`، صلاحيتها 12 ساعة.
- مقارنة كلمة المرور تتم بطريقة مقاومة لهجمات التوقيت، مع تأخير عند الفشل لإبطاء التخمين.
- غيّر `ADMIN_PASSWORD` و `AUTH_SECRET` قبل أي تشغيل حقيقي، وفعّل HTTPS في الإنتاج (الكوكي يصبح `secure` تلقائياً في وضع الإنتاج).

---

<details>
<summary><b>English summary</b></summary>

A production-ready Arabic (RTL) lab-results management system. Each patient gets a **permanent QR code** linking to a public page at `/result/{publicId}`. Scanning shows the results (images/PDF) when ready, or a "being prepared" message otherwise.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS. Authentication uses a single admin account (env-configured) with a signed JWT in an httpOnly cookie. Optional WhatsApp notifications (off by default).

**Storage is fully self-contained** — no external database, no paid services, no native modules, nothing running in the background. Data lives in a single transparent JSON file (`data/db.json`, atomic writes) and uploaded files in `data/uploads/`. All storage logic is isolated in `src/lib/db.ts`, so switching to PostgreSQL later means reimplementing that one file only.

**Privacy:** the QR link uses an unguessable 16-char `publicId`, never the sequential `LAB-####` reference, so patients cannot enumerate each other's results.

**Run:**
```bash
npm install
cp .env.example .env     # then set ADMIN_PASSWORD and AUTH_SECRET
npm run dev              # or: npm run build && npm run start
```

Required env vars: `NEXT_PUBLIC_BASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (plaintext or bcrypt hash), `AUTH_SECRET`. WhatsApp provider is set via `WHATSAPP_PROVIDER` (`link` default, or `meta` / `twilio` / `custom`).

**Hosting:** because storage is file-based, deploy on any host with a **persistent disk + single instance** (VPS, Docker, Railway, Render, Fly.io, etc.). A ready `Dockerfile` is included. **Vercel and other serverless platforms are not suitable as-is** (ephemeral/read-only filesystem); using them requires swapping the file storage for a cloud database + blob storage — isolated to `src/lib/db.ts` and `src/lib/storage.ts`.

</details>
