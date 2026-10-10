import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();

const auth = getAuth();
const db = getFirestore();

const requireOwner = async (uid: string | undefined) => {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to manage admin accounts.');
  const profile = await db.collection('users').doc(uid).get();
  if (profile.data()?.role !== 'owner') throw new HttpsError('permission-denied', 'Only the Main Owner can manage admin accounts.');
}

export const createStoreManager = onCall(async (request) => {
  await requireOwner(request.auth?.uid);
  const email = String(request.data?.email || '').trim().toLowerCase();
  const password = String(request.data?.password || '');
  if (!email || password.length < 12) throw new HttpsError('invalid-argument', 'Provide an email and a password with at least 12 characters.');

  let user;
  try {
    user = await auth.createUser({ email, password, emailVerified: false, disabled: false });
  } catch (error) {
    throw new HttpsError('already-exists', error instanceof Error ? error.message : 'Could not create this user.');
  }

  await db.collection('users').doc(user.uid).set({
    email,
    role: 'manager',
    createdAt: new Date().toISOString(),
    createdBy: request.auth?.uid,
  });
  return { id: user.uid, email, role: 'manager' };
});

export const removeStoreManager = onCall(async (request) => {
  await requireOwner(request.auth?.uid);
  const uid = String(request.data?.uid || '');
  if (!uid) throw new HttpsError('invalid-argument', 'A manager user ID is required.');
  const profileRef = db.collection('users').doc(uid);
  const profile = await profileRef.get();
  if (!profile.exists || profile.data()?.role !== 'manager') throw new HttpsError('not-found', 'Store Manager not found.');
  await auth.deleteUser(uid);
  await profileRef.delete();
  return { success: true };
});

export const resetStoreManagerPassword = onCall(async (request) => {
  await requireOwner(request.auth?.uid);
  const uid = String(request.data?.uid || '');
  const password = String(request.data?.password || '');
  if (!uid || password.length < 12) throw new HttpsError('invalid-argument', 'Provide a manager ID and a password with at least 12 characters.');
  const profile = await db.collection('users').doc(uid).get();
  if (!profile.exists || profile.data()?.role !== 'manager') throw new HttpsError('not-found', 'Store Manager not found.');
  await auth.updateUser(uid, { password });
  return { success: true };
});
