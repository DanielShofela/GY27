import { db } from '../src/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

async function run() {
  console.log('Testing Firestore connection to database:', (db as any)._databaseId?.database);
  try {
    const testDoc = await getDoc(doc(db, 'settings', 'event'));
    console.log('Read settings/event exists:', testDoc.exists());
    if (testDoc.exists()) {
      console.log('Data:', testDoc.data());
    } else {
      console.log('settings/event doc does NOT exist in this database yet.');
    }
  } catch (err: any) {
    console.error('Error reading from Firestore:', err.message, err.code);
  }
  process.exit(0);
}

run();
