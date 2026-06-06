import QRCode from 'qrcode';

// الرابط العام الثابت لكل مراجع
export function resultUrl(publicId: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000').replace(
    /\/+$/,
    ''
  );
  return `${base}/result/${publicId}`;
}

export async function qrPngDataUrl(publicId: string): Promise<string> {
  return QRCode.toDataURL(resultUrl(publicId), {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 600,
    color: { dark: '#0e7490', light: '#ffffff' },
  });
}

export async function qrPngBuffer(publicId: string): Promise<Buffer> {
  return QRCode.toBuffer(resultUrl(publicId), {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 800,
    color: { dark: '#0e7490', light: '#ffffff' },
  });
}

export async function qrSvg(publicId: string): Promise<string> {
  return QRCode.toString(resultUrl(publicId), {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: { dark: '#0e7490', light: '#ffffff' },
  });
}
