/**
 * Normalizes a phone number to standard international E.164-like format.
 * Defaults to Côte d'Ivoire (+225) if a 10-digit number is provided without country code.
 */
export function normalizePhoneNumber(raw: string, defaultCountryCode = '+225'): {
  isValid: boolean;
  normalized: string;
  displayFormatted: string;
  error?: string;
} {
  if (!raw || typeof raw !== 'string') {
    return { isValid: false, normalized: '', displayFormatted: '', error: 'phone_required' };
  }

  // Remove whitespace, dots, dashes, parentheses
  let cleaned = raw.trim().replace(/[\s\.\-\(\)]/g, '');

  // Handle leading 00 (e.g., 00225... -> +225...)
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // If number does not start with +, check if it's local Ivorian 10-digit number
  if (!cleaned.startsWith('+')) {
    // If it starts with local leading 0 and has 10 digits (e.g. 0701020304 or 0501020304 or 0101020304)
    if (/^\d{10}$/.test(cleaned)) {
      cleaned = defaultCountryCode + cleaned;
    } else if (/^225\d{10}$/.test(cleaned)) {
      cleaned = '+' + cleaned;
    } else {
      // If user typed 8 digits without leading zero or something else, prefix default code if numeric
      if (/^\d{8,15}$/.test(cleaned)) {
        cleaned = defaultCountryCode + cleaned;
      } else {
        return {
          isValid: false,
          normalized: '',
          displayFormatted: raw,
          error: 'phone_invalid_format',
        };
      }
    }
  }

  // Basic validation: must start with +, followed by 8 to 15 digits
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  if (!e164Regex.test(cleaned)) {
    return {
      isValid: false,
      normalized: '',
      displayFormatted: cleaned,
      error: 'phone_invalid_length',
    };
  }

  // Format display nicely
  let display = cleaned;
  if (cleaned.startsWith('+225') && cleaned.length === 14) {
    // +225 07 01 02 03 04
    const prefix = cleaned.slice(0, 4);
    const op = cleaned.slice(4, 6);
    const p1 = cleaned.slice(6, 8);
    const p2 = cleaned.slice(8, 10);
    const p3 = cleaned.slice(10, 12);
    const p4 = cleaned.slice(12, 14);
    display = `${prefix} ${op} ${p1} ${p2} ${p3} ${p4}`;
  }

  return {
    isValid: true,
    normalized: cleaned,
    displayFormatted: display,
  };
}

export function isValidPhoneNumber(raw: string): boolean {
  return normalizePhoneNumber(raw).isValid;
}

