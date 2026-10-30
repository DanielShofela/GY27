import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import firebaseConfig from './firebase-applet-config.json';
import { AUTHORIZED_ADMIN_EMAILS } from './src/utils/security';
import { normalizePhoneNumber, isValidPhoneNumber } from './src/utils/phone';
import { generateReferenceCode, getRegistrationDocId } from './src/utils/reference';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '5mb' }));

const PORT = 3000;

// Helper: Firestore REST API URL
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;

// Helper: Convert JS object to Firestore REST API fields
function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value === null) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (typeof value === 'number') {
      fields[key] = Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map((v) => {
            if (typeof v === 'string') return { stringValue: v };
            if (typeof v === 'boolean') return { booleanValue: v };
            if (typeof v === 'number') return { integerValue: String(v) };
            return { stringValue: String(v) };
          }),
        },
      };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreFields(value) } };
    }
  }
  return fields;
}

// Helper: Convert Firestore REST API fields to JS object
function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  if (!fields) return result;
  for (const [key, valObj] of Object.entries(fields)) {
    if ('stringValue' in valObj) result[key] = valObj.stringValue;
    else if ('booleanValue' in valObj) result[key] = valObj.booleanValue;
    else if ('integerValue' in valObj) result[key] = parseInt(valObj.integerValue, 10);
    else if ('doubleValue' in valObj) result[key] = valObj.doubleValue;
    else if ('nullValue' in valObj) result[key] = null;
    else if ('arrayValue' in valObj) {
      result[key] = (valObj.arrayValue?.values || []).map((v: any) => {
        if ('stringValue' in v) return v.stringValue;
        if ('booleanValue' in v) return v.booleanValue;
        if ('integerValue' in v) return parseInt(v.integerValue, 10);
        return v;
      });
    } else if ('mapValue' in valObj) {
      result[key] = fromFirestoreFields(valObj.mapValue?.fields || {});
    }
  }
  return result;
}

// Security: Verify Google Firebase Auth Token server-side
async function verifyAdminAuthToken(
  authHeader?: string
): Promise<{ authorized: boolean; email?: string; uid?: string; idToken?: string; error?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'TOKEN_MANQUANT_OU_INVALIDE' };
  }
  const idToken = authHeader.split(' ')[1];
  if (!idToken || idToken.trim().length === 0) {
    return { authorized: false, error: 'TOKEN_VIDE' };
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    const data = await res.json();
    if (!res.ok || !data.users || data.users.length === 0) {
      return { authorized: false, error: data.error?.message || 'TOKEN_EXPIRE_OU_INVALIDE' };
    }

    const user = data.users[0];
    const email = (user.email || '').toLowerCase().trim();
    const isWhitelisted = AUTHORIZED_ADMIN_EMAILS.some((e) => e.toLowerCase() === email);

    if (!isWhitelisted) {
      return { authorized: false, email, uid: user.localId, error: 'COMPTE_NON_AUTORISE' };
    }

    if (user.emailVerified !== true) {
      return { authorized: false, email, uid: user.localId, error: 'EMAIL_NON_VERIFIE' };
    }

    return { authorized: true, email, uid: user.localId, idToken };
  } catch (err: any) {
    return { authorized: false, error: err.message || 'ERREUR_VERIFICATION_AUTH' };
  }
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/settings - Retrieve global settings (Public)
app.get('/api/settings', async (_req: Request, res: Response) => {
  try {
    const url = `${FIRESTORE_BASE_URL}/settings/event?key=${firebaseConfig.apiKey}`;
    const firestoreRes = await fetch(url);
    if (firestoreRes.status === 404) {
      return res.json({ exists: false, settings: null });
    }
    if (!firestoreRes.ok) {
      const err = await firestoreRes.json();
      return res.status(firestoreRes.status).json({ error: err.error?.message || 'Erreur Firestore' });
    }
    const docData = await firestoreRes.json();
    const settings = fromFirestoreFields(docData.fields || {});
    return res.json({ exists: true, settings });
  } catch (err: any) {
    console.error('Error fetching settings:', err);
    return res.status(500).json({ error: 'Impossible de récupérer les paramètres' });
  }
});

