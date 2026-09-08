# indigo perso

indigo perso personel takip sistemi — QR mesai, izin, raporlar.

## Stack

- Next.js (App Router) + Tailwind + shadcn/ui
- PostgreSQL (Neon — Vercel Marketplace; Railway `DATABASE_URL` ile de çalışır)
- Drizzle ORM
- Auth.js (admin / personel)

## Yerel çalışma

```bash
npm install
# .env.local: DATABASE_URL, AUTH_SECRET, AUTH_URL
npm run db:push
npm run dev
```

İlk açılışta `/kurulum` üzerinden admin hesabı oluşturun.

## Ortam değişkenleri

- `DATABASE_URL` — PostgreSQL bağlantısı
- `AUTH_SECRET` — Auth.js gizli anahtar
- `AUTH_URL` — Uygulama URL (örn. https://indigo-personel.vercel.app)
