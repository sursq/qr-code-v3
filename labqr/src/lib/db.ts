import 'server-only';
import { readFileSync, existsSync } from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import type {
  PatientListItem,
  PatientDetail,
  ResultItem,
} from './types';

// ===== طبقة تخزين البيانات (بدون أي قاعدة بيانات خارجية أو وحدات أصلية) =====
// البيانات تُحفظ في ملف JSON واحد قابل للقراءة بالكامل: data/db.json
// كتابة ذرّية (ملف مؤقت ثم إعادة تسمية) + طابور كتابة لمنع التزاحم.
// شفّاف 100%: يمكنك فتح الملف وقراءته ونسخه احتياطياً بسهولة.
// للتحويل لقاعدة بيانات أخرى لاحقاً، يكفي استبدال هذا الملف وحده.

export type PatientStatus = 'pending' | 'completed';

export interface PatientRecord {
  id: string;
  refNumber: string;
  publicId: string;
  name: string;
  phone: string | null;
  notes: string | null;
  status: PatientStatus;
  notifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResultRecord {
  id: string;
  patientId: string;
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface SettingsRecord {
  id: string;
  labName: string;
  whatsappEnabled: boolean;
  messageTemplate: string;
  updatedAt: string;
}

interface DBShape {
  patients: PatientRecord[];
  results: ResultRecord[];
  settings: SettingsRecord;
}

const DEFAULT_LAB_NAME = 'مختبر التحاليل الطبية';
const DEFAULT_TEMPLATE =
  'مرحباً {name}، نتائج تحاليلك من {lab} أصبحت جاهزة. اطّلع عليها هنا: {link}';

function defaultSettings(): SettingsRecord {
  return {
    id: 'singleton',
    labName: DEFAULT_LAB_NAME,
    whatsappEnabled: false,
    messageTemplate: DEFAULT_TEMPLATE,
    updatedAt: new Date().toISOString(),
  };
}

const DB_FILE = process.env.DATABASE_FILE
  ? path.resolve(process.env.DATABASE_FILE)
  : path.join(process.cwd(), 'data', 'db.json');

// الإبقاء على نسخة واحدة في الذاكرة حتى مع إعادة التحميل الساخن في التطوير
const globalForDb = globalThis as unknown as { __labDb?: DBShape };

function load(): DBShape {
  if (globalForDb.__labDb) return globalForDb.__labDb;

  let data: DBShape;
  try {
    if (existsSync(DB_FILE)) {
      const raw = readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<DBShape>;
      data = {
        patients: Array.isArray(parsed.patients) ? parsed.patients : [],
        results: Array.isArray(parsed.results) ? parsed.results : [],
        settings: { ...defaultSettings(), ...(parsed.settings ?? {}) },
      };
    } else {
      data = { patients: [], results: [], settings: defaultSettings() };
    }
  } catch {
    // ملف تالف أو غير صالح — نبدأ بقاعدة نظيفة بدلاً من التعطّل
    data = { patients: [], results: [], settings: defaultSettings() };
  }

  globalForDb.__labDb = data;
  return data;
}

// طابور كتابة متسلسل لضمان عدم تداخل عمليات الحفظ على القرص
let writeChain: Promise<void> = Promise.resolve();

function persist(): Promise<void> {
  const snapshot = JSON.stringify(globalForDb.__labDb, null, 2);
  writeChain = writeChain
    .then(async () => {
      await fsp.mkdir(path.dirname(DB_FILE), { recursive: true });
      const tmp = `${DB_FILE}.tmp`;
      await fsp.writeFile(tmp, snapshot, 'utf8');
      await fsp.rename(tmp, DB_FILE);
    })
    .catch((e) => {
      console.error('[db] فشل حفظ البيانات:', e);
    });
  return writeChain;
}

function nowISO(): string {
  return new Date().toISOString();
}

function countResults(db: DBShape, patientId: string): number {
  let n = 0;
  for (const r of db.results) if (r.patientId === patientId) n += 1;
  return n;
}

function toListItem(db: DBShape, p: PatientRecord): PatientListItem {
  return { ...p, _count: { results: countResults(db, p.id) } };
}

function resultsOf(db: DBShape, patientId: string): ResultItem[] {
  return db.results
    .filter((r) => r.patientId === patientId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((r) => ({
      id: r.id,
      storedName: r.storedName,
      originalName: r.originalName,
      mimeType: r.mimeType,
      size: r.size,
      createdAt: r.createdAt,
    }));
}

function withResults(db: DBShape, p: PatientRecord): PatientDetail {
  return { ...p, results: resultsOf(db, p.id) };
}

// ===================== المراجعون =====================

export async function listPatients(opts: {
  q?: string;
  status?: string;
}): Promise<PatientListItem[]> {
  const db = load();
  const q = (opts.q || '').trim().toLowerCase();
  const status = opts.status;

  let rows = db.patients.slice();
  if (status === 'pending' || status === 'completed') {
    rows = rows.filter((p) => p.status === status);
  }
  if (q) {
    rows = rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.refNumber.toLowerCase().includes(q) ||
        (p.phone ? p.phone.toLowerCase().includes(q) : false)
    );
  }
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rows.map((p) => toListItem(db, p));
}

export async function createPatient(input: {
  name: string;
  phone?: string | null;
  notes?: string | null;
}): Promise<PatientRecord> {
  const db = load();

  // رقم مرجعي متسلسل فريد LAB-0001
  let maxNum = 0;
  for (const p of db.patients) {
    const m = /(\d+)$/.exec(p.refNumber);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  const refs = new Set(db.patients.map((p) => p.refNumber));
  let nextNum = maxNum + 1;
  let refNumber = `LAB-${String(nextNum).padStart(4, '0')}`;
  while (refs.has(refNumber)) {
    nextNum += 1;
    refNumber = `LAB-${String(nextNum).padStart(4, '0')}`;
  }

  // رمز عام غير قابل للتخمين وفريد
  const pubs = new Set(db.patients.map((p) => p.publicId));
  let publicId = nanoid(16);
  while (pubs.has(publicId)) publicId = nanoid(16);

  const ts = nowISO();
  const rec: PatientRecord = {
    id: nanoid(),
    refNumber,
    publicId,
    name: input.name,
    phone: input.phone ?? null,
    notes: input.notes ?? null,
    status: 'pending',
    notifiedAt: null,
    createdAt: ts,
    updatedAt: ts,
  };
  db.patients.push(rec);
  await persist();
  return rec;
}

export async function getPatientById(id: string): Promise<PatientDetail | null> {
  const db = load();
  const p = db.patients.find((x) => x.id === id);
  return p ? withResults(db, p) : null;
}

export async function getPatientByPublicId(
  publicId: string
): Promise<PatientDetail | null> {
  const db = load();
  const p = db.patients.find((x) => x.publicId === publicId);
  return p ? withResults(db, p) : null;
}

export async function getPatientRecord(
  id: string
): Promise<PatientRecord | null> {
  const db = load();
  return db.patients.find((x) => x.id === id) ?? null;
}

export async function getPatientRecordByPublicId(
  publicId: string
): Promise<PatientRecord | null> {
  const db = load();
  return db.patients.find((x) => x.publicId === publicId) ?? null;
}

export async function updatePatientInfo(
  id: string,
  data: { name?: string; phone?: string | null; notes?: string | null }
): Promise<PatientRecord | null> {
  const db = load();
  const p = db.patients.find((x) => x.id === id);
  if (!p) return null;
  if (typeof data.name === 'string') p.name = data.name;
  if (data.phone !== undefined) p.phone = data.phone;
  if (data.notes !== undefined) p.notes = data.notes;
  p.updatedAt = nowISO();
  await persist();
  return p;
}

export async function setPatientStatus(
  id: string,
  status: PatientStatus
): Promise<PatientRecord | null> {
  const db = load();
  const p = db.patients.find((x) => x.id === id);
  if (!p) return null;
  p.status = status;
  p.updatedAt = nowISO();
  await persist();
  return p;
}

export async function markPatientNotified(id: string): Promise<void> {
  const db = load();
  const p = db.patients.find((x) => x.id === id);
  if (!p) return;
  p.notifiedAt = nowISO();
  p.updatedAt = nowISO();
  await persist();
}

export async function deletePatient(
  id: string
): Promise<{ publicId: string } | null> {
  const db = load();
  const idx = db.patients.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  const { publicId } = db.patients[idx];
  db.patients.splice(idx, 1);
  db.results = db.results.filter((r) => r.patientId !== id); // حذف متتالٍ
  await persist();
  return { publicId };
}

// ===================== النتائج =====================

export async function addResult(
  patientId: string,
  info: {
    storedName: string;
    originalName: string;
    mimeType: string;
    size: number;
  }
): Promise<ResultRecord> {
  const db = load();
  const rec: ResultRecord = {
    id: nanoid(),
    patientId,
    storedName: info.storedName,
    originalName: info.originalName,
    mimeType: info.mimeType,
    size: info.size,
    createdAt: nowISO(),
  };
  db.results.push(rec);
  await persist();
  return rec;
}

export async function getResultWithPatient(resultId: string): Promise<
  | (ResultRecord & { patient: { id: string; publicId: string } })
  | null
> {
  const db = load();
  const r = db.results.find((x) => x.id === resultId);
  if (!r) return null;
  const p = db.patients.find((x) => x.id === r.patientId);
  if (!p) return null;
  return { ...r, patient: { id: p.id, publicId: p.publicId } };
}

export async function findResultByStoredName(
  patientId: string,
  storedName: string
): Promise<ResultRecord | null> {
  const db = load();
  return (
    db.results.find(
      (r) => r.patientId === patientId && r.storedName === storedName
    ) ?? null
  );
}

export async function deleteResult(resultId: string): Promise<void> {
  const db = load();
  const idx = db.results.findIndex((r) => r.id === resultId);
  if (idx === -1) return;
  db.results.splice(idx, 1);
  await persist();
}

// ===================== الإعدادات =====================

export async function getSettingsRecord(): Promise<SettingsRecord> {
  return load().settings;
}

export async function updateSettingsRecord(data: {
  labName?: string;
  whatsappEnabled?: boolean;
  messageTemplate?: string;
}): Promise<SettingsRecord> {
  const db = load();
  if (typeof data.labName === 'string') db.settings.labName = data.labName;
  if (typeof data.whatsappEnabled === 'boolean')
    db.settings.whatsappEnabled = data.whatsappEnabled;
  if (typeof data.messageTemplate === 'string')
    db.settings.messageTemplate = data.messageTemplate;
  db.settings.updatedAt = nowISO();
  await persist();
  return db.settings;
}
