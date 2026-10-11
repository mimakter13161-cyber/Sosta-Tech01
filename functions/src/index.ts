import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';

initializeApp();

const auth = getAuth();
const db = getFirestore();
const facebookPageAccessToken = defineSecret('FACEBOOK_PAGE_ACCESS_TOKEN');
const facebookPageId = defineString('FACEBOOK_PAGE_ID', { default: '' });
const FACEBOOK_FEED_CACHE_PATH = ['publicContent', 'facebookFeed'] as const;
const DEFAULT_SITE_CONFIG = {
  logoUrl: '/favicon.svg',
  brandName: 'Sosta Tech',
  contactNumber: '01768695587',
  whatsAppNumber: '8801768695587',
  tagline: 'Think Premium. Buy Smart.',
  heroTitle: 'iPhone 16 Pro & Pro Max',
  heroSubtitle: 'Titanium Intelligence. Unbeatable Rajshahi Pricing.',
  heroDescription: 'Experience aerospace-grade titanium, the groundbreaking A18 Pro chip, and Apple Intelligence. Verified authentic boxed and active units available for immediate hands-on testing in Rajshahi.',
  heroBanners: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBNp0r-JewijI6zI8Sd8QpXBwHtmlJjVEnaBjpOlfGuUwF6-zkfXZ1_-TPWwpqOyM-A9p4h6Ksi-2tiHK6Fjoq_P12VVua0StrsiUeB4WyonS8nwtH4ogARj_5HrrszpXzdAB_iJ_Uul706GX-Sf66RNVPf9aS6WzmOSxXUaA7jHIcaOFsIdZDdfeMW3__Cx5URuPu9wezizlo7IWjw7f-a9R7qOhJxUKej0BVJJO4vV3mZ7dTEL6RV'],
  facebookPageUrl: 'https://www.facebook.com/sosta.techbd',
  liveContent: {},
  footerDescription: 'Sosta Tech is a premier gadget and smartphone shop located at Theme Omar Plaza (5th Floor) in Rajshahi, Bangladesh. We specialize in high-quality refurbished, used, and full-box smartphones and accessories.',
  footerTrustText: 'Product authenticity, fair pricing, and excellent customer service',
  footerCopyright: '(c) 2025 Sosta Tech Bangladesh. All rights reserved. Theme Omar Plaza, Rajshahi.',
  footerLocation: '5th Floor, Theme Omar Plaza, New Market, Rajshahi, Bangladesh',
  storeHours: 'Saturday - Thursday: 10:00 AM - 9:00 PM\nFriday: 2:00 PM - 9:00 PM (after Jummah)',
};

interface FacebookPost {
  id: string;
  message: string;
  permalinkUrl: string;
  createdAt: string;
  imageUrl?: string;
}

interface FacebookFeed {
  posts: FacebookPost[];
  syncedAt: string | null;
}

const readCachedFacebookFeed = async (): Promise<FacebookFeed> => {
  const snapshot = await db.doc(FACEBOOK_FEED_CACHE_PATH.join('/')).get();
  if (!snapshot.exists) return { posts: [], syncedAt: null };
  const data = snapshot.data();
  const posts = Array.isArray(data?.posts) ? data.posts : [];
  return {
    posts: posts.filter((post): post is FacebookPost =>
      Boolean(post && typeof post.id === 'string' &&
        typeof post.message === 'string' &&
        typeof post.permalinkUrl === 'string' &&
        typeof post.createdAt === 'string')
    ).slice(0, 10),
    syncedAt: typeof data?.syncedAt === 'string' ? data.syncedAt : null,
  };
};

const requireStoreAdmin = async (uid: string | undefined) => {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in with an admin account to sync the Facebook feed.');
  const profile = await db.collection('users').doc(uid).get();
  const data = profile.data();
  if (!['owner', 'manager'].includes(String(data?.role || '')) ||
      data?.status === 'pending' || data?.status === 'rejected' ||
      data?.mustChangePassword === true) {
    throw new HttpsError('permission-denied', 'Only Sosta Tech administrators can sync the Facebook feed.');
  }
};

export const getFacebookFeed = onCall(async () => readCachedFacebookFeed());

