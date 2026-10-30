import { Registration, RegistrationStats } from '../types/index';

/**
 * Calculates real-time statistics from attendee registration records.
 */
export function calculateRegistrationStats(
  registrations: Registration[],
  referenceDate: Date = new Date()
): RegistrationStats {
  const activeRegistrations = registrations.filter((r) => r.status !== 'cancelled');

  const now = referenceDate;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

  let todayCount = 0;
  let last7DaysCount = 0;

  const cityBreakdown: Record<string, number> = {};
  const ageBreakdown: Record<string, number> = {};

  let day1Expected = 0;
  let day2Expected = 0;
  let day3Expected = 0;
  let all3DaysExpected = 0;

  for (const reg of activeRegistrations) {
    const regTime = new Date(reg.createdAt).getTime();

    if (!isNaN(regTime)) {
      if (regTime >= startOfToday) {
        todayCount++;
      }
      if (regTime >= sevenDaysAgo) {
        last7DaysCount++;
      }
    }

    // Commune tally (normalized uppercase for clean aggregation)
    const normalizedCity = (reg.city || '').trim();
    if (normalizedCity) {
      cityBreakdown[normalizedCity] = (cityBreakdown[normalizedCity] || 0) + 1;
    }

    // Age category tally
    const age = reg.ageCategory || 'not_specified';
    ageBreakdown[age] = (ageBreakdown[age] || 0) + 1;

    // Daily attendance tally
    const days = Array.isArray(reg.attendanceDays) ? reg.attendanceDays : [];
    const hasDay1 = days.includes('jan_1');
    const hasDay2 = days.includes('jan_2');
    const hasDay3 = days.includes('jan_3');

    if (hasDay1) day1Expected++;
    if (hasDay2) day2Expected++;
    if (hasDay3) day3Expected++;
    if (hasDay1 && hasDay2 && hasDay3) all3DaysExpected++;
  }

  return {
    total: activeRegistrations.length,
    todayCount,
    last7DaysCount,
    cityBreakdown,
    ageBreakdown,
    day1Expected,
    day2Expected,
    day3Expected,
    all3DaysExpected,
  };
}
