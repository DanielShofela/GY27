import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { User, signInWithPopup, signOut } from 'firebase/auth';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, googleProvider } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { Registration, EventSettings, RegistrationStatus } from '../types/index';
import { getRegistrationDocId, generateReferenceCode } from '../utils/reference';
import { isAuthorizedAdmin } from '../utils/security';

export const ADMIN_EMAILS = [
  'daniel.shofela01@gmail.com',
  'digitalsoutien@gmail.com',
];

export const DEFAULT_SETTINGS: EventSettings = {
  location: 'Abidjan, Côte d\'Ivoire (Lieu exact communiqué prochainement)',
  schedules: '1er au 3 janvier 2027 • Accueil à partir de 08h00',
  contactPhone: '+225 07 00 00 00 00',
  whatsappChannelUrl: '',
  registrationsOpen: true,
  closingDate: '31 décembre 2026 à 23h59',
  announcement: 'Les inscriptions sont 100% gratuites. Réservez votre place dès maintenant !',
  logoUrl: '/official-logo.svg',
  logoUpdatedAt: '2026-01-01T00:00:00.000Z',
  headerLogoUrl: '',
  headerLogoUpdatedAt: '',
  updatedAt: new Date().toISOString(),
};

/**
 * Returns initial settings synchronously from browser storage or bundled defaults.
 * Prevents any layout flash or delay before the first asynchronous Firestore fetch.
 */
export function getInitialEventSettings(): EventSettings {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('gyw_event_settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
        };
      }
    } catch {
      // fallback to DEFAULT_SETTINGS
    }
  }
  return DEFAULT_SETTINGS;
}

/**
 * Checks if the currently authenticated user is an authorized administrator.
 * Validates verified email against primary admin and checks Firestore admins/{uid}.
 */
export async function verifyIsAdmin(user?: User | null): Promise<boolean> {
  if (!user || !user.email) return false;

  // 1. Strict primary admin check with verified email
  const check = isAuthorizedAdmin({
    uid: user.uid,
    email: user.email,
    email_verified: user.emailVerified,
  });

  if (check.authorized) {
    return true;
  }

  // 2. Check explicitly whitelisted UIDs in Firestore admins collection
  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    if (adminDoc.exists()) {
      const data = adminDoc.data();
      return data?.role === 'admin' || data?.role === 'superadmin';
    }
    return false;
  } catch (error) {
    console.warn('Could not verify admin role against firestore collection:', error);
    return false;
  }
}

/**
 * Sign in admin with Google Popup.
 */
export async function signInAdmin(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign out current user.
 */
export async function logOutAdmin(): Promise<void> {
  await signOut(auth);
}

// Safe chunk threshold in characters for Firestore documents (~350 KB, well under 1,048,576 bytes limit)
const LOGO_CHUNK_SIZE = 350 * 1024;

/**
 * Persists an SVG data URI into dedicated Firestore documents, chunking if necessary.
 * Avoids ever exceeding Firestore's strict 1,048,576 bytes document limit.
 */
export async function saveLogoToFirestore(
  logoKey: 'logo_main' | 'logo_header',
  dataUri: string,
  user?: User | null
): Promise<void> {
  const isAuthorized = await verifyIsAdmin(user);
  if (!isAuthorized) {
    throw new Error('NOT_AUTHORIZED');
  }

  const now = new Date().toISOString();
  const version = Date.now();

  if (dataUri.length <= LOGO_CHUNK_SIZE) {
    // Single document mode
    await setDoc(doc(db, 'settings', logoKey), {
      type: 'single',
      chunksCount: 1,
      dataUri,
      updatedAt: now,
      version,
    });
  } else {
    // Multi-chunk mode
    const totalChunks = Math.ceil(dataUri.length / LOGO_CHUNK_SIZE);
    const chunkWrites = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunk = dataUri.slice(i * LOGO_CHUNK_SIZE, (i + 1) * LOGO_CHUNK_SIZE);
      chunkWrites.push(
        setDoc(doc(db, 'settings', `${logoKey}_chunk_${i}`), {
          chunk,
          index: i,
          totalChunks,
          updatedAt: now,
        })
      );
    }
    await Promise.all(chunkWrites);

    // Write manifest doc
    await setDoc(doc(db, 'settings', logoKey), {
      type: 'chunked',
      chunksCount: totalChunks,
      totalLength: dataUri.length,
      updatedAt: now,
      version,
    });
  }
}

/**
 * Loads a logo SVG data URI from dedicated Firestore documents, reassembling chunks if needed.
 */
