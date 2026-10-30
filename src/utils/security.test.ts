import test from 'node:test';
import assert from 'node:assert/strict';
import { isAuthorizedAdmin, resolveAdminRouteState } from './security';

test('denies access if user is null / unauthenticated', () => {
  const result = isAuthorizedAdmin(null);
  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'NOT_AUTHENTICATED');
});

test('denies access if user email is not in the whitelist', () => {
  const result = isAuthorizedAdmin({
    uid: 'unauthorized-uid-123',
    email: 'random.visitor@example.com',
    email_verified: true,
  });
  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'EMAIL_NOT_AUTHORIZED');
});

test('denies access if admin email is unverified (spoof protection)', () => {
  const result = isAuthorizedAdmin({
    uid: 'spoofed-uid-456',
    email: 'digitalsoutien@gmail.com',
    email_verified: false, // Not verified!
  });
  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'EMAIL_NOT_VERIFIED');
});

test('authorizes primary admin with verified email', () => {
  const result = isAuthorizedAdmin({
    uid: 'legit-admin-uid-789',
    email: 'digitalsoutien@gmail.com',
    email_verified: true,
  });
  assert.equal(result.authorized, true);
  assert.equal(result.reason, 'AUTHORIZED_PRIMARY_ADMIN');
});

test('authorizes secondary admin with explicit whitelisted UID', () => {
  const result = isAuthorizedAdmin(
    {
      uid: 'co-admin-uid-999',
      email: 'organisateur.adjoint@eglise.ci',
      email_verified: true,
    },
    ['co-admin-uid-999']
  );
  assert.equal(result.authorized, true);
  assert.equal(result.reason, 'WHITELISTED_UID');
});

test('resolveAdminRouteState correctly enforces route states', () => {
  // Public route
  assert.equal(resolveAdminRouteState('/', null, false), 'PUBLIC_VIEW');

  // /admin when loading
  assert.equal(resolveAdminRouteState('/admin', null, true), 'AUTH_LOADING');

  // /admin without user
  assert.equal(resolveAdminRouteState('/admin', null, false), 'LOGIN_REQUIRED');

  // /admin with unauthorized user
  assert.equal(
    resolveAdminRouteState(
      '/admin',
      { uid: 'hacker', email: 'stranger@gmail.com', email_verified: true },
      false
    ),
    'ACCESS_DENIED'
  );

  // /admin with legitimate authorized admin
  assert.equal(
    resolveAdminRouteState(
      '/admin',
      { uid: 'admin-1', email: 'digitalsoutien@gmail.com', email_verified: true },
      false
    ),
    'ADMIN_AUTHORIZED'
  );
});
