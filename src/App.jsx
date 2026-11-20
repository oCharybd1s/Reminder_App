import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { addMonths, daysLeft as diff, fmt } from '../shared/dates.js';

const REPEAT = { 0: 'Sekali', 1: 'Bulanan', 12: 'Tahunan', 60: '5 tahun' };
const today = () => new Date().toLocaleDateString('en-CA');
const daysLeft = (due) => diff(due, today());

const input =
  'peer w-full min-h-12 rounded-xl border border-gray-400 bg-white px-3 py-2 text-base dark:border-gray-500 dark:bg-gray-800 user-invalid:border-red-600';
const primary =
  'min-h-12 rounded-xl bg-blue-600 px-4 font-semibold text-white active:bg-blue-700 disabled:opacity-50';
const secondary =
  'min-h-12 rounded-xl border border-gray-400 px-4 font-medium active:bg-gray-100 dark:border-gray-500 dark:active:bg-gray-800';
const label = 'text-sm font-medium text-gray-700 dark:text-gray-300';

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

const ErrorText = ({ id, children, className = 'peer-user-invalid:block' }) => (
  <p id={`${id}-err`} className={`hidden text-sm text-red-600 ${className}`}>
    <span role="img" aria-label="Error">❌</span> {children}
  </p>
);

function Field({ id, text, error, children }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className={label}>{text}</label>
      {children}
      {error && <ErrorText id={id}>{error}</ErrorText>}
    </div>
  );
}

// Native date picker (the phone's own calendar), shown as D/M/YYYY regardless of device locale.
function DateField({ value, onChange }) {
  return (
    <div className="group grid gap-1">
      <label htmlFor="due" className={label}>Jatuh tempo</label>
      <div className="relative">
        <div
          aria-hidden="true"
          className={`${input} flex items-center justify-between group-has-[:user-invalid]:border-red-600 group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-blue-600`}
        >
          <span className={value ? '' : 'text-gray-500'}>{value ? fmt(value) : 'Pilih tanggal'}</span>
          <span>📅</span>
        </div>
        <input
          id="due"
          name="due"
          type="date"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            try { e.currentTarget.showPicker(); } catch {} // desktop browsers open the picker only from its icon
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          {...validate}
        />
      </div>
      <ErrorText id="due" className="group-has-[:user-invalid]:block">Tanggal wajib diisi.</ErrorText>
    </div>
  );
}

function ReminderForm({ editing, busy, onSubmit, onCancel, onDelete }) {
  const [due, setDue] = useState(editing?.due ?? '');
  const [repeat, setRepeat] = useState(+(editing?.repeatMonths ?? 12));
  const next = editing && repeat ? addMonths(editing.due, repeat) : null;

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(Object.fromEntries(new FormData(e.currentTarget)));
      }}
    >
      <Field id="title" text="Apa yang diingat?" error="Judul wajib diisi.">
        <input id="title" className={input} name="title" required maxLength={100} defaultValue={editing?.title}
          placeholder="Perpanjang STNK motor" enterKeyHint="next" {...validate} />
      </Field>

      <DateField value={due} onChange={setDue} />

      {next && (
        <div className="grid gap-1 rounded-xl bg-green-50 p-3 dark:bg-green-950">
          <button type="button" className="min-h-12 rounded-xl bg-green-600 px-4 font-semibold text-white active:bg-green-700"
            onClick={() => setDue(next)}>
            ✓ Sudah diperpanjang → {fmt(next)}
          </button>
          <p className="text-center text-xs text-gray-600 dark:text-gray-400">
            Atau pilih tanggal jatuh tempo baru di atas, lalu Simpan.
          </p>
        </div>
      )}

      <Field id="remindDays" text="Mulai ingatkan berapa hari sebelumnya?" error="Isi angka 0 atau lebih.">
        <input id="remindDays" className={input} type="number" inputMode="numeric" name="remindDays" min="0" required
          defaultValue={editing?.remindDays ?? 30} {...validate} />
      </Field>

      <fieldset className="grid gap-1">
        <legend className={`${label} mb-1`}>Berulang</legend>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(REPEAT).map(([v, t]) => (
            <label key={v}
              className="flex min-h-12 items-center justify-center rounded-xl border border-gray-400 text-sm font-medium has-checked:border-blue-600 has-checked:bg-blue-600 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-blue-600 dark:border-gray-500">
              <input type="radio" name="repeatMonths" value={v} checked={repeat === +v} onChange={() => setRepeat(+v)} className="sr-only" />
              {t}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button type="button" className={secondary} onClick={onCancel}>Batal</button>
        <button className={primary} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
      </div>
      {editing && (
        <button type="button" className="min-h-12 rounded-xl font-medium text-red-600" onClick={onDelete}>
          🗑 Hapus pengingat
        </button>
      )}
    </form>
  );
}

