import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRegistrationStats } from './stats';
import { Registration } from '../types/index';

test('calculates correct attendance and timeframe stats', () => {
  const mockNow = new Date('2026-10-30T12:00:00Z');

  const mockRegistrations: Registration[] = [
    {
      id: 'reg_1',
      firstName: 'Jean',
      lastName: 'Kouassi',
      whatsappPhone: '+2250701020304',
      normalizedPhone: '+2250701020304',
      city: 'Cocody',
      church: 'Vase d\'Honneur',
      ageCategory: '18_25',
      attendanceDays: ['jan_1', 'jan_2', 'jan_3'],
      status: 'confirmed',
      referenceCode: 'GYW-2027-ABCD',
      consentAccepted: true,
      createdAt: '2026-10-30T10:00:00Z', // Today
    },
    {
      id: 'reg_2',
      firstName: 'Marie',
      lastName: 'Koné',
      whatsappPhone: '+2250501020304',
      normalizedPhone: '+2250501020304',
      city: 'Yopougon',
      ageCategory: '18_25',
      attendanceDays: ['jan_1'],
      status: 'confirmed',
      referenceCode: 'GYW-2027-EFGH',
      consentAccepted: true,
      createdAt: '2026-10-25T10:00:00Z', // 5 days ago
    },
    {
      id: 'reg_3',
      firstName: 'Paul',
      lastName: 'Diallo',
      whatsappPhone: '+2250101020304',
      normalizedPhone: '+2250101020304',
      city: 'Cocody',
      ageCategory: '26_35',
      attendanceDays: ['jan_2', 'jan_3'],
      status: 'cancelled', // Should be excluded from active count
      referenceCode: 'GYW-2027-IJKL',
      consentAccepted: true,
      createdAt: '2026-10-30T11:00:00Z',
    },
  ];

  const stats = calculateRegistrationStats(mockRegistrations, mockNow);

  assert.equal(stats.total, 2);
  assert.equal(stats.todayCount, 1);
  assert.equal(stats.last7DaysCount, 2);
  assert.equal(stats.cityBreakdown['Cocody'], 1);
  assert.equal(stats.cityBreakdown['Yopougon'], 1);
  assert.equal(stats.ageBreakdown['18_25'], 2);
  assert.equal(stats.day1Expected, 2);
  assert.equal(stats.day2Expected, 1);
  assert.equal(stats.day3Expected, 1);
  assert.equal(stats.all3DaysExpected, 1);
});