// POST /api/admin/settings - Save global event settings (Admin Only)
app.post('/api/admin/settings', async (req: Request, res: Response) => {
  // 1. Strict Server-Side Auth verification
  const authCheck = await verifyAdminAuthToken(req.headers.authorization);
  if (!authCheck.authorized) {
    return res.status(403).json({
      error: 'Accès interdit : Compte administrateur non vérifié',
      details: authCheck.error,
    });
  }

  // 2. Strict Input validation
  const {
    location,
    schedules,
    contactPhone,
    whatsappChannelUrl,
    registrationsOpen,
    closingDate,
    announcement,
    logoUrl,
    logoUpdatedAt,
    headerLogoUrl,
    headerLogoUpdatedAt,
  } = req.body;

  if (typeof registrationsOpen !== 'boolean') {
    return res.status(400).json({ error: 'Le champ registrationsOpen doit être un booléen' });
  }

  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    location: String(location || '').trim().slice(0, 200),
    schedules: String(schedules || '').trim().slice(0, 200),
    contactPhone: String(contactPhone || '').trim().slice(0, 50),
    whatsappChannelUrl: String(whatsappChannelUrl || '').trim().slice(0, 300),
    registrationsOpen: Boolean(registrationsOpen),
    closingDate: String(closingDate || '').trim().slice(0, 50),
    announcement: String(announcement || '').trim().slice(0, 500),
    updatedAt: now,
    updatedBy: authCheck.email,
  };

  if (logoUrl !== undefined) {
    const rawLogo = String(logoUrl);
    payload.logoUrl = rawLogo.startsWith('data:') ? 'firestore:logo_main' : rawLogo;
    payload.logoUpdatedAt = logoUpdatedAt || now;
  }
  if (headerLogoUrl !== undefined) {
    const rawHeaderLogo = String(headerLogoUrl);
    payload.headerLogoUrl = rawHeaderLogo.startsWith('data:') ? 'firestore:logo_header' : rawHeaderLogo;
    payload.headerLogoUpdatedAt = headerLogoUpdatedAt || now;
  }

  // 3. Write directly to Firestore with verified ID token
  try {
    const patchUrl = `${FIRESTORE_BASE_URL}/settings/event?key=${firebaseConfig.apiKey}`;
    const firestoreRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authCheck.idToken}`,
      },
      body: JSON.stringify({ fields: toFirestoreFields(payload) }),
    });

    if (!firestoreRes.ok) {
      const errData = await firestoreRes.json();
      console.error('Firestore write error:', errData);
      return res.status(firestoreRes.status).json({
        error: 'Échec de la sauvegarde dans Firestore',
        details: errData.error?.message,
      });
    }

    const savedDoc = await firestoreRes.json();
    return res.json({
      success: true,
      message: 'Paramètres enregistrés avec succès dans Firebase',
      settings: fromFirestoreFields(savedDoc.fields || {}),
    });
  } catch (err: any) {
    console.error('Server error saving settings:', err);
    return res.status(500).json({ error: 'Erreur serveur lors de la sauvegarde' });
  }
});

// POST /api/register - Public attendee registration with server-side validation & anti-duplicate
app.post('/api/register', async (req: Request, res: Response) => {
  const {
    firstName,
    lastName,
    whatsappPhone,
    city,
    church,
    ageCategory,
    attendanceDays,
    consentAccepted,
  } = req.body;

  // Validation
  if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 2) {
    return res.status(400).json({ error: 'Prénom requis (minimum 2 caractères)' });
  }
  if (!lastName || typeof lastName !== 'string' || lastName.trim().length < 2) {
    return res.status(400).json({ error: 'Nom requis (minimum 2 caractères)' });
  }
  if (!whatsappPhone || !isValidPhoneNumber(whatsappPhone)) {
    return res.status(400).json({ error: 'Numéro WhatsApp invalide' });
  }
  if (!city || typeof city !== 'string' || city.trim().length < 2) {
    return res.status(400).json({ error: 'Commune ou ville requise' });
  }
  if (!Array.isArray(attendanceDays) || attendanceDays.length === 0) {
    return res.status(400).json({ error: 'Veuillez sélectionner au moins un jour de participation' });
  }
  if (consentAccepted !== true) {
    return res.status(400).json({ error: 'Le consentement est obligatoire pour valider l\'inscription' });
  }

  const phoneCheck = normalizePhoneNumber(whatsappPhone);
  const normalizedPhone = phoneCheck.normalized;
  const docId = getRegistrationDocId(normalizedPhone);
  const referenceCode = generateReferenceCode();
  const now = new Date().toISOString();

  const record = {
    id: docId,
    firstName: firstName.trim().slice(0, 80),
    lastName: lastName.trim().slice(0, 80),
    whatsappPhone: phoneCheck.displayFormatted || whatsappPhone.trim().slice(0, 30),
    normalizedPhone,
    city: city.trim().slice(0, 100),
    church: String(church || '').trim().slice(0, 120),
    ageCategory: ageCategory || 'not_specified',
    attendanceDays,
    status: 'confirmed',
    referenceCode,
    consentAccepted: true,
    consentVersion: 'v1.0',
    createdAt: now,
    updatedAt: now,
  };

  try {
    // Check if duplicate exists
    const checkUrl = `${FIRESTORE_BASE_URL}/registrations/${docId}?key=${firebaseConfig.apiKey}`;
    const checkRes = await fetch(checkUrl);
    if (checkRes.ok) {
      return res.status(409).json({
        error: 'ALREADY_REGISTERED',
        message: 'Ce numéro WhatsApp est déjà inscrit pour GLORIOUS YOUTH WORLDWIDE 2027.',
      });
    }

    // Write new registration
    const writeUrl = `${FIRESTORE_BASE_URL}/registrations/${docId}?key=${firebaseConfig.apiKey}`;
    const writeRes = await fetch(writeUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFirestoreFields(record) }),
    });

    if (!writeRes.ok) {
      const err = await writeRes.json();
      return res.status(writeRes.status).json({
        error: 'Erreur Firestore lors de l\'inscription',
        details: err.error?.message,
      });
    }

    return res.status(201).json({
      success: true,
      registration: record,
    });
  } catch (err: any) {
    console.error('Registration server error:', err);
    return res.status(500).json({ error: 'Erreur serveur lors de l\'enregistrement' });
  }
});

// PATCH /api/admin/registrations/:id - Modify registration details or status (Admin Only)
app.patch('/api/admin/registrations/:id', async (req: Request, res: Response) => {
  const authCheck = await verifyAdminAuthToken(req.headers.authorization);
  if (!authCheck.authorized) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  const docId = req.params.id;
  const updates = req.body;
  const now = new Date().toISOString();

  const allowedUpdates: Record<string, any> = {
    updatedAt: now,
  };

  if (updates.status) allowedUpdates.status = updates.status;
  if (updates.firstName) allowedUpdates.firstName = String(updates.firstName).trim().slice(0, 80);
  if (updates.lastName) allowedUpdates.lastName = String(updates.lastName).trim().slice(0, 80);
  if (updates.city) allowedUpdates.city = String(updates.city).trim().slice(0, 100);
  if (updates.church !== undefined) allowedUpdates.church = String(updates.church).trim().slice(0, 120);
  if (updates.ageCategory) allowedUpdates.ageCategory = updates.ageCategory;
  if (Array.isArray(updates.attendanceDays)) allowedUpdates.attendanceDays = updates.attendanceDays;
  if (updates.whatsappPhone) {
    allowedUpdates.whatsappPhone = String(updates.whatsappPhone).trim();
    if (isValidPhoneNumber(updates.whatsappPhone)) {
      const check = normalizePhoneNumber(updates.whatsappPhone);
      allowedUpdates.normalizedPhone = check.normalized;
      allowedUpdates.whatsappPhone = check.displayFormatted;
    }
  }

  try {
    // Build update mask query params
    const updateMaskKeys = Object.keys(allowedUpdates)
      .map((k) => `updateMask.fieldPaths=${k}`)
      .join('&');
    const patchUrl = `${FIRESTORE_BASE_URL}/registrations/${docId}?${updateMaskKeys}&key=${firebaseConfig.apiKey}`;

    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authCheck.idToken}`,
      },
      body: JSON.stringify({ fields: toFirestoreFields(allowedUpdates) }),
    });

    if (!patchRes.ok) {
      const err = await patchRes.json();
      return res.status(patchRes.status).json({ error: err.error?.message || 'Erreur mise à jour Firestore' });
    }

    const updatedDoc = await patchRes.json();
    return res.json({
      success: true,
      message: 'Inscription mise à jour avec succès',
      registration: fromFirestoreFields(updatedDoc.fields || {}),
    });
  } catch (err: any) {
    console.error('Error updating registration:', err);
    return res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
  }
});

// DELETE /api/admin/registrations/:id - Delete registration (Admin Only)
app.delete('/api/admin/registrations/:id', async (req: Request, res: Response) => {
  const authCheck = await verifyAdminAuthToken(req.headers.authorization);
  if (!authCheck.authorized) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  const docId = req.params.id;
  try {
    const deleteUrl = `${FIRESTORE_BASE_URL}/registrations/${docId}?key=${firebaseConfig.apiKey}`;
    const deleteRes = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authCheck.idToken}`,
      },
    });

    if (!deleteRes.ok) {
      const err = await deleteRes.json();
      return res.status(deleteRes.status).json({ error: err.error?.message || 'Erreur suppression Firestore' });
    }

    return res.json({ success: true, message: 'Inscription supprimée de Firestore avec succès', id: docId });
  } catch (err: any) {
    console.error('Error deleting registration:', err);
    return res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
  }
});

// -------------------------------------------------------------
// VITE DEV SERVER OR PRODUCTION STATIC SERVING
// -------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GLORIOUS YOUTH Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server start error:', err);
  process.exit(1);
});
