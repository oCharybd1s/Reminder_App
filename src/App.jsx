import { useEffect, useRef, useState } from 'react';

const REPEAT = { 0: 'Tidak', 1: 'Tiap bulan', 12: 'Tiap tahun', 60: 'Tiap 5 tahun' };
const today = () => new Date().toLocaleDateString('en-CA');
// Both sides parse "YYYY-MM-DD" as UTC midnight, so the difference is whole days with no time zone drift.
const daysLeft = (due) => Math.round((Date.parse(due) - Date.parse(today())) / 864e5);

const input =
  'peer w-full min-h-12 rounded-lg border border-gray-400 bg-white px-3 py-2 dark:border-gray-500 dark:bg-gray-800 user-invalid:border-red-600';
const btn = 'min-h-12 rounded-lg px-4 py-2 font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50';
const ghost = 'min-h-12 rounded-lg px-4 py-2 border border-gray-400 hover:bg-gray-100 dark:border-gray-500 dark:hover:bg-gray-800';

function b64ToBytes(b64) {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

// Mirror the visual :user-invalid state to aria-invalid and link the error text only while it shows.
function syncInvalid(e) {
  const el = e.target;
  const bad = el.matches(':user-invalid');
  el.setAttribute('aria-invalid', String(bad));
  if (bad) el.setAttribute('aria-describedby', `${el.id}-err`);
  else el.removeAttribute('aria-describedby');
}
const validate = { onBlur: syncInvalid, onInput: syncInvalid, onInvalid: syncInvalid, 'aria-invalid': 'false' };

function Field({ id, label, error, children }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm text-gray-600 dark:text-gray-400">{label}</label>
      {children}
      {error && (
        <p id={`${id}-err`} className="hidden text-sm text-red-600 peer-user-invalid:block">
          <span role="img" aria-label="Error">❌</span> {error}
        </p>
      )}
    </div>
  );
}

