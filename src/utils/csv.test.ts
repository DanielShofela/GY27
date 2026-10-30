import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeCsvCell, exportRegistrationsToCsv } from './csv';
import { Registration } from '../types/index';

test('escapes special characters and quotes in CSV cells', () => {
  assert.equal(escapeCsvCell('Hello "World"'), '"Hello ""World"""');
  assert.equal(escapeCsvCell('Simple'), '"Simple"');
  assert.equal(escapeCsvCell(null), '""');
});

test('generates valid UTF-8 BOM CSV output with correct headers and rows', () => {
  const mock: Registration[] = [
    {
      id: 'reg_1',
      firstName: 'Esther',
      lastName: 'Bamba',
      whatsappPhone: '+2250708091011',
      normalizedPhone: '+2250708091011',
      city: 'Plateau',
      church: 'Mission Évangélique',
      ageCategory: '18_25',
      attendanceDays: ['jan_1', 'jan_2'],
      status: 'confirmed',
      referenceCode: 'GYW-2027-TEST',
      consentAccepted: true,
      createdAt: '2026-10-30T10:00:00Z',
    },
  ];

  const csv = exportRegistrationsToCsv(mock);

  assert.ok(csv.startsWith('\uFEFF')); // BOM check
  assert.ok(csv.includes('"Référence";"Nom";"Prénom"'));
  assert.ok(csv.includes('GYW-2027-TEST'));
  assert.ok(csv.includes('Esther'));
  assert.ok(csv.includes('Bamba'));
  assert.ok(csv.includes('Plateau'));
});
