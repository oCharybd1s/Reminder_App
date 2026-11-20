import { load, save, authed, addMonths } from './_lib.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Password salah' });
  let list = await load('reminders');
  const { id } = req.query;

  if (req.method === 'POST') {
    const { title, due, remindDays = 30, repeatMonths = 0 } = req.body || {};
    if (!title || !DATE.test(due) || isNaN(Date.parse(due))) {
      return res.status(400).json({ error: 'Judul dan tanggal wajib diisi' });
    }
    list.push({
      id: crypto.randomUUID(),
      title: String(title).slice(0, 100),
      due,
      remindDays: Math.max(0, parseInt(remindDays) || 0),
      repeatMonths: Math.max(0, parseInt(repeatMonths) || 0),
    });
  } else if (req.method === 'PATCH') {
    // "Selesai": recurring items move to the next period, one-off items are removed.
    const r = list.find((x) => x.id === id);
    if (!r) return res.status(404).json({ error: 'Tidak ditemukan' });
    if (r.repeatMonths) r.due = addMonths(r.due, r.repeatMonths);
    else list = list.filter((x) => x !== r);
  } else if (req.method === 'DELETE') {
    list = list.filter((x) => x.id !== id);
  } else if (req.method !== 'GET') {
    return res.status(405).end();
  }

  if (req.method !== 'GET') await save('reminders', list);
  res.json(list.sort((a, b) => a.due.localeCompare(b.due)));
}