export default function App() {
  const [pw, setPw] = useState(() => localStorage.getItem('pw'));
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const dialog = useRef(null);

  async function api(path, opts = {}) {
    const r = await fetch(path, { ...opts, headers: { 'content-type': 'application/json', 'x-password': pw } });
    if (r.status === 401) {
      localStorage.removeItem('pw');
      setPw(null);
      throw new Error('Password salah');
    }
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || r.status);
    return data;
  }

  const run = (fn) => fn().catch((e) => setMsg(e.message));
  const act = (path, method, body) =>
    run(async () => {
      setList(await api(path, { method, body: body && JSON.stringify(body) }));
      setMsg('');
    });

  useEffect(() => {
    if (pw) act('/api/reminders', 'GET');
  }, [pw]);

  if (!pw) {
    return (
      <Shell>
        <form
          className="grid gap-3 rounded-xl border border-gray-300 p-4 dark:border-gray-700"
          onSubmit={(e) => {
            e.preventDefault();
            const v = e.target.pw.value;
            localStorage.setItem('pw', v);
            setPw(v);
          }}
        >
          <Field id="pw" label="Password aplikasi" error="Password wajib diisi.">
            <input id="pw" className={input} type="password" name="pw" required autoComplete="current-password" {...validate} />
          </Field>
          <button className={btn}>Masuk</button>
        </form>
        <p role="status" className="mt-3 text-sm text-red-600">{msg}</p>
      </Shell>
    );
  }

  const enableNotif = () =>
    run(async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Browser tidak mendukung push. Di iPhone: Share → Add to Home Screen, lalu buka dari ikon.');
      }
      if ((await Notification.requestPermission()) !== 'granted') throw new Error('Izin notifikasi ditolak.');
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await (await fetch('/api/subscribe')).json();
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) }));
      const r = await api('/api/subscribe', { method: 'POST', body: JSON.stringify(sub) });
      setMsg(`Notifikasi aktif ✅ (${r.devices} perangkat terdaftar)`);
    });

  const testNotif = () =>
    run(async () => {
      const r = await api('/api/cron');
      setMsg(`Terkirim ke ${r.sent} perangkat${r.failed.length ? `, gagal: ${r.failed}` : ''}`);
    });

  return (
    <Shell>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" className={ghost} onClick={enableNotif}>🔔 Aktifkan notifikasi</button>
        <button type="button" className={ghost} onClick={testNotif}>Tes notifikasi</button>
      </div>
      <p role="status" className="mb-3 min-h-6 text-sm text-gray-600 dark:text-gray-400">{msg}</p>

      <form
        aria-label="Tambah pengingat"
        className="mb-4 grid gap-4 rounded-xl border border-gray-300 p-4 dark:border-gray-700"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = e.currentTarget;
          setBusy(true);
          await act('/api/reminders', 'POST', Object.fromEntries(new FormData(f)));
          setBusy(false);
          f.title.value = '';
          f.due.value = '';
        }}
      >
        <Field id="title" label="Apa yang diingat?" error="Judul wajib diisi.">
          <input id="title" className={input} name="title" required maxLength={100} placeholder="Perpanjang STNK motor" {...validate} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="due" label="Jatuh tempo" error="Tanggal wajib diisi.">
            <input id="due" className={input} type="date" name="due" required {...validate} />
          </Field>
          <Field id="remindDays" label="Ingatkan H-" error="Isi angka 0 atau lebih.">
            <input id="remindDays" className={input} type="number" name="remindDays" min="0" defaultValue="30" required {...validate} />
          </Field>
        </div>
        <Field id="repeatMonths" label="Berulang">
          <select id="repeatMonths" className={input} name="repeatMonths" defaultValue="12">
            {Object.entries(REPEAT).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Field>
        <button className={btn} disabled={busy}>{busy ? 'Menyimpan…' : 'Tambah pengingat'}</button>
      </form>

      <ul className="grid gap-2">
        {!list.length && <li className="text-gray-600 dark:text-gray-400">Belum ada pengingat.</li>}
        {list.map((r) => {
          const left = daysLeft(r.due);
          const color = left < 0 ? 'border-l-red-600' : left <= r.remindDays ? 'border-l-amber-500' : 'border-l-gray-400';
          const when = left > 0 ? `${left} hari lagi` : left === 0 ? 'HARI INI' : `terlambat ${-left} hari`;
          return (
            <li key={r.id} className={`flex items-center gap-2 rounded-lg border border-l-4 border-gray-300 p-3 dark:border-gray-700 ${color}`}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.title}</div>
                <small className="text-gray-600 dark:text-gray-400">
                  {r.due} · {when} · H-{r.remindDays}
                  {r.repeatMonths ? ` · ${(REPEAT[r.repeatMonths] ?? `tiap ${r.repeatMonths} bln`).toLowerCase()}` : ''}
                </small>
              </div>
              <button
                type="button"
                className="min-h-12 rounded-lg bg-blue-600 px-3 text-sm text-white hover:bg-blue-700"
                title={r.repeatMonths ? 'Pindah ke periode berikutnya' : 'Hapus'}
                onClick={() => act(`/api/reminders?id=${r.id}`, 'PATCH')}
              >
                ✓ Selesai
              </button>
              <button
                type="button"
                className="min-h-12 min-w-12 rounded-lg border border-gray-400 text-sm dark:border-gray-500"
                aria-label={`Hapus ${r.title}`}
                onClick={() => {
                  setToDelete(r);
                  dialog.current.showModal();
                }}
              >
                🗑
              </button>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialog}
        aria-labelledby="del-title"
        closedby="any"
        className="m-auto w-[min(90vw,24rem)] rounded-xl bg-white p-5 text-gray-900 backdrop:bg-black/50 dark:bg-gray-800 dark:text-gray-100"
      >
        <h2 id="del-title" className="mb-4 text-lg font-semibold">Hapus “{toDelete?.title}”?</h2>
        <form method="dialog" className="flex justify-end gap-2">
          {/* Cancel comes first so showModal() focuses the safe action. */}
          <button value="cancel" className={ghost}>Batal</button>
          {/* Acts on click, not via returnValue in a close listener, so Esc/click-outside can never delete. */}
          <button value="delete" onClick={() => act(`/api/reminders?id=${toDelete.id}`, 'DELETE')} className="min-h-12 rounded-lg bg-red-600 px-4 font-medium text-white hover:bg-red-700">Hapus</button>
        </form>
      </dialog>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <main className="mx-auto max-w-xl p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <h1 className="mb-4 text-2xl font-semibold">⏰ Pengingat</h1>
      {children}
    </main>
  );
}