export async function loadLogoFromFirestore(
  logoKey: 'logo_main' | 'logo_header'
): Promise<string | null> {
  try {
    const snapshot = await getDoc(doc(db, 'settings', logoKey));
    if (!snapshot.exists()) return null;
    const data = snapshot.data();

    if (data?.type === 'chunked' && data?.chunksCount > 1) {
      const chunkSnaps = await Promise.all(
        Array.from({ length: data.chunksCount }, (_, i) =>
          getDoc(doc(db, 'settings', `${logoKey}_chunk_${i}`))
        )
      );
      const assembled = chunkSnaps.map((s) => s.data()?.chunk || '').join('');
      return assembled || null;
    }

    if (data?.dataUri) {
      return data.dataUri;
    }

    return null;
  } catch (err) {
    console.warn(`Could not load logo ${logoKey} from Firestore:`, err);
    return null;
  }
}

/**
 * Removes a logo from dedicated Firestore documents including any chunks.
 */
export async function deleteLogoFromFirestore(
  logoKey: 'logo_main' | 'logo_header',
  user?: User | null
): Promise<void> {
  const isAuthorized = await verifyIsAdmin(user);
  if (!isAuthorized) {
    throw new Error('NOT_AUTHORIZED');
  }

  try {
    const snapshot = await getDoc(doc(db, 'settings', logoKey));
    if (snapshot.exists()) {
      const data = snapshot.data();
      const deletes = [deleteDoc(doc(db, 'settings', logoKey))];
      if (data?.chunksCount && data.chunksCount > 1) {
        for (let i = 0; i < data.chunksCount; i++) {
          deletes.push(deleteDoc(doc(db, 'settings', `${logoKey}_chunk_${i}`)));
        }
      }
      await Promise.all(deletes);
    }
  } catch (err) {
    console.warn(`Error deleting logo ${logoKey} from Firestore:`, err);
  }
}

/**
 * Retrieves global event settings with Firestore persistence and client-side fallback cache.
 */
export async function getEventSettings(): Promise<EventSettings> {
  let cached: Partial<EventSettings> = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('gyw_event_settings');
      if (raw) cached = JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  try {
    const snapshot = await getDoc(doc(db, 'settings', 'event'));
    let firestoreData: Partial<EventSettings> = {};
    if (snapshot.exists()) {
      firestoreData = snapshot.data() as Partial<EventSettings>;
    }

    const merged: EventSettings = {
      ...DEFAULT_SETTINGS,
      ...cached,
      ...firestoreData,
    };

    // 1. Resolve main logo if stored in dedicated document
    if (firestoreData.logoUrl === 'firestore:logo_main' || (!firestoreData.logoUrl && !cached.logoUrl)) {
      const loaded = await loadLogoFromFirestore('logo_main');
      if (loaded) {
        merged.logoUrl = loaded;
      } else if (!firestoreData.logoUrl) {
        merged.logoUrl = DEFAULT_SETTINGS.logoUrl;
      }
    } else if (firestoreData.logoUrl) {
      merged.logoUrl = firestoreData.logoUrl;
    }

    // 2. Resolve header logo if stored in dedicated document
    if (firestoreData.headerLogoUrl === 'firestore:logo_header') {
      const loaded = await loadLogoFromFirestore('logo_header');
      if (loaded) {
        merged.headerLogoUrl = loaded;
      } else {
        merged.headerLogoUrl = '';
      }
    } else if (firestoreData.headerLogoUrl !== undefined) {
      merged.headerLogoUrl = firestoreData.headerLogoUrl;
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gyw_event_settings', JSON.stringify(merged));
      } catch {
        // ignore
      }
    }
    return merged;
  } catch (error) {
    console.warn('Could not load settings from server, using cached/defaults:', error);
    return { ...DEFAULT_SETTINGS, ...cached };
  }
}

/**
 * Strips undefined properties to guarantee strict Firestore SDK compatibility.
 */
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean as T;
}

/**
 * Updates event settings (Admin only).
 * Connects through the secure backend API with direct Firestore fallback and atomic validation.
 * Guaranteed to keep the settings/event document under 5 KB by decoupling heavy data URIs.
 */
