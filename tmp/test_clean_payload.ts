import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { ignoreUndefinedProperties: true }, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log('Testing initializeFirestore with ignoreUndefinedProperties...');
  try {
    const d = await getDoc(doc(db, 'settings', 'event'));
    console.log('Read success! Doc exists:', d.exists());
  } catch (err: any) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

run();
