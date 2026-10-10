import { getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  EmailAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { FirebaseStorage, getBlob, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { Functions, getFunctions, httpsCallable } from 'firebase/functions';
import { AdminRole, AdminUser, FacebookFeed, HappyCustomer, Product, SiteSettings } from './types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const primaryApp = isFirebaseConfigured
  ? getApps().find((app) => app.name === '[DEFAULT]') || initializeApp(firebaseConfig)
  : null;

export const firebaseAuth: Auth | null = primaryApp ? getAuth(primaryApp) : null;
export const firebaseDb: Firestore | null = primaryApp ? getFirestore(primaryApp) : null;
export const firebaseStorage: FirebaseStorage | null = primaryApp ? getStorage(primaryApp) : null;
export const firebaseFunctions: Functions | null = primaryApp ? getFunctions(primaryApp) : null;

export const configureFirebaseAuth = async () => {
  if (firebaseAuth) await setPersistence(firebaseAuth, browserLocalPersistence);
};

const bytesFromDataUrl = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

export const uploadDataUrl = async (dataUrl: string, storagePath: string): Promise<string> => {
  if (!firebaseStorage || !dataUrl.startsWith('data:')) return dataUrl;
  const blob = await bytesFromDataUrl(dataUrl);
  const imageRef = ref(firebaseStorage, storagePath);
  await uploadBytes(imageRef, blob, { contentType: blob.type || 'application/octet-stream' });
  return getDownloadURL(imageRef);
};

export const uploadProductImages = async (product: Product): Promise<Product> => {
  if (!firebaseStorage) return product;
  const gallery = await Promise.all(product.gallery.map(async (image, index) => ({
    ...image,
    src: await uploadDataUrl(image.src, `products/${product.id}/gallery/${index}-${Date.now()}`),
  })));
  const variants = product.variants
    ? await Promise.all(product.variants.map(async (variant, index) => ({
        ...variant,
        imageUrl: variant.imageUrl
          ? await uploadDataUrl(variant.imageUrl, `products/${product.id}/variants/${variant.id || index}-${Date.now()}`)
          : undefined,
      })))
    : undefined;
  const primaryImage = gallery.find((image) => image.isPrimary) || gallery[0];
  return { ...product, gallery, variants, imageUrl: product.imageUrl ? await uploadDataUrl(product.imageUrl, `products/${product.id}/cover-${Date.now()}`) : primaryImage?.src };
};

export const uploadSiteSettingsImages = async (settings: SiteSettings): Promise<SiteSettings> => {
  if (!firebaseStorage) return settings;
  const logoUrl = await uploadDataUrl(settings.logoUrl, `site/branding/logo-${Date.now()}`);
  const heroBanners = await Promise.all(settings.heroBanners.map((banner, index) => uploadDataUrl(banner, `site/banners/banner-${index}-${Date.now()}`)));
  const liveContent = settings.liveContent
    ? Object.fromEntries(await Promise.all(Object.entries(settings.liveContent).map(async ([key, edit], index) => [
        key,
        edit.kind === 'image'
          ? { ...edit, value: await uploadDataUrl(edit.value, `site/live-content/image-${index}-${Date.now()}`) }
          : edit,
      ])))
    : undefined;
  return { ...settings, logoUrl, heroBanners, liveContent };
};

export const uploadHappyCustomerImage = async (customer: HappyCustomer): Promise<HappyCustomer> => ({
  ...customer,
  image: await uploadDataUrl(customer.image, `happy-customers/${customer.id}/photo-${Date.now()}`),
});

export const downloadImageAsDataUrl = async (src: string) => {
  const blob = firebaseStorage && src.startsWith('https://firebasestorage.googleapis.com/')
    ? await getBlob(ref(firebaseStorage, src))
    : await (async () => {
        const response = await fetch(src);
        if (!response.ok) throw new Error(`Could not download image for backup: ${response.status}`);
        return response.blob();
      })();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not convert an image for the offline backup.'));
    reader.readAsDataURL(blob);
  });
};

const removeUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(removeUndefined);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, removeUndefined(item)]));
  }
  return value;
};

export const persistProducts = async (products: Product[]) => {
  if (!firebaseDb) return;
  const cloudProducts = await Promise.all(products.map(uploadProductImages));
  await Promise.all(cloudProducts.map((product) => setDoc(doc(firebaseDb, 'products', product.id), removeUndefined(product))));
  const cloudIds = new Set(cloudProducts.map((product) => product.id));
  const existing = await getDocs(collection(firebaseDb, 'products'));
  await Promise.all(existing.docs.filter((snapshot) => !cloudIds.has(snapshot.id)).map((snapshot) => deleteDoc(snapshot.ref)));
  return cloudProducts;
};