export const getOwnerSetupStatus = onCall(async () => {
  const usersCollection = db.collection('users');
  const ownerRef = db.collection('settings').doc('owner');
  const [ownerMarker, owners, users] = await Promise.all([
    ownerRef.get(),
    usersCollection.where('role', '==', 'owner').limit(1).get(),
    usersCollection.limit(1).get(),
  ]);
  if (!ownerMarker.exists && !owners.empty) {
    const legacyOwner = owners.docs[0];
    await ownerRef.create({
      uid: legacyOwner.id,
      role: 'owner',
      createdAt: legacyOwner.data().createdAt || new Date().toISOString(),
    }).catch(async (error: unknown) => {
      const refreshed = await ownerRef.get();
      if (!refreshed.exists) throw error;
    });
  }
  if (ownerMarker.exists || !owners.empty || !users.empty) return { needsOwnerSetup: false };

  const email = 'admin@sostatech.bd';
  const settingsRef = db.collection('settings').doc('site_config');
  let seededUser;
  try {
    seededUser = await auth.createUser({
      email,
      password: 'Owner@010101',
      emailVerified: true,
      disabled: false,
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/email-already-exists') {
      throw new HttpsError('failed-precondition', 'The default Owner email already exists in Firebase Authentication but has no Firestore Owner profile. Remove or reconcile that account before retrying bootstrap.');
    }
    throw error;
  }
  const createdAt = new Date().toISOString();
  await db.runTransaction(async (transaction) => {
    const [existingOwner, existingUsers, existingSettings] = await Promise.all([
      transaction.get(ownerRef),
      transaction.get(usersCollection.limit(1)),
      transaction.get(settingsRef),
    ]);
    if (existingOwner.exists || !existingUsers.empty) {
      throw new HttpsError('already-exists', 'An admin account was created while initializing the default Owner. Contact Firebase support.');
    }
    transaction.create(usersCollection.doc(seededUser.uid), {
      email,
      role: 'owner',
      status: 'approved',
      mustChangePassword: true,
      createdAt,
    });
    transaction.create(ownerRef, { uid: seededUser.uid, role: 'owner', createdAt });
    if (!existingSettings.exists) transaction.create(settingsRef, DEFAULT_SITE_CONFIG);
  });
  return { needsOwnerSetup: false };
});

export const initializeOwnerAccount = onCall(async () => {
  throw new HttpsError('failed-precondition', 'Manual Owner creation is disabled. The default Owner is initialized by getOwnerSetupStatus.');
});

export const syncFacebookFeed = onCall(
  { secrets: [facebookPageAccessToken] },
  async (request): Promise<FacebookFeed> => {
    await requireStoreAdmin(request.auth?.uid);
    const token = facebookPageAccessToken.value();
    const pageId = facebookPageId.value().trim();
    if (!token || !pageId) {
      throw new HttpsError(
        'failed-precondition',
        'Facebook feed sync is not configured. Set FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID in Firebase Functions.'
      );
    }
    if (!/^\d+$/.test(pageId)) {
      throw new HttpsError('failed-precondition', 'FACEBOOK_PAGE_ID must be the numeric ID of the Sosta Tech Facebook Page.');
    }

    try {
      const graphUrl = new URL(`https://graph.facebook.com/v22.0/${pageId}/posts`);
      graphUrl.searchParams.set('fields', 'id,message,permalink_url,created_time,full_picture');
      graphUrl.searchParams.set('limit', '10');
      const response = await fetch(graphUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(12_000),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const graphError = result && typeof result === 'object' && 'error' in result
          ? (result as { error?: { code?: number; message?: string } }).error
          : undefined;
        const expiredToken = graphError?.code === 190;
        throw new HttpsError(
          'unavailable',
          expiredToken
            ? 'The Facebook Page access token expired or was revoked. Update FACEBOOK_PAGE_ACCESS_TOKEN in Firebase Secret Manager. The last cached feed is still available.'
            : `Facebook could not refresh the feed${graphError?.message ? `: ${graphError.message}` : ` (HTTP ${response.status})`}. The last cached feed is still available.`
        );
      }
      if (!result || typeof result !== 'object' || !('data' in result) || !Array.isArray(result.data)) {
        throw new HttpsError('unavailable', 'Facebook returned an invalid feed response. The last cached feed is still available.');
      }

      const posts = result.data.flatMap((entry): FacebookPost[] => {
        if (!entry || typeof entry !== 'object') return [];
        const post = entry as Record<string, unknown>;
        if (typeof post.id !== 'string' || typeof post.permalink_url !== 'string') return [];
        return [{
          id: post.id,
          message: typeof post.message === 'string' ? post.message.slice(0, 5000) : '',
          permalinkUrl: post.permalink_url,
          createdAt: typeof post.created_time === 'string' ? post.created_time : new Date().toISOString(),
          ...(typeof post.full_picture === 'string' ? { imageUrl: post.full_picture } : {}),
        }];
      }).slice(0, 10);
      const feed = { posts, syncedAt: new Date().toISOString() };
      await db.doc(FACEBOOK_FEED_CACHE_PATH.join('/')).set(feed);
      return feed;
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('Facebook feed sync failed.', error);
      throw new HttpsError(
        'unavailable',
        'Facebook feed sync failed. Check the Page ID, access token, and network connection. The last cached feed is still available.'
      );
    }
  }
);

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
  const data = profile.data();
  if (data?.role !== 'owner' || data?.mustChangePassword === true ||
      data?.status === 'pending' || data?.status === 'rejected') {
    throw new HttpsError('permission-denied', 'Only an Owner who has completed the required password change can manage admin accounts.');
  }
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
    status: 'approved',
    createdAt: new Date().toISOString(),
    createdBy: request.auth?.uid,
  });
  return { id: user.uid, email, role: 'manager' };
});

