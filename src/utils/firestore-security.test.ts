import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

test('Security Verification: Unauthenticated visitor CANNOT read registrations', async () => {
  const app = initializeApp(firebaseConfig, 'security-test-unauth-app');
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  try {
    await getDocs(collection(db, 'registrations'));
    assert.fail('Security leak! Unauthenticated read succeeded but should have been rejected.');
  } catch (error: any) {
    // Expect PERMISSION_DENIED error from server-side security rules
    assert.ok(
      error.code === 'permission-denied' ||
        error.message.includes('permission') ||
        error.message.includes('Missing or insufficient permissions'),
      `Expected permission-denied from Firestore rules, got: ${error.message}`
    );
  } finally {
    const { terminate } = await import('firebase/firestore');
    await terminate(db);
  }
});
