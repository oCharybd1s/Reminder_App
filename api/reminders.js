import { load, save, authed } from './_lib.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Validate and normalise a reminder from the request body; returns null when invalid.
function parse({ title, due, remindDays = 30, repeatMonths = 0 } = {}) {
  title = String(title ?? '').trim();
  if (!title || !DATE.test(due) || isNaN(Date.parse(due))) return null;
  return {
    title: title.slice(0, 100),
    due,
    remindDays: Math.max(0, parseInt(remindDays) || 0),
    repeatMonths: Math.max(0, parseInt(repeatMonths) || 0),
  };
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Password salah' });
  let list = await load('reminders');
  const { id } = req.query;

  if (req.method === 'POST' || req.method === 'PATCH') {
    const data = parse(req.body);
    if (!data) return res.status(400).json({ error: 'Judul dan tanggal wajib diisi' });
    if (req.method === 'POST') {
      list.push({ id: crypto.randomUUID(), ...data });
    } else {
      // Update, e.g. set the next due date after renewing STNK.
      const r = list.find((x) => x.id === id);
      if (!r) return res.status(404).json({ error: 'Tidak ditemukan' });
      Object.assign(r, data);
    }
  } else if (req.method === 'DELETE') {
    list = list.filter((x) => x.id !== id);
  } else if (req.method !== 'GET') {
    return res.status(405).end();
  }

  if (req.method !== 'GET') await save('reminders', list);
  res.json(list.sort((a, b) => a.due.localeCompare(b.due)));
}
