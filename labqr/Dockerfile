# ===== مرحلة البناء =====
FROM node:20-alpine AS builder
WORKDIR /app

# تثبيت التبعيات بالاعتماد على ملف القفل (بناء قابل للتكرار)
COPY package.json package-lock.json* ./
RUN npm ci

# نسخ المصدر والبناء
COPY . .
RUN npm run build

# ===== مرحلة التشغيل =====
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# مستخدم غير جذري للأمان
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# نسخ مخرجات Next.js المستقلة (standalone)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# مجلد البيانات (يُفضّل ربطه بـ volume للاحتفاظ بالبيانات)
RUN mkdir -p /app/data/uploads && chown -R nextjs:nodejs /app/data
VOLUME /app/data

USER nextjs
EXPOSE 3000

# خادم Next.js المستقل
CMD ["node", "server.js"]
