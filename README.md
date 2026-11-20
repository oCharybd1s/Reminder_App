# Pengingat (PWA)

Catat tanggal penting (STNK, pajak, asuransi, dll). Setiap pagi jam 07:00 WIB, Vercel Cron mengirim push notification untuk semua item yang sudah masuk jendela pengingat (mis. H-30), **setiap hari sampai hari H**, dan tetap diingatkan kalau sudah lewat sampai kamu tekan **✓ Selesai**. Item berulang (tiap bulan / tahun / 5 tahun) otomatis pindah ke periode berikutnya saat ditandai selesai.

## Deploy ke Vercel

1. Push repo ini ke GitHub, lalu import di Vercel (Framework terdeteksi otomatis: **Vite**). Frontend React + Tailwind ada di `src/`, API di `api/`.
2. Firebase Console (project `reminder-app-29f1e`):
   - **Build → Firestore Database → Create database** (mode *production*; rules biarkan terkunci, server memakai Admin SDK).
   - **Project settings → Service accounts → Generate new private key** → salin isi JSON-nya ke env `FIREBASE_SERVICE_ACCOUNT`.
3. Buat VAPID key: `npx web-push generate-vapid-keys`
4. Isi Environment Variables (lihat `.env.example`): `APP_PASSWORD`, `CRON_SECRET`, `FIREBASE_SERVICE_ACCOUNT` (string acak panjang), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
5. Redeploy. Buka situsnya → masukkan password → **Aktifkan notifikasi** → **Tes notifikasi**.

**iPhone:** push hanya jalan setelah Share → *Add to Home Screen* (iOS 16.4+), lalu buka dari ikon dan aktifkan notifikasi di sana.

Jadwal cron ada di `vercel.json` (`0 0 * * *` = 00:00 UTC = 07:00 WIB). Plan Hobby hanya boleh cron harian dan waktunya bisa meleset sampai ~1 jam.

## Lokal

```
npm install
npm test        # tes logika tanggal
npx vercel dev  # frontend + /api (npm run dev hanya frontend)
```
