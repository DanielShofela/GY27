/**
 * Generates a unique, readable registration code for attendees.
 * Format: GYW-2027-XXXX (e.g., GYW-2027-7K2M)
 */
export function generateReferenceCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude confusing chars 0/O, 1/I
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    suffix += chars[randomIndex];
  }
  return `GYW-2027-${suffix}`;
}

/**
 * Generates a deterministic document ID for Firestore based on the normalized phone.
 * Using doc ID prevents race conditions and duplicates atomically at the Firestore level.
 */
export function getRegistrationDocId(normalizedPhone: string): string {
  // Replace + with p to ensure valid Firestore document key: "reg_p2250701020304"
  const safePhone = normalizedPhone.replace('+', 'p');
  return `reg_${safePhone}`;
}
