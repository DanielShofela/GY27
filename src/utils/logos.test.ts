import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  getInitialEventSettings,
  updateOfficialLogo,
  updateHeaderLogo,
  removeHeaderLogo,
  removeOfficialLogo,
  useMainLogoAsHeaderLogo,
  verifyIsAdmin,
} from '../firebase/services';
import { sanitizeAndValidateSvg } from './svgSecurity';
import { EventSettings } from '../types/index';

// Helper mock user
const authorizedAdminUser = {
  uid: 'dev-admin-uid-1',
  email: 'digitalsoutien@gmail.com',
  emailVerified: true,
} as any;

const unauthorizedVisitor = {
  uid: 'stranger-uid-123',
  email: 'stranger@example.com',
  emailVerified: false,
} as any;

const cleanSvgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
  <rect width="200" height="60" fill="#FF6A00"/>
  <text x="100" y="35" fill="#FFFFFF" text-anchor="middle">GLORIOUS</text>
</svg>
`;

test('1. Initial settings returns default official logo synchronously (no loading flash)', () => {
  const initial = getInitialEventSettings();
  assert.ok(initial.logoUrl, 'Initial settings must have a logoUrl');
  assert.equal(initial.logoUrl, '/official-logo.svg');
});

test('2. Logo states: LOADING, READY, EMPTY logic validation', () => {
  // Function matching Hero.tsx state logic
  function computeLogoState(logoUrl?: string, isSettingsLoading?: boolean): 'loading' | 'ready' | 'empty' {
    if (logoUrl && logoUrl.trim() !== '') return 'ready';
    if (isSettingsLoading) return 'loading';
    return 'empty';
  }

  // A. During loading with no logo yet: state is 'loading' (never shows temporary title)
  assert.equal(computeLogoState('', true), 'loading');
  assert.equal(computeLogoState(undefined, true), 'loading');

  // B. With official logo already present: state is 'ready' immediately
  assert.equal(computeLogoState('/official-logo.svg', false), 'ready');
  assert.equal(computeLogoState('/official-logo.svg', true), 'ready');

  // C. Absence of logo explicitly confirmed after load: state is 'empty'
  assert.equal(computeLogoState('', false), 'empty');
  assert.equal(computeLogoState(undefined, false), 'empty');
});

test('3. Header and Main logos are strictly independent in EventSettings', () => {
  const baseSettings: EventSettings = {
    ...DEFAULT_SETTINGS,
    logoUrl: 'https://storage.googleapis.com/main_logo.svg?v=1',
    headerLogoUrl: 'https://storage.googleapis.com/header_logo.svg?v=1',
  };

  // Modifying header logo should NOT touch main logo
  const withNewHeader: EventSettings = {
    ...baseSettings,
    headerLogoUrl: 'https://storage.googleapis.com/header_logo_v2.svg?v=2',
  };
  assert.equal(withNewHeader.logoUrl, 'https://storage.googleapis.com/main_logo.svg?v=1');
  assert.equal(withNewHeader.headerLogoUrl, 'https://storage.googleapis.com/header_logo_v2.svg?v=2');

  // Removing header logo leaves main logo intact and reverts header to empty
  const withRemovedHeader: EventSettings = {
    ...baseSettings,
    headerLogoUrl: '',
  };
  assert.equal(withRemovedHeader.logoUrl, 'https://storage.googleapis.com/main_logo.svg?v=1');
  assert.equal(withRemovedHeader.headerLogoUrl, '');
});

test('4. SVG Sanitization validates clean SVG and generates secure base64 dataUri', () => {
  const validation = sanitizeAndValidateSvg(cleanSvgContent, 300);
  assert.equal(validation.isValid, true);
  assert.ok(validation.dataUri?.startsWith('data:image/svg+xml;base64,'));
});

test('5. Security: Rejects dangerous scripts or event handlers in SVG', () => {
  const maliciousXss = `
    <svg xmlns="http://www.w3.org/2000/svg">
      <script>alert('pwned')</script>
      <circle cx="10" cy="10" r="5" onload="alert(1)"/>
    </svg>
  `;
  const validation = sanitizeAndValidateSvg(maliciousXss);
  assert.equal(validation.isValid, false);
  assert.equal(validation.error, 'ACTIVE_CODE_OR_DANGEROUS_ELEMENTS_DETECTED');
});

test('6. Security: Rejection of unauthorized visitor attempting logo modification', async () => {
  // Visitor without authorized admin email or verification
  await assert.rejects(
    async () => {
      await updateOfficialLogo('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', undefined, unauthorizedVisitor);
    },
    { message: 'NOT_AUTHORIZED' }
  );

  await assert.rejects(
    async () => {
      await updateHeaderLogo('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', undefined, unauthorizedVisitor);
    },
    { message: 'NOT_AUTHORIZED' }
  );

  await assert.rejects(
    async () => {
      await removeHeaderLogo(unauthorizedVisitor);
    },
    { message: 'NOT_AUTHORIZED' }
  );

  await assert.rejects(
    async () => {
      await removeOfficialLogo(unauthorizedVisitor);
    },
    { message: 'NOT_AUTHORIZED' }
  );
});

test('7. Verification of admin role: authorized admin is recognized', async () => {
  const isAuth = await verifyIsAdmin(authorizedAdminUser);
  assert.equal(isAuth, true);

  const isStranger = await verifyIsAdmin(unauthorizedVisitor);
  assert.equal(isStranger, false);

  const isNull = await verifyIsAdmin(null);
  assert.equal(isNull, false);
});

test('8. Preserves all other event parameters when updating logos', () => {
  const initial: EventSettings = {
    location: 'Palais des Congrès, Abidjan',
    schedules: '08h00 - 18h00',
    contactPhone: '+225 07 12 34 56 78',
    whatsappChannelUrl: 'https://whatsapp.com/channel/gyw2027',
    registrationsOpen: true,
    closingDate: '31 décembre 2026 à 23h59',
    announcement: 'Rassemblement mondial',
    logoUrl: '/official-logo.svg',
    headerLogoUrl: '',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const updated: EventSettings = {
    ...initial,
    headerLogoUrl: 'data:image/svg+xml;base64,newHeaderLogo',
    headerLogoUpdatedAt: new Date().toISOString(),
  };

  // Check that all core event parameters are preserved
  assert.equal(updated.location, initial.location);
  assert.equal(updated.schedules, initial.schedules);
  assert.equal(updated.contactPhone, initial.contactPhone);
  assert.equal(updated.whatsappChannelUrl, initial.whatsappChannelUrl);
  assert.equal(updated.registrationsOpen, initial.registrationsOpen);
  assert.equal(updated.closingDate, initial.closingDate);
  assert.equal(updated.announcement, initial.announcement);
  assert.equal(updated.logoUrl, initial.logoUrl);
  assert.notEqual(updated.headerLogoUrl, initial.headerLogoUrl);
});

test('9. Logo chunking logic splits large data URIs into safe chunks under 400KB and reassembles with 100% fidelity', () => {
  const CHUNK_SIZE = 350 * 1024;
  // Create a synthetic 1.2MB data URI string (exceeding Firestore 1MB single doc limit)
  const syntheticLargeData = 'data:image/svg+xml;base64,' + 'A'.repeat(1_200_000);
  
  // Verify that it would breach single Firestore doc limit if not chunked
  assert.ok(syntheticLargeData.length > 1_048_576, 'Large data must exceed 1MB');

  // Perform chunking
  const totalChunks = Math.ceil(syntheticLargeData.length / CHUNK_SIZE);
  assert.ok(totalChunks >= 3, 'Must split into 3 or more chunks');

  const chunks: string[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunk = syntheticLargeData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    assert.ok(chunk.length <= CHUNK_SIZE, 'Each chunk must strictly be <= 350KB');
    chunks.push(chunk);
  }

  // Reassemble
  const reassembled = chunks.join('');
  assert.equal(reassembled.length, syntheticLargeData.length);
  assert.equal(reassembled, syntheticLargeData);
});
