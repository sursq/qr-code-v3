/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // إخراج مستقل لحاويات Docker وأي استضافة Node (صورة أصغر وتشغيل أبسط)
  output: 'standalone',
  // إبقاء هذه الحزم خارج حزمة الـ bundle لمكوّنات الخادم (تعمل في بيئة Node)
  serverExternalPackages: ['bcryptjs', 'qrcode'],
};

export default nextConfig;
