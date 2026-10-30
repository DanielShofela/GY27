import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhoneNumber } from './phone';

test('normalizes 10-digit Ivorian local phone numbers to +225', () => {
  const res = normalizePhoneNumber('0701020304');
  assert.equal(res.isValid, true);
  assert.equal(res.normalized, '+2250701020304');
  assert.equal(res.displayFormatted, '+225 07 01 02 03 04');
});

test('handles numbers with spaces, hyphens and dots', () => {
  const res = normalizePhoneNumber('+225 05-12.34.56.78');
  assert.equal(res.isValid, true);
  assert.equal(res.normalized, '+2250512345678');
});

test('handles leading 00 international prefix', () => {
  const res = normalizePhoneNumber('0033612345678');
  assert.equal(res.isValid, true);
  assert.equal(res.normalized, '+33612345678');
});

test('rejects empty or invalid phone numbers', () => {
  const empty = normalizePhoneNumber('');
  assert.equal(empty.isValid, false);

  const tooShort = normalizePhoneNumber('123');
  assert.equal(tooShort.isValid, false);

  const letters = normalizePhoneNumber('abcdefg');
  assert.equal(letters.isValid, false);
});
