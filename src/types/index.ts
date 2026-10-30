export type AttendanceDay = 'jan_1' | 'jan_2' | 'jan_3';

export type AgeCategory =
  | 'under_15'
  | '15_17'
  | '18_25'
  | '26_35'
  | 'over_35'
  | 'not_specified';

export type RegistrationStatus = 'confirmed' | 'cancelled' | 'attended';

export interface Registration {
  id: string; // doc ID, e.g. "reg_+2250701020304"
  firstName: string;
  lastName: string;
  whatsappPhone: string; // Formatted WhatsApp phone
  normalizedPhone: string; // Strictly digits with +, e.g. "+2250701020304"
  city: string; // Commune or ville
  church?: string; // Optional
  ageCategory?: AgeCategory;
  attendanceDays: AttendanceDay[];
  status: RegistrationStatus;
  referenceCode: string; // e.g. "GYW-2027-K89X"
  consentAccepted: boolean;
  consentVersion?: string;
  createdAt: string; // ISO 8601 string
  updatedAt?: string;
}

export interface EventSettings {
  location: string;
  schedules: string;
  contactPhone: string;
  whatsappChannelUrl?: string;
  registrationsOpen: boolean;
  closingDate?: string;
  announcement?: string;
  logoUrl?: string;
  logoUpdatedAt?: string;
  headerLogoUrl?: string;
  headerLogoUpdatedAt?: string;
  updatedAt: string;
  updatedBy?: string;
}

export type LogoStatus = 'loading' | 'ready' | 'empty';

export interface RegistrationStats {
  total: number;
  todayCount: number;
  last7DaysCount: number;
  cityBreakdown: Record<string, number>;
  ageBreakdown: Record<string, number>;
  day1Expected: number;
  day2Expected: number;
  day3Expected: number;
  all3DaysExpected: number;
}

export type Language = 'fr' | 'en';