export const readProducts = async () => {
  if (!firebaseDb) return null;
  const snapshot = await getDocs(collection(firebaseDb, 'products'));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as Product));
};

export const persistSiteSettings = async (settings: SiteSettings) => {
  if (!firebaseDb) return;
  const cloudSettings = await uploadSiteSettingsImages(settings);
  await setDoc(doc(firebaseDb, 'siteSettings', 'public'), removeUndefined(cloudSettings));
  return cloudSettings;
};

export const readSiteSettings = async () => {
  if (!firebaseDb) return null;
  const snapshot = await getDocFromServer(doc(firebaseDb, 'siteSettings', 'public'));
  return snapshot.exists() ? snapshot.data() as SiteSettings : null;
};

export const readFacebookFeed = async (): Promise<FacebookFeed> => {
  if (!firebaseFunctions) throw new Error('Firebase Functions are not configured.');
  const getFeed = httpsCallable<void, FacebookFeed>(firebaseFunctions, 'getFacebookFeed');
  return (await getFeed()).data;
};

export const syncFacebookFeed = async (): Promise<FacebookFeed> => {
  if (!firebaseFunctions) throw new Error('Firebase Functions are not configured.');
  const syncFeed = httpsCallable<void, FacebookFeed>(firebaseFunctions, 'syncFacebookFeed');
  return (await syncFeed()).data;
};

export const persistHappyCustomers = async (customers: HappyCustomer[]) => {
  if (!firebaseDb) return;
  const db = firebaseDb;
  const uploaded = await Promise.all(customers.map(uploadHappyCustomerImage));
  await Promise.all(uploaded.flatMap((customer) => [
    setDoc(doc(db, 'happyCustomers', customer.id), removeUndefined(customer)),
    deleteDoc(doc(db, 'happyCustomers', `__deleted_customer__${customer.id}`)),
  ]));
  return uploaded;
};

export const deleteHappyCustomer = async (customerId: string) => {
  if (!firebaseDb) return;
  await setDoc(doc(firebaseDb, 'happyCustomers', `__deleted_customer__${customerId}`), {
    isDeletionTombstone: true,
    deletedCustomerId: customerId,
    deletedAt: Date.now(),
  });
};

export const readHappyCustomers = async () => {
  if (!firebaseDb) return null;
  const snapshot = await getDocsFromServer(collection(firebaseDb, 'happyCustomers'));
  const deletedCustomerIds = snapshot.docs
    .flatMap((item) => {
      const data = item.data();
      return data.isDeletionTombstone === true && typeof data.deletedCustomerId === 'string' ? [data.deletedCustomerId] : [];
    });
  const deletedIds = new Set(deletedCustomerIds);
  const customers = snapshot.docs
    .filter((item) => item.data().isDeletionTombstone !== true && !deletedIds.has(item.id))
    .map((item) => ({ ...item.data(), id: item.id } as HappyCustomer));
  return { customers, deletedCustomerIds };
};

export const subscribeToPublicStoreData = (handlers: {
  onProducts: (products: Product[], fromCache: boolean) => void;
  onSettings: (settings: SiteSettings | null, fromCache: boolean) => void;
  onHappyCustomers: (customers: HappyCustomer[], deletedCustomerIds: string[], fromCache: boolean) => void;
  onError: (error: Error) => void;
}) => {
  if (!firebaseDb) return () => undefined;
  const reportError = (error: Error) => handlers.onError(error);
  const options = { includeMetadataChanges: true };
  const unsubscribeProducts = onSnapshot(collection(firebaseDb, 'products'), options, (snapshot) => {
    handlers.onProducts(snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as Product)), snapshot.metadata.fromCache);
  }, reportError);
  const unsubscribeSettings = onSnapshot(doc(firebaseDb, 'siteSettings', 'public'), options, (snapshot) => {
    handlers.onSettings(snapshot.exists() ? snapshot.data() as SiteSettings : null, snapshot.metadata.fromCache);
  }, reportError);
  const unsubscribeCustomers = onSnapshot(collection(firebaseDb, 'happyCustomers'), options, (snapshot) => {
    const deletedCustomerIds = snapshot.docs
      .flatMap((item) => {
        const data = item.data();
        return data.isDeletionTombstone === true && typeof data.deletedCustomerId === 'string' ? [data.deletedCustomerId] : [];
      });
    const deletedIds = new Set(deletedCustomerIds);
    const customers = snapshot.docs
      .filter((item) => item.data().isDeletionTombstone !== true && !deletedIds.has(item.id))
      .map((item) => ({ ...item.data(), id: item.id } as HappyCustomer));
    handlers.onHappyCustomers(customers, deletedCustomerIds, snapshot.metadata.fromCache);
  }, reportError);
  return () => {
    unsubscribeProducts();
    unsubscribeSettings();
    unsubscribeCustomers();
  };
};

