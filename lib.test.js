import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, daysLeft, message } from './api/_lib.js';

test('addMonths clamps to month end', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2028-02-29', 12), '2029-02-28');
  assert.equal(addMonths('2026-12-15', 1), '2027-01-15');
  assert.equal(addMonths('2026-05-10', 60), '2031-05-10');
});

test('daysLeft counts whole days', () => {
  assert.equal(daysLeft('2026-12-20', '2026-11-20'), 30);
  assert.equal(daysLeft('2026-11-20', '2026-11-20'), 0);
  assert.equal(daysLeft('2026-11-18', '2026-11-20'), -2);
  assert.equal(daysLeft('2027-03-01', '2027-02-28'), 1);
});

test('message wording', () => {
  const r = { title: 'STNK', due: '2026-12-20' };
  assert.equal(message(r, 30), 'STNK: 30 hari lagi (2026-12-20)');
  assert.equal(message(r, 0), 'STNK: HARI INI!');
  assert.equal(message(r, -3), 'STNK: terlambat 3 hari');
});
