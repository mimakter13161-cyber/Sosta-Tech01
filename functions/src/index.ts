import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';

initializeApp();

const auth = getAuth();
const db = getFirestore();

const siteOriginForRequest = (request: { get: (name: string) => string | undefined; hostname: string }) => {
  const forwardedHost = request.get('x-forwarded-host')?.split(',')[0].trim();
  const host = forwardedHost || request.get('host') || request.hostname;
  if (!/^[a-z\d.-]+(?::\d{1,5})?$/i.test(host)) {
    throw new Error('The request host is not a valid hostname.');
  }
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
};

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

export const robotsTxt = onRequest((request, response) => {
  try {
    const origin = siteOriginForRequest(request);
    response
      .set('Cache-Control', 'public, max-age=3600')
      .type('text/plain')
      .send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /compare\nSitemap: ${origin}/sitemap.xml\n`);
  } catch (error) {
    console.error('Could not generate robots.txt for this request.', error);
    response.status(400).type('text/plain').send('Could not generate robots.txt for this host.');
  }
});

export const sitemapXml = onRequest(async (request, response) => {
  try {
    const origin = siteOriginForRequest(request);
    const fixedPaths = ['/', '/catalog', '/android', '/about', '/contact', '/happy-customers'];
    const productSnapshot = await db.collection('products').get();
    const productPaths = productSnapshot.docs.map((product) => `/product/${encodeURIComponent(product.id)}`);
    const locations = [...fixedPaths, ...productPaths]
      .map((route) => `  <url><loc>${escapeXml(`${origin}${route}`)}</loc></url>`)
      .join('\n');
    response
      .set('Cache-Control', 'public, max-age=300')
      .type('application/xml')
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locations}\n</urlset>\n`);
  } catch (error) {
    console.error('Could not generate sitemap.xml.', error);
    response.status(500).type('text/plain').send('Could not generate the sitemap.');
  }
});

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