export const signInAdmin = async (email: string, password: string) => {
  if (!firebaseAuth || !firebaseDb) return null;
  await configureFirebaseAuth();
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  const profile = await getDoc(doc(firebaseDb, 'users', credential.user.uid));
  if (!profile.exists()) {
    await signOut(firebaseAuth);
    throw new Error('This Firebase account has no admin role assigned. Ask the Main Owner to provision it.');
  }
  const data = profile.data();
  if (data.role !== 'owner' && data.role !== 'manager') {
    await signOut(firebaseAuth);
    throw new Error('This Firebase account does not have a valid admin role.');
  }
  return { id: credential.user.uid, email: credential.user.email || email, role: data.role as AdminRole, passwordSalt: '', passwordHash: '' } satisfies AdminUser;
};

export const readOwnerSetupStatus = async () => {
  if (!firebaseFunctions) throw new Error('Firebase Functions are unavailable.');
  const getSetupStatus = httpsCallable<undefined, { needsOwnerSetup: boolean }>(firebaseFunctions, 'getOwnerSetupStatus');
  return (await getSetupStatus()).data.needsOwnerSetup;
};

export const createFirebaseOwner = async (email: string, password: string) => {
  if (!firebaseAuth || !firebaseFunctions) throw new Error('Firebase Authentication or Functions are unavailable.');
  await configureFirebaseAuth();
  let user;
  try {
    ({ user } = await createUserWithEmailAndPassword(firebaseAuth, email, password));
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'auth/email-already-in-use')) throw error;
    ({ user } = await signInWithEmailAndPassword(firebaseAuth, email, password));
  }

  try {
    const initializeOwner = httpsCallable<undefined, { id: string; email: string; role: AdminRole }>(firebaseFunctions, 'initializeOwnerAccount');
    const profile = (await initializeOwner()).data;
    if (profile.id !== user.uid || profile.role !== 'owner') {
      throw new Error('Firebase did not confirm the initial Owner profile.');
    }
    return { ...profile, passwordSalt: '', passwordHash: '' } satisfies AdminUser;
  } catch (error) {
    await signOut(firebaseAuth);
    throw error;
  }
};

export const signOutAdmin = async () => {
  if (firebaseAuth) await signOut(firebaseAuth);
};

export const createFirebaseManager = async (email: string, password: string) => {
  if (!firebaseFunctions) return null;
  const createManager = httpsCallable<{ email: string; password: string }, { id: string; email: string; role: AdminRole }>(firebaseFunctions, 'createStoreManager');
  return (await createManager({ email, password })).data;
};

export const removeFirebaseManager = async (uid: string) => {
  if (!firebaseFunctions) return;
  const removeManager = httpsCallable<{ uid: string }, { success: boolean }>(firebaseFunctions, 'removeStoreManager');
  await removeManager({ uid });
};

export const resetFirebaseManagerPassword = async (uid: string, password: string) => {
  if (!firebaseFunctions) return;
  const resetPassword = httpsCallable<{ uid: string; password: string }, { success: boolean }>(firebaseFunctions, 'resetStoreManagerPassword');
  await resetPassword({ uid, password });
};

export const changeFirebasePassword = async (currentPassword: string, newPassword: string) => {
  if (!firebaseAuth?.currentUser?.email) throw new Error('No Firebase user is signed in.');
  const credential = EmailAuthProvider.credential(firebaseAuth.currentUser.email, currentPassword);
  await reauthenticateWithCredential(firebaseAuth.currentUser, credential);
  await updatePassword(firebaseAuth.currentUser, newPassword);
};

export const readAdminProfiles = async () => {
  if (!firebaseDb) return null;
  const snapshot = await getDocs(collection(firebaseDb, 'users'));
  return snapshot.docs.map((item) => ({ id: item.id, email: String(item.data().email || ''), role: item.data().role as AdminRole, passwordSalt: '', passwordHash: '' } satisfies AdminUser));
};

export const readAdminProfile = async (uid: string) => {
  if (!firebaseDb) return null;
  const snapshot = await getDoc(doc(firebaseDb, 'users', uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.role !== 'owner' && data.role !== 'manager') return null;
  return { id: snapshot.id, email: String(data.email || ''), role: data.role, passwordSalt: '', passwordHash: '' } as AdminUser;
};

export const subscribeToFirebaseAuth = (callback: (userId: string | null) => void) =>
  firebaseAuth ? onAuthStateChanged(firebaseAuth, (user) => callback(user?.uid || null)) : () => undefined;
