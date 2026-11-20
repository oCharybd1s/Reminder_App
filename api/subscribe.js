import { load, save, authed } from './_lib.js';

export default async function handler(req, res) {
  // VAPID public key is public by design.
  if (req.method === 'GET') return res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
  if (req.method !== 'POST') return res.status(405).end();
  if (!authed(req)) return res.status(401).json({ error: 'Password salah' });

  const sub = req.body;
  if (!sub?.endpoint?.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) {
    return res.status(400).json({ error: 'Subscription tidak valid' });
  }
  const subs = (await load('subs')).filter((s) => s.endpoint !== sub.endpoint);
  subs.push({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
  await save('subs', subs);
  res.json({ ok: true, devices: subs.length });
}
