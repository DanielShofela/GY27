/**
 * Security and Authorization Logic for GLORIOUS YOUTH WORLDWIDE 2027
 */

export const AUTHORIZED_ADMIN_EMAILS = [
  'daniel.shofela01@gmail.com',
  'digitalsoutien@gmail.com',
];

export interface AuthUserToken {
  uid: string;
  email?: string | null;
  email_verified?: boolean;
}

/**
 * Validates whether a given user session meets strict administrator authorization criteria.
 * Enforces email verification to protect against email spoofing attacks.
 */
export function isAuthorizedAdmin(
  user: AuthUserToken | null,
  whitelistedUids: string[] = []
): { authorized: boolean; reason: string } {
  if (!user) {
    return { authorized: false, reason: 'NOT_AUTHENTICATED' };
  }

  // 1. UID whitelist check (for explicit admin accounts)
  if (user.uid && whitelistedUids.includes(user.uid)) {
    return { authorized: true, reason: 'WHITELISTED_UID' };
  }

  // 2. Email verification and whitelist check
  if (!user.email) {
    return { authorized: false, reason: 'MISSING_EMAIL' };
  }

  const normalizedEmail = user.email.toLowerCase().trim();
  const isEmailWhitelisted = AUTHORIZED_ADMIN_EMAILS.some(
    (adminEmail) => adminEmail.toLowerCase() === normalizedEmail
  );

  if (!isEmailWhitelisted) {
    return { authorized: false, reason: 'EMAIL_NOT_AUTHORIZED' };
  }

  // Mandatory: prevent spoofed unverified accounts
  if (user.email_verified !== true) {
    return { authorized: false, reason: 'EMAIL_NOT_VERIFIED' };
  }

  return { authorized: true, reason: 'AUTHORIZED_PRIMARY_ADMIN' };
}

/**
 * Route security guard: resolves which screen to render given the path and authorization state.
 */
export function resolveAdminRouteState(
  pathname: string,
  user: AuthUserToken | null,
  isAuthLoading: boolean,
  whitelistedUids: string[] = []
): 'PUBLIC_VIEW' | 'AUTH_LOADING' | 'LOGIN_REQUIRED' | 'ACCESS_DENIED' | 'ADMIN_AUTHORIZED' {
  if (pathname !== '/admin') {
    return 'PUBLIC_VIEW';
  }

  if (isAuthLoading) {
    return 'AUTH_LOADING';
  }

  if (!user) {
    return 'LOGIN_REQUIRED';
  }

  const check = isAuthorizedAdmin(user, whitelistedUids);
  if (!check.authorized) {
    return 'ACCESS_DENIED';
  }

  return 'ADMIN_AUTHORIZED';
}