export async function updateEventSettings(
  newSettings: Partial<EventSettings>,
  callerUser?: User | null,
  autoProcessLogos = true
): Promise<EventSettings> {
  const user = callerUser || auth.currentUser;
  const isAuthorized = await verifyIsAdmin(user);
  if (!isAuthorized) {
    throw new Error('NOT_AUTHORIZED');
  }

  const path = 'settings/event';
  const existing = await getEventSettings();

  let resolvedLogoUrl = newSettings.logoUrl !== undefined ? newSettings.logoUrl : existing.logoUrl;
  let resolvedHeaderLogoUrl =
    newSettings.headerLogoUrl !== undefined ? newSettings.headerLogoUrl : existing.headerLogoUrl;

  // Protect settings/event from 1MB limit by decoupling large data URIs
  let payloadLogoUrl = resolvedLogoUrl;
  if (resolvedLogoUrl && resolvedLogoUrl.startsWith('data:')) {
    if (autoProcessLogos) {
      await saveLogoToFirestore('logo_main', resolvedLogoUrl, user);
    }
    payloadLogoUrl = 'firestore:logo_main';
  }

  let payloadHeaderLogoUrl = resolvedHeaderLogoUrl;
  if (resolvedHeaderLogoUrl && resolvedHeaderLogoUrl.startsWith('data:')) {
    if (autoProcessLogos) {
      await saveLogoToFirestore('logo_header', resolvedHeaderLogoUrl, user);
    }
    payloadHeaderLogoUrl = 'firestore:logo_header';
  }

  const rawPayload: EventSettings = {
    ...existing,
    ...newSettings,
    logoUrl: payloadLogoUrl,
    headerLogoUrl: payloadHeaderLogoUrl,
    updatedAt: new Date().toISOString(),
    updatedBy: user?.email || 'admin',
  };
  const payload = cleanFirestoreData(rawPayload);

  // 1. Try secure backend API route if authenticated
  let apiSucceeded = false;
  if (typeof window !== 'undefined') {
    try {
      const idToken = await user?.getIdToken();
      if (idToken) {
        const res = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          apiSucceeded = true;
        } else {
          console.warn('Backend API /api/admin/settings returned error, trying direct Firestore SDK:', res.status);
        }
      }
    } catch (apiErr) {
      console.warn('Could not contact /api/admin/settings, falling back to direct Firestore SDK:', apiErr);
    }
  }

  // 2. Direct Firestore SDK write (if backend API not reached or fallback)
  if (!apiSucceeded) {
    try {
      const settingsDoc = doc(db, 'settings', 'event');
      await setDoc(settingsDoc, payload, { merge: true });
    } catch (error: any) {
      console.error('Failed to save settings to Firestore:', error);
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  }

  // Return settings with resolved URLs for immediate UI consumption
  const confirmedSettings: EventSettings = {
    ...rawPayload,
    logoUrl: resolvedLogoUrl,
    headerLogoUrl: resolvedHeaderLogoUrl,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('gyw_event_settings', JSON.stringify(confirmedSettings));
    } catch {
      // ignore
    }
  }

  return confirmedSettings;
}

/**
 * Updates the official SVG logo in persistent storage and Firestore settings.
 * Checks server-side authorization, tries storage upload or falls back to chunked Firestore documents.
 */
export async function updateOfficialLogo(
  sanitizedDataUri: string,
  rawSvgText?: string,
  callerUser?: User | null
): Promise<string> {
  const user = callerUser || auth.currentUser;
  const isAuthorized = await verifyIsAdmin(user);
  if (!isAuthorized) {
    throw new Error('NOT_AUTHORIZED');
  }

  const timestamp = Date.now();
  const now = new Date(timestamp).toISOString();
  let finalLogoUrl = sanitizedDataUri;

  // Try Firebase Storage upload with a 2-second timeout to handle CORS / unprovisioned storage smoothly
  try {
    const storageRef = ref(storage, `logos/official_logo_${timestamp}.svg`);
    const contentToUpload = rawSvgText || sanitizedDataUri;

    const uploadAttempt = (async () => {
      await uploadString(
        storageRef,
        contentToUpload,
        rawSvgText ? 'raw' : 'data_url',
        {
          contentType: 'image/svg+xml',
          cacheControl: 'public, max-age=31536000',
        }
      );
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl ? `${downloadUrl}?v=${timestamp}` : sanitizedDataUri;
    })();

    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('STORAGE_TIMEOUT')), 2000);
    });

    finalLogoUrl = await Promise.race([uploadAttempt, timeoutPromise]);
  } catch {
    // Cloud storage unavailable or timed out; persisting into dedicated chunked Firestore logo document
    finalLogoUrl = sanitizedDataUri;
  }

  // Persist into settings and dedicated storage
  await updateEventSettings(
    {
      logoUrl: finalLogoUrl,
      logoUpdatedAt: now,
    },
    user,
    true
  );

  return finalLogoUrl;
}

/**
 * Removes the official logo from persistent settings.
 */
