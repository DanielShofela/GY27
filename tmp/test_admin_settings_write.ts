import { db, auth } from '../src/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

async function testSettingsWrite() {
  console.log('Testing write to settings/event with unauthenticated client...');
  try {
    const payload = {
      location: 'Palais de la Culture, Abidjan (Test)',
      schedules: '1er au 3 janvier 2027 • 08h00 - 18h00',
      contactPhone: '+225 07 00 00 00 00',
      registrationsOpen: true,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'settings', 'event'), payload, { merge: true });
    console.log('UNEXPECTED SUCCESS: Unauthenticated client wrote to settings/event!');
  } catch (err: any) {
    console.log('EXPECTED BEHAVIOR: Unauthenticated write to settings/event failed with:', err.code, err.message);
  }
  process.exit(0);
}

testSettingsWrite();
