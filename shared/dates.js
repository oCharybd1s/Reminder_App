// Date helpers shared by the API and the React app. Dates are plain "YYYY-MM-DD" strings.

// Both sides parse as UTC midnight, so the difference is whole days with no time zone drift.
export const daysLeft = (due, now) => Math.round((Date.parse(due) - Date.parse(now)) / 864e5);

// Add months, clamping to month end (31 Jan + 1 → 28/29 Feb, 29 Feb + 12 → 28 Feb).
export function addMonths(due, months) {
  const [y, m, d] = due.split('-').map(Number);
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))).toISOString().slice(0, 10);
}

// "2026-01-05" → "5/1/2026"
export const fmt = (due) => {
  const [y, m, d] = due.split('-');
  return `${+d}/${+m}/${y}`;
};
