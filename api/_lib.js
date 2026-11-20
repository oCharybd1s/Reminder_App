// Shared helpers. Files starting with "_" are not deployed as Vercel functions.
import webpush from 'web-push';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const { FIREBASE_SERVICE_ACCOUNT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, APP_PASSWORD } = process.env;

// Server-side Firestore via a service account (bypasses security rules, so rules can stay fully locked).
const db = () =>
  getFirestore(getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) }));

// shortcut: each list is one array field in one doc (app/<key>); fine for a personal app, split into a collection past ~1MB.
export const load = async (key) => (await db().doc(`app/${key}`).get()).get('items') ?? [];
export const save = (key, items) => db().doc(`app/${key}`).set({ items });

export const authed = (req) => Boolean(APP_PASSWORD) && req.headers['x-password'] === APP_PASSWORD;

export function sendPush(sub, payload) {
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return webpush.sendNotification(sub, JSON.stringify(payload));
}

import { daysLeft as diff, fmt } from '../shared/dates.js';
export { addMonths } from '../shared/dates.js';

// "Today" is counted in WIB (Asia/Jakarta).
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
export const daysLeft = (due, now = today()) => diff(due, now);

export function message(r, left) {
  if (left > 0) return `${r.title}: ${left} hari lagi (${fmt(r.due)})`;
  if (left === 0) return `${r.title}: HARI INI!`;
  return `${r.title}: terlambat ${-left} hari`;
}
