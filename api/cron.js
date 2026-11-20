import { load, save, sendPush, daysLeft, message, authed } from './_lib.js';

// Called daily by Vercel Cron (vercel.json). Also callable from the app ("Tes notifikasi") with the password.
export default async function handler(req, res) {
  const fromCron = process.env.CRON_SECRET && req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
  if (!fromCron && !authed(req)) return res.status(401).json({ error: 'unauthorized' });

  const [list, subs] = await Promise.all([load('reminders'), load('subs')]);
  // Notify every day from (due - remindDays) until the user marks it done, including after the due date.
  const lines = list
    .map((r) => ({ r, left: daysLeft(r.due) }))
    .filter(({ r, left }) => left <= r.remindDays)
    .sort((a, b) => a.left - b.left)
    .map(({ r, left }) => message(r, left));

  if (!lines.length && fromCron) return res.json({ reminders: 0 });
  const payload = lines.length
    ? { title: `⏰ ${lines.length} pengingat`, body: lines.join('\n') }
    : { title: 'Tes notifikasi', body: 'Push notification berhasil 🎉 (tidak ada pengingat aktif hari ini)' };

  const dead = [];
  const results = await Promise.allSettled(subs.map((s) => sendPush(s, payload)));
  results.forEach((r, i) => {
    // 404/410 = device unsubscribed; drop it so we stop sending.
    if (r.status === 'rejected' && [404, 410].includes(r.reason?.statusCode)) dead.push(subs[i].endpoint);
  });
  if (dead.length) await save('subs', subs.filter((s) => !dead.includes(s.endpoint)));

  res.json({
    reminders: lines.length,
    sent: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').map((r) => String(r.reason?.statusCode || r.reason)),
  });
}
