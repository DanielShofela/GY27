import firebaseConfig from '../firebase-applet-config.json';

async function testApiKey() {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: 'dummy-invalid-token' }),
  });
  const data = await res.json();
  console.log('Identity Toolkit status:', res.status, data.error?.message);
}

testApiKey();