export async function removeOfficialLogo(callerUser?: User | null): Promise<void> {
  const user = callerUser || auth.currentUser;
  const isAuthorized = await verifyIsAdmin(user);
  if (!isAuthorized) {
    throw new Error('NOT_AUTHORIZED');
  }

  await deleteLogoFromFirestore('logo_main', user);
  await updateEventSettings(
    {
      logoUrl: '',
      logoUpdatedAt: new Date().toISOString(),
    },
    user,
    false
  );
}

/**
 * Restores the official static logo to the default bundled asset.
 */
export async function resetOfficialLogoToDefault(callerUser?: User | null): Promise<string> {
  const user = callerUser || auth.currentUser;
  const isAuthorized = await verifyIsAdmin(user);
  if (!isAuthorized) {
    throw new Error('NOT_AUTHORIZED');
  }

  await deleteLogoFromFirestore('logo_main', user);
  const defaultUrl = '/official-logo.svg';
  await updateEventSettings(
    {
      logoUrl: defaultUrl,
      logoUpdatedAt: new Date().toISOString(),
    },
    user,
    false
  );
  return defaultUrl;
}

/**
 * Updates the Header navigation SVG logo in persistent storage and Firestore settings.
 */
export async function updateHeaderLogo(
  sanitizedDataUri: string,
  rawSvgText?: string,
  callerUser?: User | null
): Promise<string> {
  const user = callerUser || auth.currentUser;
  const isAuthorized = await verifyIsAdmin(user);
  if (!isAuthorized) {
    throw new Error('NOT_AUTHORIZED');
  }

  const timestamp = Date.now();
  const now = new Date(timestamp).toISOString();
  let finalHeaderLogoUrl = sanitizedDataUri;

  try {
    const storageRef = ref(storage, `logos/header_logo_${timestamp}.svg`);
    const contentToUpload = rawSvgText || sanitizedDataUri;

    const uploadAttempt = (async () => {
      await uploadString(
        storageRef,
        contentToUpload,
        rawSvgText ? 'raw' : 'data_url',
        {
          contentType: 'image/svg+xml',
          cacheControl: 'public, max-age=31536000',
        }
      );
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl ? `${downloadUrl}?v=${timestamp}` : sanitizedDataUri;
    })();

    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('STORAGE_TIMEOUT')), 2000);
    });

    finalHeaderLogoUrl = await Promise.race([uploadAttempt, timeoutPromise]);
  } catch {
    finalHeaderLogoUrl = sanitizedDataUri;
  }

  await updateEventSettings(
    {
      headerLogoUrl: finalHeaderLogoUrl,
      headerLogoUpdatedAt: now,
    },
    user,
    true
  );

  return finalHeaderLogoUrl;
}

/**
 * Removes the customized header logo, reverting navigation bar back to the fallback GYW icon badge.
 */
export async function removeHeaderLogo(callerUser?: User | null): Promise<void> {
  const user = callerUser || auth.currentUser;
  const isAuthorized = await verifyIsAdmin(user);
  if (!isAuthorized) {
    throw new Error('NOT_AUTHORIZED');
  }

  await deleteLogoFromFirestore('logo_header', user);
  await updateEventSettings(
    {
      headerLogoUrl: '',
      headerLogoUpdatedAt: new Date().toISOString(),
    },
    user,
    false
  );
}

/**
 * Copies the current main official logo to be reused as the header navigation logo.
 */
export async function useMainLogoAsHeaderLogo(callerUser?: User | null): Promise<string> {
  const user = callerUser || auth.currentUser;
  const isAuthorized = await verifyIsAdmin(user);
  if (!isAuthorized) {
    throw new Error('NOT_AUTHORIZED');
  }

  const currentSettings = await getEventSettings();
  const mainLogo = currentSettings.logoUrl || '/official-logo.svg';

  if (mainLogo.startsWith('data:')) {
    await saveLogoToFirestore('logo_header', mainLogo, user);
    await updateEventSettings(
      {
        headerLogoUrl: 'firestore:logo_header',
        headerLogoUpdatedAt: new Date().toISOString(),
      },
      user,
      false
    );
  } else {
    await deleteLogoFromFirestore('logo_header', user);
    await updateEventSettings(
      {
        headerLogoUrl: mainLogo,
        headerLogoUpdatedAt: new Date().toISOString(),
      },
      user,
      false
    );
  }

  return mainLogo;
}

/**
 * Submits a new registration with anti-duplicate validation.
 */
