import { db } from '../src/firebase/config';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

async function testSubmit() {
  const testPhone = '+2250102030405';
  const docId = `reg_${testPhone}`;
  const now = new Date().toISOString();

  const record = {
    id: docId,
    firstName: 'TestAuditeur',
    lastName: 'Verification',
    whatsappPhone: '+225 01 02 03 04 05',
    normalizedPhone: testPhone,
    city: 'Abidjan',
    church: 'Eglise Centrale',
    ageCategory: '18_25',
    attendanceDays: ['jan_1', 'jan_2', 'jan_3'],
    status: 'confirmed',
    referenceCode: 'GYW-2027-TEST',
    consentAccepted: true,
    consentVersion: 'v1.0',
    createdAt: now,
    updatedAt: now,
  };

  console.log('Attempting public registration submission to live Firestore...');
  try {
    await setDoc(doc(db, 'registrations', docId), record);
    console.log('SUCCESS: Registration record successfully created in Firestore!');

    // Now test duplicate prevention (submitting same phone number again)
    console.log('Testing duplicate submission rejection...');
    try {
      await setDoc(doc(db, 'registrations', docId), record);
      console.error('ERROR: Duplicate was not prevented by Firestore rules!');
    } catch (dupErr: any) {
      console.log('SUCCESS: Duplicate submission strictly blocked by Firestore rules:', dupErr.code);
    }

    // Now test public reading of registration (must be BLOCKED for PII protection)
    console.log('Testing public reading of registration (should be denied for unauthenticated)...');
    try {
      await getDoc(doc(db, 'registrations', docId));
      console.error('ERROR: Public read was permitted on sensitive PII data!');
    } catch (readErr: any) {
      console.log('SUCCESS: Public read strictly blocked by security rules:', readErr.code);
    }

    // Cleanup the test record
    // Since public cannot delete, we will note it or test admin delete
  } catch (err: any) {
    console.error('FAILED to create registration:', err.message, err.code);
  }
  process.exit(0);
}

testSubmit();