function ReminderCard({ r, onOpen }) {
  const left = daysLeft(r.due);
  const [big, small, tone, when] =
    left < 0 ? [-left, 'hari lewat', 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300', `Terlambat ${-left} hari`]
    : left === 0 ? ['!', 'hari ini', 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300', 'Jatuh tempo HARI INI']
    : left <= r.remindDays ? [left, 'hari lagi', 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300', `${left} hari lagi`]
    : [left, 'hari lagi', 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200', `${left} hari lagi`];
  return (
    <li>
      <button type="button" onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-gray-200 active:bg-gray-50 dark:bg-gray-800 dark:ring-gray-700 dark:active:bg-gray-700">
        <span className={`grid size-16 shrink-0 place-content-center rounded-xl text-center ${tone}`}>
          <span className="text-xl font-bold leading-tight">{big}</span>
          <span className="text-[11px] leading-tight">{small}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{r.title}</span>
          <span className="block text-sm text-gray-600 dark:text-gray-400">
            {fmt(r.due)} · {REPEAT[r.repeatMonths] ?? `tiap ${r.repeatMonths} bln`} · H-{r.remindDays}
          </span>
          <span className="sr-only">{when}</span>
        </span>
        <span aria-hidden="true" className="text-2xl text-gray-400">›</span>
      </button>
    </li>
  );
}

export default function App() {
  const [pw, setPw] = useState(() => localStorage.getItem('pw'));
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // null = add, object = edit
  const [formKey, setFormKey] = useState(0);
  const sheet = useRef(null);
  const confirmDel = useRef(null);

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

  const run = (fn) => fn().then(() => true, (e) => (setMsg(e.message), false));
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
      <main className="mx-auto grid min-h-dvh max-w-md content-center gap-6 p-6">
        <div className="text-center">
          <img src="/icon.svg" alt="" className="mx-auto mb-3 size-20 rounded-2xl" />
          <h1 className="text-2xl font-bold">Pengingat</h1>
        </div>
        <form className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const v = e.currentTarget.pw.value;
            localStorage.setItem('pw', v);
            setPw(v);
          }}>
          <Field id="pw" text="Password aplikasi" error="Password wajib diisi.">
            <input id="pw" className={input} type="password" name="pw" required autoComplete="current-password" {...validate} />
          </Field>
          <button className={primary}>Masuk</button>
        </form>
        <p role="status" className="text-center text-sm text-red-600">{msg}</p>
      </main>
    );
  }

  const openSheet = (r = null) => {
    // Render the fresh form before showModal(), otherwise focus lands on nodes that are about to unmount.
    flushSync(() => {
      setEditing(r);
      setFormKey((k) => k + 1);
    });
    sheet.current.showModal();
    // Focus the heading, not the first input, so the phone keyboard doesn't pop up over the sheet.
    document.getElementById('sheet-title').focus();
  };

  const save = async (data) => {
    setBusy(true);
    const ok = editing
      ? await act(`/api/reminders?id=${editing.id}`, 'PATCH', data)
      : await act('/api/reminders', 'POST', data);
    setBusy(false);
    if (ok) sheet.current.close();
  };

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
      setMsg(`Notifikasi aktif ✅ (${r.devices} perangkat)`);
    });

  const testNotif = () =>
    run(async () => {
      const r = await api('/api/cron');
      setMsg(`Tes terkirim ke ${r.sent} perangkat${r.failed.length ? `, gagal: ${r.failed}` : ''}`);
    });

  const active = list.filter((r) => daysLeft(r.due) <= r.remindDays).length;

  return (
    <div className="min-h-dvh bg-gray-100 dark:bg-gray-950">
      <header className="sticky top-0 z-10 bg-gray-100/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur dark:bg-gray-950/90">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Pengingat</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {list.length ? `${active} perlu perhatian · ${list.length} total` : 'Belum ada data'}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className={`${secondary} px-3 text-sm`} onClick={testNotif}>Tes</button>
            <button type="button" className={`${secondary} px-3 text-sm`} onClick={enableNotif} aria-label="Aktifkan notifikasi">🔔</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <p role="status" className="mb-3 rounded-xl empty:m-0 empty:p-0 bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-200">{msg}</p>
        {list.length ? (
          <ul className="grid gap-2">
            {list.map((r) => <ReminderCard key={r.id} r={r} onOpen={() => openSheet(r)} />)}
          </ul>
        ) : (
          <p className="mt-16 text-center text-gray-600 dark:text-gray-400">
            Belum ada pengingat.<br />Tekan <b>＋ Tambah</b> untuk mulai, misalnya STNK.
          </p>
        )}
      </main>

      <button type="button" onClick={() => openSheet()}
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 min-h-14 rounded-full bg-blue-600 px-6 text-lg font-semibold text-white shadow-lg active:bg-blue-700">
        ＋ Tambah
      </button>

      {/* Bottom sheet for add/edit. showModal() gives Esc + Android back-gesture dismissal. */}
      <dialog ref={sheet} aria-labelledby="sheet-title" closedby="any"
        className="m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-3xl bg-white p-0 text-gray-900 backdrop:bg-black/50 dark:bg-gray-900 dark:text-gray-100">
        <div className="mx-auto max-w-md px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
          <h2 id="sheet-title" tabIndex={-1} className="mb-4 text-xl font-bold outline-none">{editing ? 'Perbarui pengingat' : 'Pengingat baru'}</h2>
          <ReminderForm key={formKey} editing={editing} busy={busy} onSubmit={save}
            onCancel={() => sheet.current.close()} onDelete={() => confirmDel.current.showModal()} />
        </div>
      </dialog>

      <dialog ref={confirmDel} aria-labelledby="del-title" closedby="any"
        className="m-auto w-[min(90vw,22rem)] rounded-2xl bg-white p-5 text-gray-900 backdrop:bg-black/50 dark:bg-gray-800 dark:text-gray-100">
        <h2 id="del-title" className="mb-4 text-lg font-semibold">Hapus “{editing?.title}”?</h2>
        <form method="dialog" className="grid grid-cols-2 gap-2">
          {/* Cancel comes first so showModal() focuses the safe action. */}
          <button value="cancel" className={secondary}>Batal</button>
          {/* Acts on click, not via returnValue in a close listener, so Esc/click-outside can never delete. */}
          <button value="delete" className="min-h-12 rounded-xl bg-red-600 px-4 font-semibold text-white active:bg-red-700"
            onClick={async () => {
              if (await act(`/api/reminders?id=${editing.id}`, 'DELETE')) sheet.current.close();
            }}>
            Hapus
          </button>
        </form>
      </dialog>
    </div>
  );
}