export async function submitRegistration(payload: {
  firstName: string;
  lastName: string;
  whatsappPhone: string;
  normalizedPhone: string;
  city: string;
  church?: string;
  ageCategory?: Registration['ageCategory'];
  attendanceDays: Registration['attendanceDays'];
  consentAccepted: boolean;
}): Promise<{ registration: Registration; isNew: boolean }> {
  const docId = getRegistrationDocId(payload.normalizedPhone);
  const path = `registrations/${docId}`;

  // Check if registrations are open
  const settings = await getEventSettings();
  if (!settings.registrationsOpen) {
    throw new Error('REGISTRATIONS_CLOSED');
  }

  // Check if document already exists to prevent duplicate WhatsApp registrations
  try {
    const existingDoc = await getDoc(doc(db, 'registrations', docId));
    if (existingDoc.exists()) {
      const data = existingDoc.data() as Registration;
      const duplicateError = new Error('ALREADY_REGISTERED');
      (duplicateError as any).existingRegistration = data;
      throw duplicateError;
    }
  } catch (err: any) {
    if (err.message === 'ALREADY_REGISTERED') {
      throw err;
    }
    // If permission error reading doc directly as public, continue to atomic create
  }

  const referenceCode = generateReferenceCode();
  const now = new Date().toISOString();

  const record: Registration = {
    id: docId,
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    whatsappPhone: payload.whatsappPhone.trim(),
    normalizedPhone: payload.normalizedPhone,
    city: payload.city.trim(),
    church: payload.church?.trim() || '',
    ageCategory: payload.ageCategory || 'not_specified',
    attendanceDays: payload.attendanceDays,
    status: 'confirmed',
    referenceCode,
    consentAccepted: payload.consentAccepted,
    consentVersion: 'v1.0',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'registrations', docId), record);
    return { registration: record, isNew: true };
  } catch (error: any) {
    // If rules rejected write because doc already exists
    if (error?.code === 'permission-denied' || error?.message?.includes('permission-denied')) {
      const errorMsg = String(error?.message || '');
      // Could be already registered duplicate or registrations closed
      throw new Error('REGISTRATION_FAILED_OR_DUPLICATE');
    }
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Listens to all registrations in real-time (Admin only).
 */
export function subscribeToRegistrations(
  onData: (registrations: Registration[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = 'registrations';
  const q = query(collection(db, 'registrations'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Registration[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<Registration, 'id'>) });
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e: any) {
        onError(e);
      }
    }
  );
}

/**
 * Updates an attendee's registration details (Admin only).
 * Supports updating personal info, church, category, days, and status with server-side validation.
 */
export async function updateRegistration(
  docId: string,
  updates: Partial<Registration>,
  callerUser?: User | null
): Promise<Registration> {
  const user = callerUser || auth.currentUser;
  const isAuthorized = await verifyIsAdmin(user);
  if (!isAuthorized) {
    throw new Error('NOT_AUTHORIZED');
  }

  const path = `registrations/${docId}`;
  const rawPayload = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  const payload = cleanFirestoreData(rawPayload);

  // 1. Try secure backend API
  if (typeof window !== 'undefined') {
    try {
      const idToken = await user?.getIdToken();
      if (idToken) {
        const res = await fetch(`/api/admin/registrations/${docId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const resData = await res.json();
          return resData.registration as Registration;
        }
      }
    } catch (apiErr) {
      console.warn('API /api/admin/registrations failed, falling back to Firestore SDK:', apiErr);
    }
  }

  // 2. Fallback to direct Firestore SDK
  try {
    await updateDoc(doc(db, 'registrations', docId), payload);
    const updatedSnap = await getDoc(doc(db, 'registrations', docId));
    return { id: docId, ...(updatedSnap.data() as Omit<Registration, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Updates a registration's status (Admin only).
 */
export async function updateRegistrationStatus(
  docId: string,
  newStatus: RegistrationStatus,
  callerUser?: User | null
): Promise<void> {
  await updateRegistration(docId, { status: newStatus }, callerUser);
}

/**
 * Deletes a registration record (Admin only).
 */
export async function deleteRegistration(
  docId: string,
  callerUser?: User | null
): Promise<void> {
  const user = callerUser || auth.currentUser;
  const isAuthorized = await verifyIsAdmin(user);
  if (!isAuthorized) {
    throw new Error('NOT_AUTHORIZED');
  }

  const path = `registrations/${docId}`;

  // 1. Try secure backend API
  if (typeof window !== 'undefined') {
    try {
      const idToken = await user?.getIdToken();
      if (idToken) {
        const res = await fetch(`/api/admin/registrations/${docId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (res.ok) {
          return;
        }
      }
    } catch (apiErr) {
      console.warn('API DELETE /api/admin/registrations failed, falling back to Firestore SDK:', apiErr);
    }
  }

  // 2. Direct Firestore SDK delete
  try {
    await deleteDoc(doc(db, 'registrations', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}