export const registerStoreManager = onCall(async (request) => {
  const uid = request.auth?.uid;
  const email = String(request.auth?.token.email || '').trim().toLowerCase();
  if (!uid || !email) throw new HttpsError('unauthenticated', 'Create a Firebase account before requesting Store Manager access.');
  const profileRef = db.collection('users').doc(uid);
  const existing = await profileRef.get();
  if (existing.exists) {
    if (existing.data()?.role === 'manager' && existing.data()?.status === 'pending' &&
        String(existing.data()?.email || '').toLowerCase() === email) {
      return { success: true };
    }
    throw new HttpsError('already-exists', 'This account already has an admin profile.');
  }
  const user = await auth.getUser(uid);
  if (!user.email || user.email.toLowerCase() !== email) {
    throw new HttpsError('failed-precondition', 'The Firebase account email could not be verified.');
  }
  await profileRef.create({
    email,
    role: 'manager',
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  return { success: true };
});

export const approveStoreManager = onCall(async (request) => {
  await requireOwner(request.auth?.uid);
  const uid = String(request.data?.uid || '');
  if (!uid) throw new HttpsError('invalid-argument', 'A manager user ID is required.');
  const profileRef = db.collection('users').doc(uid);
  const profile = await profileRef.get();
  if (!profile.exists || profile.data()?.role !== 'manager' || profile.data()?.status !== 'pending') {
    throw new HttpsError('not-found', 'Pending Store Manager request not found.');
  }
  const authUser = await auth.getUser(uid);
  if (!authUser.emailVerified) {
    throw new HttpsError('failed-precondition', 'The Store Manager must verify their email before approval.');
  }
  await profileRef.update({ status: 'approved', approvedAt: new Date().toISOString(), approvedBy: request.auth?.uid });
  await auth.updateUser(uid, { disabled: false });
  return { success: true };
});

export const rejectStoreManager = onCall(async (request) => {
  await requireOwner(request.auth?.uid);
  const uid = String(request.data?.uid || '');
  if (!uid) throw new HttpsError('invalid-argument', 'A manager user ID is required.');
  const profileRef = db.collection('users').doc(uid);
  const profile = await profileRef.get();
  if (!profile.exists || profile.data()?.role !== 'manager' || profile.data()?.status !== 'pending') {
    throw new HttpsError('not-found', 'Pending Store Manager request not found.');
  }
  await profileRef.update({ status: 'rejected', rejectedAt: new Date().toISOString(), rejectedBy: request.auth?.uid });
  await auth.updateUser(uid, { disabled: true });
  return { success: true };
});

export const completeAdminPasswordChange = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to complete the password change.');
  const newPassword = String(request.data?.newPassword || '');
  if (newPassword.length < 12) throw new HttpsError('invalid-argument', 'Use a password with at least 12 characters.');
  const profileRef = db.collection('users').doc(uid);
  const profile = await profileRef.get();
  const data = profile.data();
  if (!profile.exists || !['owner', 'manager'].includes(String(data?.role || '')) ||
      data?.status === 'pending' || data?.status === 'rejected') {
    throw new HttpsError('permission-denied', 'Only an active admin can change this password.');
  }
  if (data?.mustChangePassword === true && newPassword === 'Owner@010101') {
    throw new HttpsError('failed-precondition', 'Choose a password other than the shared bootstrap password.');
  }
  await auth.updateUser(uid, { password: newPassword });
  if (data?.mustChangePassword === true) {
    await profileRef.update({ mustChangePassword: false, passwordChangedAt: new Date().toISOString() });
  }
  return { success: true };
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
