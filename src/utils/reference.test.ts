import test from 'node:test';
import assert from 'node:assert/strict';
import { generateReferenceCode, getRegistrationDocId } from './reference';

test('generates valid GYW-2027 reference code format', () => {
  const code = generateReferenceCode();
  assert.match(code, /^GYW-2027-[2-9A-HJ-NP-Z]{4}$/);
});

test('generates clean deterministic doc ID for phone', () => {
  const docId = getRegistrationDocId('+2250701020304');
  assert.equal(docId, 'reg_p2250701020304');
});
