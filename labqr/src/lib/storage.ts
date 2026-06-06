import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

// مجلد تخزين الملفات المرفوعة (خارج public حتى لا تُخدَّم مباشرة دون تحكّم)
const UPLOAD_ROOT = path.join(process.cwd(), 'data', 'uploads');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const MAX_SIZE = 25 * 1024 * 1024; // 25 ميجابايت للملف الواحد

export interface SavedFile {
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export function isAllowedType(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

export function maxFileSize(): number {
  return MAX_SIZE;
}

function patientDir(publicId: string): string {
  // نمنع أي محاولة لاختراق المسار
  const safe = publicId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(UPLOAD_ROOT, safe);
}

export async function saveResultFile(
  publicId: string,
  file: File
): Promise<SavedFile> {
  if (!isAllowedType(file.type)) {
    throw new Error('UNSUPPORTED_TYPE');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('TOO_LARGE');
  }

  const dir = patientDir(publicId);
  await fs.mkdir(dir, { recursive: true });

  const ext = extFromMime(file.type) || sanitizeExt(file.name);
  const storedName = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, storedName), buffer);

  return {
    storedName,
    originalName: file.name || `file${ext}`,
    mimeType: file.type,
    size: file.size,
  };
}

export async function readResultFile(
  publicId: string,
  storedName: string
): Promise<Buffer> {
  const safeName = storedName.replace(/[^a-zA-Z0-9._-]/g, '');
  const full = path.join(patientDir(publicId), safeName);
  // تأكيد بقاء المسار داخل المجلد المسموح
  if (!full.startsWith(patientDir(publicId))) throw new Error('INVALID_PATH');
  return fs.readFile(full);
}

export async function deleteResultFile(
  publicId: string,
  storedName: string
): Promise<void> {
  const safeName = storedName.replace(/[^a-zA-Z0-9._-]/g, '');
  const full = path.join(patientDir(publicId), safeName);
  try {
    await fs.unlink(full);
  } catch {
    // الملف غير موجود — نتجاهل
  }
}

export async function deletePatientDir(publicId: string): Promise<void> {
  try {
    await fs.rm(patientDir(publicId), { recursive: true, force: true });
  } catch {
    // تجاهل
  }
}

function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'application/pdf':
      return '.pdf';
    default:
      return '';
  }
}

function sanitizeExt(name: string): string {
  const m = /\.[a-zA-Z0-9]{1,5}$/.exec(name || '');
  return m ? m[0].toLowerCase() : '';
}
