import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { DEFAULT_SITE_SETTINGS, INITIAL_PRODUCTS, INITIAL_LEADS, REVIEWS } from './data/mockData';
import { Product, AdminUser, CartItem, FacebookFeed, HappyCustomer, ProductVariant, WhatsAppLead, SiteSettings, LiveEditMap } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { CompareModal } from './components/CompareModal';
import {
  normalizeSiteSettings,
  isLocalDevelopment,
  readSiteSettingsStorage,
  SiteSettingsContext,
  writeSiteSettingsStorage,
} from './components/SiteSettingsContext';
import { createAdminUser, verifyAdminPassword } from './auth/adminAuth';
import { LiveEditorOverlay } from './components/LiveEditorOverlay';
import {
  changeFirebasePassword,
  approveFirebaseManager,
  configureFirebaseAuth,
  createFirebaseManager,
  deleteHappyCustomer,
  isFirebaseConfigured,
  registerFirebaseManager,
  rejectFirebaseManager,
  persistHappyCustomers,
  persistProducts,
  persistSiteSettings,
  subscribeToPublicStoreData,
  readAdminProfile,
  readAdminProfiles,
  readOwnerSetupStatus,
  readHappyCustomers,
  readProducts,
  readSiteSettings,
  subscribeToAdminProfiles,
  removeFirebaseManager,
  resetFirebaseManagerPassword,
  readFacebookFeed,
  signInAdmin,
  signOutAdmin,
  syncFacebookFeed,
  subscribeToFirebaseAuth,
} from './firebaseClient';

const HomePage = lazy(() => import('./pages/HomePage').then(({ HomePage: Page }) => ({ default: Page })));
const CatalogPage = lazy(() => import('./pages/CatalogPage').then(({ CatalogPage: Page }) => ({ default: Page })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then(({ ProductDetailPage: Page }) => ({ default: Page })));
const AdminPortalPage = lazy(() => import('./pages/AdminPortalPage').then(({ AdminPortalPage: Page }) => ({ default: Page })));
const StoreLocationPage = lazy(() => import('./pages/StoreLocationPage').then(({ StoreLocationPage: Page }) => ({ default: Page })));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage').then(({ AdminLoginPage: Page }) => ({ default: Page })));
const HappyCustomersPage = lazy(() => import('./pages/HappyCustomersPage').then(({ HappyCustomersPage: Page }) => ({ default: Page })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(({ AboutPage: Page }) => ({ default: Page })));

interface NavigationRequest {
  tab: string;
  path: string;
  productId?: string;
}

const tabForPath = (path: string) => {
  if (path.startsWith('/admin')) return 'portal';
  if (path === '/happy-customers') return 'happy-customers';
  if (path === '/catalog') return 'iphones';
  if (path === '/android') return 'android';
  if (path.startsWith('/product/')) return 'pdp';
  if (path === '/about') return 'about';
  if (path === '/contact' || path === '/store-location') return 'store-location';
  if (path === '/compare') return 'compare';
  return 'home';
};

const pathForTab = (tab: string, productId?: string) => {
  if (tab === 'portal') return '/admin/login';
  if (tab === 'happy-customers') return '/happy-customers';
  if (tab === 'iphones') return '/catalog';
  if (tab === 'android') return '/android';
  if (tab === 'pdp') return `/product/${productId || 'iphone-16-pro-max'}`;
  if (tab === 'about') return '/about';
  if (tab === 'store-location') return '/contact';
  if (tab === 'compare') return '/compare';
  return '/';
};

const loadLiveEdits = (): LiveEditMap => {
  return readSiteSettingsStorage().liveContent || {};
};

const loadAdminUsers = (): AdminUser[] => {
  try {
    const savedUsers = window.localStorage.getItem('sosta-admin-users-v1');
    const parsedUsers: unknown = savedUsers ? JSON.parse(savedUsers) : [];
    return Array.isArray(parsedUsers)
      ? parsedUsers.filter((user): user is AdminUser =>
          Boolean(user && typeof user.id === 'string' && typeof user.email === 'string' &&
            (user.role === 'owner' || user.role === 'manager') &&
            typeof user.passwordSalt === 'string' && typeof user.passwordHash === 'string')
        )
      : [];
  } catch {
    return [];
  }
};

const sortHappyCustomers = (customers: HappyCustomer[]) =>
  [...customers].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

const writeHappyCustomersStorage = (customers: HappyCustomer[]) => {
  window.localStorage.setItem('sosta-happy-customers-v1', JSON.stringify(sortHappyCustomers(customers)));
};

interface PendingCloudSync {
  siteSettings: boolean;
  happyCustomers: boolean;
  deletedHappyCustomerIds: string[];
}

const PENDING_CLOUD_SYNC_KEY = 'sosta-pending-cloud-sync-v1';

const readPendingCloudSync = (): PendingCloudSync => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(PENDING_CLOUD_SYNC_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { siteSettings: false, happyCustomers: false, deletedHappyCustomerIds: [] };
    }
    const value = parsed as Partial<PendingCloudSync>;
    return {
      siteSettings: value.siteSettings === true,
      happyCustomers: value.happyCustomers === true,
      deletedHappyCustomerIds: Array.isArray(value.deletedHappyCustomerIds)
        ? value.deletedHappyCustomerIds.filter((id): id is string => typeof id === 'string')
        : [],
    };
  } catch {
    return { siteSettings: false, happyCustomers: false, deletedHappyCustomerIds: [] };
  }
};

const writePendingCloudSync = (pending: PendingCloudSync) => {
  window.localStorage.setItem(PENDING_CLOUD_SYNC_KEY, JSON.stringify(pending));
};

const mergePendingCustomers = (
  cloudCustomers: HappyCustomer[],
  localCustomers: HappyCustomer[],
  pending: PendingCloudSync,
  remoteDeletedIds: string[] = [],
) => {
  const deletedIds = new Set([...pending.deletedHappyCustomerIds, ...remoteDeletedIds]);
  const merged = new Map(localCustomers.filter((customer) => !deletedIds.has(customer.id)).map((customer) => [customer.id, customer]));
  for (const customer of cloudCustomers) {
    if (!deletedIds.has(customer.id)) merged.set(customer.id, customer);
  }
  return sortHappyCustomers([...merged.values()]);
};

const loadHappyCustomers = (): HappyCustomer[] => {
  try {
    const saved = window.localStorage.getItem('sosta-happy-customers-v1');
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? sortHappyCustomers(parsed as HappyCustomer[]) : [];
  } catch {
    return [];
  }
};

const FACEBOOK_FEED_STORAGE_KEY = 'sosta-facebook-feed-v1';

const loadCachedFacebookFeed = (): FacebookFeed => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(FACEBOOK_FEED_STORAGE_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { posts: [], syncedAt: null };
    const value = parsed as Partial<FacebookFeed>;
    return {
      posts: Array.isArray(value.posts)
        ? value.posts.filter((post) => Boolean(post && typeof post.id === 'string' &&
          typeof post.message === 'string' && typeof post.permalinkUrl === 'string' &&
          typeof post.createdAt === 'string')).slice(0, 10)
        : [],
      syncedAt: typeof value.syncedAt === 'string' ? value.syncedAt : null,
    };
  } catch {
    return { posts: [], syncedAt: null };
  }
};

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const savedProducts = window.localStorage.getItem('sosta-products-v1');
      return savedProducts ? (JSON.parse(savedProducts) as Product[]) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });
  const [savedProducts, setSavedProducts] = useState<Product[]>(() => {
    try {
      const savedProducts = window.localStorage.getItem('sosta-products-v1');
      return savedProducts ? (JSON.parse(savedProducts) as Product[]) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    return readSiteSettingsStorage();
  });
  const [savedSiteSettings, setSavedSiteSettings] = useState<SiteSettings>(() => readSiteSettingsStorage());
  const [leads, setLeads] = useState<WhatsAppLead[]>(INITIAL_LEADS);
  const [happyCustomers, setHappyCustomers] = useState<HappyCustomer[]>(loadHappyCustomers);
  const [savedHappyCustomers, setSavedHappyCustomers] = useState<HappyCustomer[]>(loadHappyCustomers);
  const [facebookFeed, setFacebookFeed] = useState<FacebookFeed>(loadCachedFacebookFeed);
  const [localFallbackUsers, setLocalFallbackUsers] = useState<AdminUser[]>(loadAdminUsers);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => isFirebaseConfigured ? [] : loadAdminUsers());
  const [authBackend, setAuthBackend] = useState<'firebase' | 'local'>(() =>
    isFirebaseConfigured ? 'firebase' : 'local'
  );
  const [needsOwnerSetup, setNeedsOwnerSetup] = useState(false);
  const [ownerSetupLoading, setOwnerSetupLoading] = useState(isFirebaseConfigured);
  const [ownerSetupError, setOwnerSetupError] = useState('');
  const [cloudDataReady, setCloudDataReady] = useState(!isFirebaseConfigured);
  const [networkEpoch, setNetworkEpoch] = useState(0);
  const [activeAdminId, setActiveAdminId] = useState<string | null>(() =>
    isFirebaseConfigured ? null : window.sessionStorage.getItem('sosta-admin-session-v1')
  );
  const isManagerRegistrationRef = useRef(false);
  const currentAdmin = adminUsers.find((user) => user.id === activeAdminId) || null;
  const [activeTab, setActiveTab] = useState<string>(
    () => tabForPath(window.location.pathname)
  ); // 'home' | 'iphones' | 'android' | 'pdp' | 'compare' | 'store-location' | 'portal'
  const [activeAdminSection, setActiveAdminSection] = useState('inventory');
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [selectedProductId, setSelectedProductId] = useState<string>(() => window.location.pathname.split('/')[2] || 'iphone-16-pro-max');
  const [liveEditorEnabled, setLiveEditorEnabled] = useState(false);
  const [savedLiveEdits, setSavedLiveEdits] = useState<LiveEditMap>(loadLiveEdits);
  const [draftLiveEdits, setDraftLiveEdits] = useState<LiveEditMap>(loadLiveEdits);
  const [isSavingLiveEdits, setIsSavingLiveEdits] = useState(false);
  const [unsavedGuardOpen, setUnsavedGuardOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<NavigationRequest | null>(null);
  const [pendingEditorExit, setPendingEditorExit] = useState(false);
  const [pendingAdminSection, setPendingAdminSection] = useState<string | null>(null);
  const [pendingLogout, setPendingLogout] = useState(false);
  const isLiveEditDirty = JSON.stringify(savedLiveEdits) !== JSON.stringify(draftLiveEdits);
  const isDirty = isLiveEditDirty ||
    JSON.stringify(products) !== JSON.stringify(savedProducts) ||
    JSON.stringify(siteSettings) !== JSON.stringify(savedSiteSettings) ||
    JSON.stringify(happyCustomers) !== JSON.stringify(savedHappyCustomers);
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const isSavingRef = useRef(false);
  const isPendingSyncRunningRef = useRef(false);
  const routePathRef = useRef(window.location.pathname);

  useEffect(() => {
    window.history.scrollRestoration = 'manual';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeAdminSection, activeTab, currentPath]);
  
  // Shopping Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 'cart-1',
      productId: 'iphone-16-pro-max',
      title: 'Apple iPhone 16 Pro Max',
      color: 'Desert Titanium',
      storage: '256GB',
      simVariant: 'USA LL/A (Dual eSIM)',
      price: 185000,
      quantity: 1,
      image: INITIAL_PRODUCTS[0]?.gallery.find((image) => image.isPrimary)?.src || INITIAL_PRODUCTS[0]?.gallery[0]?.src || '',
      condition: 'Brand New',
    },
  ]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Comparison state
  const [compareList, setCompareList] = useState<Product[]>([
    INITIAL_PRODUCTS[0],
    INITIAL_PRODUCTS[1],
  ]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const cacheFacebookFeed = (feed: FacebookFeed) => {
    setFacebookFeed(feed);
    try {
      window.localStorage.setItem(FACEBOOK_FEED_STORAGE_KEY, JSON.stringify(feed));
    } catch (error) {
      console.warn('Facebook feed is available for this session but could not be cached in this browser.', error);
    }
  };

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let cancelled = false;
    void readFacebookFeed().then((feed) => {
      if (!cancelled && feed.posts.length) cacheFacebookFeed(feed);
    }).catch((error) => {
      console.warn('Could not refresh the cached Facebook feed. Keeping the browser cache or embedded Facebook fallback.', error);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSyncFacebookFeed = async () => {
    const feed = await syncFacebookFeed();
    cacheFacebookFeed(feed);
    return feed;
  };

  const commitNavigation = (request: NavigationRequest) => {
    if (request.productId) setSelectedProductId(request.productId);
    if (request.tab !== 'iphones') setCatalogCategory('');
    if (window.location.pathname !== request.path) window.history.pushState({}, '', request.path);
    routePathRef.current = request.path;
    setCurrentPath(request.path);
    setActiveTab(request.tab);
  };

  const requestNavigation = (request: NavigationRequest) => {
    if (isDirty) {
      setPendingNavigation(request);
      setPendingEditorExit(false);
      setPendingLogout(false);
      setUnsavedGuardOpen(true);
      return;
    }
    commitNavigation(request);
  };

  const navigateToTab = (tab: string, productId?: string) => {
    requestNavigation({ tab, productId, path: pathForTab(tab, productId) });
  };

  const finishPendingNavigation = () => {
    if (pendingEditorExit) setLiveEditorEnabled(false);
    if (pendingNavigation) commitNavigation(pendingNavigation);
    if (pendingAdminSection) setActiveAdminSection(pendingAdminSection);
    if (pendingLogout) completeAdminLogout();
    setPendingNavigation(null);
    setPendingAdminSection(null);
    setPendingEditorExit(false);
    setPendingLogout(false);
    setUnsavedGuardOpen(false);
  };

  const saveChanges = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSavingLiveEdits(true);
    const logoEdit = Object.values(draftLiveEdits).filter((edit) => edit.settingKey === 'logoUrl').pop();
    const settingsToSave = normalizeSiteSettings({
      ...siteSettings,
      liveContent: draftLiveEdits,
      logoUrl: logoEdit?.value ?? siteSettings.logoUrl,
    });
    try {
      const settingsChanged = JSON.stringify(settingsToSave) !== JSON.stringify(savedSiteSettings);
      const customersChanged = JSON.stringify(happyCustomers) !== JSON.stringify(savedHappyCustomers);
      const pendingSync = readPendingCloudSync();
      const canPublishProducts = isFirebaseConfigured && cloudDataReady && Boolean(currentAdmin) && authBackend === 'firebase';
      const canPublishOwnerContent = canPublishProducts && currentAdmin?.role === 'owner';

      if (isLiveEditDirty && isFirebaseConfigured && !canPublishOwnerContent) {
        showToast('Live Editor changes require a verified Firebase Owner and an available Firestore connection. Changes were not saved.');
        return;
      }

      window.localStorage.setItem('sosta-products-v1', JSON.stringify(products));
      window.localStorage.setItem('sosta-happy-customers-v1', JSON.stringify(happyCustomers));
      writeSiteSettingsStorage(settingsToSave);
      setProducts(products);
      setSiteSettings(settingsToSave);
      setHappyCustomers(happyCustomers);

      let cloudSyncMessage = canPublishProducts ? ' Published to the shared Firebase store.' : '';
      let cloudSyncFailed = false;
      if (canPublishProducts) {
        try {
          const [cloudProducts, cloudSettings, cloudCustomers] = await Promise.all([
            JSON.stringify(products) !== JSON.stringify(savedProducts) ? persistProducts(products) : Promise.resolve(null),
            canPublishOwnerContent && (settingsChanged || pendingSync.siteSettings) ? persistSiteSettings(settingsToSave) : Promise.resolve(null),
            canPublishOwnerContent && (customersChanged || pendingSync.happyCustomers || pendingSync.deletedHappyCustomerIds.length > 0)
              ? Promise.all([
                  persistHappyCustomers(happyCustomers),
                  ...[...new Set([
                    ...pendingSync.deletedHappyCustomerIds,
                    ...savedHappyCustomers
                      .filter((savedCustomer) => !happyCustomers.some((customer) => customer.id === savedCustomer.id))
                      .map((customer) => customer.id),
                  ])].map((customerId) => deleteHappyCustomer(customerId)),
                ]).then(([uploadedCustomers]) => uploadedCustomers)
              : Promise.resolve(null),
          ]);
          if (JSON.stringify(products) !== JSON.stringify(savedProducts) && !cloudProducts) {
            throw new Error('The shared Firebase product store is unavailable.');
          }
          if (canPublishOwnerContent && settingsChanged && !cloudSettings) {
            throw new Error('The shared Firebase site configuration was not confirmed as saved.');
          }
          const persistedSettings = cloudSettings
            ? normalizeSiteSettings({ ...DEFAULT_SITE_SETTINGS, ...cloudSettings, liveContent: cloudSettings.liveContent ?? draftLiveEdits })
            : settingsToSave;
          const persistedCustomers = cloudCustomers ? sortHappyCustomers(cloudCustomers) : happyCustomers;
          const persistedProducts = cloudProducts || products;
          window.localStorage.setItem('sosta-products-v1', JSON.stringify(persistedProducts));
          window.localStorage.setItem('sosta-happy-customers-v1', JSON.stringify(persistedCustomers));
          writeSiteSettingsStorage(persistedSettings);
          setProducts(persistedProducts);
          setSavedProducts(persistedProducts);
          setSiteSettings(persistedSettings);
          setSavedSiteSettings(persistedSettings);
          setHappyCustomers(persistedCustomers);
          setSavedHappyCustomers(persistedCustomers);
          setSavedLiveEdits(persistedSettings.liveContent || draftLiveEdits);
          setDraftLiveEdits(persistedSettings.liveContent || draftLiveEdits);
          writePendingCloudSync({ siteSettings: false, happyCustomers: false, deletedHappyCustomerIds: [] });
        } catch (error) {
          cloudSyncFailed = true;
          if (settingsChanged || pendingSync.siteSettings || customersChanged || pendingSync.happyCustomers) {
            writePendingCloudSync({
              siteSettings: pendingSync.siteSettings || settingsChanged,
              happyCustomers: pendingSync.happyCustomers || customersChanged,
              deletedHappyCustomerIds: [
                ...new Set([
                  ...pendingSync.deletedHappyCustomerIds,
                  ...savedHappyCustomers
                    .filter((savedCustomer) => !happyCustomers.some((customer) => customer.id === savedCustomer.id))
                    .map((customer) => customer.id),
                ]),
              ],
            });
          }
          cloudSyncMessage = ` Saved in this browser, but Firebase sync failed: ${error instanceof Error ? error.message : 'unknown error'}.`;
        }
      } else if (isFirebaseConfigured && !isLocalDevelopment()) {
        if (settingsChanged || customersChanged) {
          writePendingCloudSync({
            siteSettings: pendingSync.siteSettings || settingsChanged,
            happyCustomers: pendingSync.happyCustomers || customersChanged,
            deletedHappyCustomerIds: [
              ...new Set([
                ...pendingSync.deletedHappyCustomerIds,
                ...savedHappyCustomers
                  .filter((savedCustomer) => !happyCustomers.some((customer) => customer.id === savedCustomer.id))
                  .map((customer) => customer.id),
              ]),
            ],
          });
        }
        cloudSyncMessage = !cloudDataReady
          ? ' Saved in this browser; Firebase is still loading, so sign in and save again to publish.'
          : settingsChanged && currentAdmin?.role !== 'owner'
            ? ' Outlet settings and customer stories require an authenticated Firebase Owner to publish for other visitors.'
            : ' Saved in this browser only; sign in with the required Firebase admin account to publish for other visitors.';
      }

      if (!canPublishProducts) {
        setSavedProducts(products);
        setSavedSiteSettings(settingsToSave);
        setSavedHappyCustomers(happyCustomers);
        setSavedLiveEdits(draftLiveEdits);
      }
      if (cloudSyncFailed) {
        showToast(`Changes are cached locally but still need Firebase sync.${cloudSyncMessage}`);
        return;
      }

      finishPendingNavigation();
      showToast(`All changes saved locally.${cloudSyncMessage}`);
    } catch (error) {
      showToast(`Changes could not be saved to this browser: ${error instanceof Error ? error.message : 'storage error'}`);
    } finally {
      isSavingRef.current = false;
      setIsSavingLiveEdits(false);
    }
  };

  const discardChanges = () => {
    setProducts(savedProducts);
    setSiteSettings(savedSiteSettings);
    setHappyCustomers(savedHappyCustomers);
    setDraftLiveEdits(savedLiveEdits);
    try {
      window.localStorage.setItem('sosta-products-v1', JSON.stringify(savedProducts));
      window.localStorage.setItem('sosta-happy-customers-v1', JSON.stringify(savedHappyCustomers));
      writeSiteSettingsStorage(savedSiteSettings);
    } catch {
      showToast('Drafts were discarded in memory, but the saved browser cache could not be restored.');
    }
    finishPendingNavigation();
  };

  const toggleLiveEditor = () => {
    if (liveEditorEnabled && isDirty) {
      setPendingNavigation(null);
      setPendingAdminSection(null);
      setPendingLogout(false);
      setPendingEditorExit(true);
      setUnsavedGuardOpen(true);
      return;
    }
    setLiveEditorEnabled((enabled) => !enabled);
  };

  const requestAdminSection = (section: string) => {
    if (isDirty) {
      setPendingAdminSection(section);
      setPendingNavigation(null);
      setPendingEditorExit(false);
      setPendingLogout(false);
      setUnsavedGuardOpen(true);
      return;
    }
    setActiveAdminSection(section);
  };

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let cancelled = false;
    const loadCloudData = async () => {
      const [productsResult, settingsResult, customersResult] = await Promise.allSettled([
        readProducts(),
        isLocalDevelopment() ? Promise.resolve(null) : readSiteSettings(),
        readHappyCustomers(),
      ]);
      if (cancelled) return;
      const cloudProducts = productsResult.status === 'fulfilled' ? productsResult.value : null;
      const cloudSettings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
      const cloudCustomerData = customersResult.status === 'fulfilled' ? customersResult.value : null;
      if (productsResult.status === 'rejected' || settingsResult.status === 'rejected' || customersResult.status === 'rejected') {
        showToast('Some Firebase content could not be loaded. Using the saved browser cache for unavailable data.');
      }
      try {
        if (cloudProducts) {
          const cachedProducts = window.localStorage.getItem('sosta-products-v1');
          const loadedProducts = cloudProducts.length
            ? cloudProducts
            : cachedProducts
              ? JSON.parse(cachedProducts) as Product[]
              : INITIAL_PRODUCTS;
          setProducts(loadedProducts);
          setSavedProducts(loadedProducts);
        }
        if (settingsResult.status === 'fulfilled' && !isLocalDevelopment()) {
          const pendingSync = readPendingCloudSync();
          const cachedSettings = readSiteSettingsStorage();
          const loadedSettings = pendingSync.siteSettings || !cloudSettings
            ? cachedSettings
            : {
                ...normalizeSiteSettings(cloudSettings),
                liveContent: cloudSettings.liveContent ?? savedLiveEdits,
              };
          if (!cloudSettings && JSON.stringify(cachedSettings) !== JSON.stringify(normalizeSiteSettings(DEFAULT_SITE_SETTINGS))) {
            writePendingCloudSync({ ...pendingSync, siteSettings: true });
          }
          setSiteSettings(loadedSettings);
          setSavedSiteSettings(loadedSettings);
          setSavedLiveEdits(loadedSettings.liveContent || {});
          setDraftLiveEdits(loadedSettings.liveContent || {});
        }
        if (cloudCustomerData) {
          const pendingSync = readPendingCloudSync();
          const cachedCustomers = loadHappyCustomers();
          const remoteIds = new Set(cloudCustomerData.customers.map((customer) => customer.id));
          const uncoveredLocalStories = cachedCustomers.some((customer) =>
            !remoteIds.has(customer.id) && !cloudCustomerData.deletedCustomerIds.includes(customer.id)
          );
          const pendingCustomerSync = pendingSync.happyCustomers || uncoveredLocalStories;
          const effectivePending = {
            ...pendingSync,
            happyCustomers: pendingCustomerSync,
            deletedHappyCustomerIds: [...new Set([...pendingSync.deletedHappyCustomerIds, ...cloudCustomerData.deletedCustomerIds])],
          };
          if (pendingCustomerSync !== pendingSync.happyCustomers || effectivePending.deletedHappyCustomerIds.length !== pendingSync.deletedHappyCustomerIds.length) {
            writePendingCloudSync(effectivePending);
          }
          const loadedCustomers = pendingCustomerSync
            ? mergePendingCustomers(cloudCustomerData.customers, cachedCustomers, effectivePending, cloudCustomerData.deletedCustomerIds)
            : sortHappyCustomers(cloudCustomerData.customers);
          setHappyCustomers(loadedCustomers);
          setSavedHappyCustomers(loadedCustomers);
        }
      } catch (error) {
        showToast(`Firebase content could not be cached locally: ${error instanceof Error ? error.message : 'storage error'}`);
      } finally {
        if (!cancelled) setCloudDataReady(true);
      }
    };
    void loadCloudData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || currentAdmin?.role !== 'owner' || currentAdmin.mustChangePassword) return;
    return subscribeToAdminProfiles(setAdminUsers, (error) => {
      console.error('Could not subscribe to Store Manager approvals.', error);
      showToast('Live staff approvals could not be loaded. Refresh the page to retry.');
    });
  }, [currentAdmin?.id, currentAdmin?.role, currentAdmin?.mustChangePassword]);

  useEffect(() => {
    if (!isFirebaseConfigured || !cloudDataReady) return;
    return subscribeToPublicStoreData({
      onProducts: (cloudProducts, fromCache) => {
        if (isDirtyRef.current || fromCache) return;
        const cached = window.localStorage.getItem('sosta-products-v1');
        const nextProducts = cloudProducts.length
          ? cloudProducts
          : cached
            ? JSON.parse(cached) as Product[]
            : INITIAL_PRODUCTS;
        setProducts(nextProducts);
        setSavedProducts(nextProducts);
        try {
          window.localStorage.setItem('sosta-products-v1', JSON.stringify(nextProducts));
        } catch {
          showToast('Live product updates could not be cached in this browser.');
        }
      },
      onSettings: (cloudSettings, fromCache) => {
        if (isDirtyRef.current || fromCache) return;
        const pendingSync = readPendingCloudSync();
        if (pendingSync.siteSettings) return;
        const nextSettings = normalizeSiteSettings(cloudSettings || DEFAULT_SITE_SETTINGS);
        setSiteSettings(nextSettings);
        setSavedSiteSettings(nextSettings);
        const nextEdits = nextSettings.liveContent || {};
        setSavedLiveEdits(nextEdits);
        setDraftLiveEdits(nextEdits);
        try {
          writeSiteSettingsStorage(nextSettings);
        } catch {
          showToast('Live site settings could not be cached in this browser.');
        }
      },
      onHappyCustomers: (cloudCustomers, deletedCustomerIds, fromCache) => {
        if (isDirtyRef.current || fromCache) return;
        const pendingSync = readPendingCloudSync();
        const cachedCustomers = loadHappyCustomers();
        const remoteIds = new Set(cloudCustomers.map((customer) => customer.id));
        const uncoveredLocalStories = cachedCustomers.some((customer) =>
          !remoteIds.has(customer.id) && !deletedCustomerIds.includes(customer.id)
        );
        if (uncoveredLocalStories && !pendingSync.happyCustomers) {
          const nextPending = {
            ...pendingSync,
            happyCustomers: true,
            deletedHappyCustomerIds: [...new Set([...pendingSync.deletedHappyCustomerIds, ...deletedCustomerIds])],
          };
          writePendingCloudSync(nextPending);
          const recoveredCustomers = mergePendingCustomers(cloudCustomers, cachedCustomers, nextPending, deletedCustomerIds);
          setHappyCustomers(recoveredCustomers);
          setSavedHappyCustomers(recoveredCustomers);
          writeHappyCustomersStorage(recoveredCustomers);
          return;
        }
        const nextCustomers = pendingSync.happyCustomers
          ? mergePendingCustomers(cloudCustomers, cachedCustomers, pendingSync, deletedCustomerIds)
          : sortHappyCustomers(cloudCustomers);
        setHappyCustomers(nextCustomers);
        setSavedHappyCustomers(nextCustomers);
        try {
          window.localStorage.setItem('sosta-happy-customers-v1', JSON.stringify(nextCustomers));
        } catch {
          showToast('Live customer story updates could not be cached in this browser.');
        }
      },
      onError: () => showToast('Live Firebase synchronization failed. Showing the last saved browser cache.'),
    });
  }, [cloudDataReady]);

  useEffect(() => {
    const retryCloudSync = () => setNetworkEpoch((epoch) => epoch + 1);
    window.addEventListener('online', retryCloudSync);
    return () => window.removeEventListener('online', retryCloudSync);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !cloudDataReady || !currentAdmin || authBackend !== 'firebase' || isPendingSyncRunningRef.current) return;
    const pending = readPendingCloudSync();
    if (currentAdmin.role !== 'owner' || (!pending.siteSettings && !pending.happyCustomers && pending.deletedHappyCustomerIds.length === 0)) return;
    isPendingSyncRunningRef.current = true;
    const syncPendingChanges = async () => {
      try {
        let uploadedSettings: SiteSettings | null = null;
        let uploadedCustomers: HappyCustomer[] | null = null;
        if (pending.siteSettings) {
          const settings = await persistSiteSettings(siteSettings);
          if (!settings) throw new Error('The shared Firebase site settings store is unavailable.');
          uploadedSettings = settings;
        }
        if (pending.happyCustomers || pending.deletedHappyCustomerIds.length > 0) {
          const [customers] = await Promise.all([
            persistHappyCustomers(happyCustomers),
            ...pending.deletedHappyCustomerIds.map((id) => deleteHappyCustomer(id)),
          ]);
          uploadedCustomers = customers || [];
        }
        if (uploadedSettings) {
          const normalized = normalizeSiteSettings(uploadedSettings);
          writeSiteSettingsStorage(normalized);
          setSiteSettings(normalized);
          setSavedSiteSettings(normalized);
        }
        if (uploadedCustomers) {
          const normalized = sortHappyCustomers(uploadedCustomers);
          writeHappyCustomersStorage(normalized);
          setHappyCustomers(normalized);
          setSavedHappyCustomers(normalized);
        }
        writePendingCloudSync({
          siteSettings: uploadedSettings ? false : pending.siteSettings,
          happyCustomers: uploadedCustomers ? false : pending.happyCustomers,
          deletedHappyCustomerIds: uploadedCustomers ? [] : pending.deletedHappyCustomerIds,
        });
        showToast('Previously cached changes were published to the shared Firebase store.');
      } catch (error) {
        showToast(`Some cached changes still need Firebase sync: ${error instanceof Error ? error.message : 'unknown error'}.`);
      } finally {
        isPendingSyncRunningRef.current = false;
      }
    };
    void syncPendingChanges();
  }, [cloudDataReady, currentAdmin, authBackend, networkEpoch]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let isDisposed = false;
    let unsubscribe: () => void = () => undefined;
    const initializeAuth = async () => {
      try {
        await configureFirebaseAuth();
        const setupNeeded = await readOwnerSetupStatus();
        if (!isDisposed) {
          setNeedsOwnerSetup(setupNeeded);
          setOwnerSetupError('');
          setOwnerSetupLoading(false);
        }
      } catch (error) {
        if (!isDisposed) {
          setOwnerSetupError(error instanceof Error ? error.message : 'Could not check Firebase Owner setup.');
          setOwnerSetupLoading(false);
        }
      }
      if (isDisposed) return;
      unsubscribe = subscribeToFirebaseAuth((uid) => {
        if (isManagerRegistrationRef.current) return;
        if (!uid) {
          setActiveAdminId(null);
          return;
        }
        void readAdminProfile(uid).then(async (profile) => {
          if (isDisposed) return;
          if (!profile) {
            setActiveAdminId(null);
            void signOutAdmin();
            return;
          }
          setActiveAdminId(profile.id);
          setAuthBackend('firebase');
          setOwnerSetupError('');
          const profiles = profile.role === 'owner' && !profile.mustChangePassword
            ? await readAdminProfiles()
            : [profile];
          if (!isDisposed && profiles) setAdminUsers(profiles);
        }).catch((error: unknown) => {
          if (!isDisposed) {
            setActiveAdminId(null);
            setOwnerSetupError(error instanceof Error ? error.message : 'Could not verify the Firebase admin profile.');
          }
        });
      });
    };
    void initializeAuth();
    return () => {
      isDisposed = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('sosta-admin-users-v1', JSON.stringify(localFallbackUsers));
    } catch {
      showToast('Local fallback accounts could not be saved in this browser storage.');
    }
  }, [localFallbackUsers]);

  useEffect(() => {
    try {
      window.localStorage.setItem('sosta-products-v1', JSON.stringify(products));
      writeSiteSettingsStorage(normalizeSiteSettings({
        ...siteSettings,
        liveContent: draftLiveEdits,
      }));
      writeHappyCustomersStorage(happyCustomers);
    } catch {
      showToast('A content change could not be written to this browser cache.');
    }
  }, [products, siteSettings, happyCustomers, draftLiveEdits]);

  useEffect(() => {
    for (const edit of Object.values(draftLiveEdits)) {
      if (edit.route !== activeTab) continue;
      const element = document.querySelector(edit.selector);
      if (!element) continue;
      if (edit.kind === 'image' && element instanceof HTMLImageElement) element.src = edit.value;
      else if (edit.kind === 'text') element.textContent = edit.value;
    }
  }, [activeTab, draftLiveEdits]);

  useEffect(() => {
    const syncSavedCache = (event: StorageEvent) => {
      if (!event.key || isDirtyRef.current) return;
      if (event.key === 'sosta-products-v1' && event.newValue) {
        const nextProducts: Product[] = JSON.parse(event.newValue);
        setProducts(nextProducts);
        setSavedProducts(nextProducts);
      } else if ((event.key === 'site_settings' || event.key === 'sosta-site-settings-v1') && event.newValue) {
        const nextSettings = readSiteSettingsStorage();
        setSiteSettings(nextSettings);
        setSavedSiteSettings(nextSettings);
        const nextEdits = nextSettings.liveContent || {};
        setSavedLiveEdits(nextEdits);
        setDraftLiveEdits(nextEdits);
      } else if (event.key === 'sosta-happy-customers-v1' && event.newValue) {
        const nextCustomers: HappyCustomer[] = JSON.parse(event.newValue);
        setHappyCustomers(nextCustomers);
        setSavedHappyCustomers(nextCustomers);
      }
    };
    window.addEventListener('storage', syncSavedCache);
    return () => window.removeEventListener('storage', syncSavedCache);
  }, []);

  useEffect(() => {
    const syncRoute = () => {
      const path = window.location.pathname;
      const request = { tab: tabForPath(path), path, productId: path.startsWith('/product/') ? path.split('/')[2] : undefined };
      if (isDirtyRef.current) {
        window.history.pushState({}, '', routePathRef.current);
        setPendingNavigation(request);
        setPendingEditorExit(false);
        setUnsavedGuardOpen(true);
        return;
      }
      routePathRef.current = path;
      setCurrentPath(path);
      if (request.productId) setSelectedProductId(request.productId);
      if (request.tab !== 'iphones') setCatalogCategory('');
      setActiveTab(request.tab);
    };
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  const establishAdminSession = (user: AdminUser, backend: 'firebase' | 'local') => {
    if (backend === 'local') {
      window.sessionStorage.setItem('sosta-admin-session-v1', user.id);
      window.sessionStorage.setItem('sosta-admin-backend-v1', backend);
    } else {
      window.sessionStorage.removeItem('sosta-admin-session-v1');
      window.sessionStorage.removeItem('sosta-admin-backend-v1');
    }
    setAuthBackend(backend);
    setActiveAdminId(user.id);
    window.history.replaceState({}, '', '/admin');
    routePathRef.current = '/admin';
    setCurrentPath('/admin');
    setActiveTab('portal');
  };

  const handleAdminLogin = async (email: string, password: string) => {
    if (isFirebaseConfigured) {
      const user = await signInAdmin(email.trim().toLowerCase(), password);
      if (!user) throw new Error('Firebase Authentication is unavailable.');
      establishAdminSession(user, 'firebase');
      const profiles = user.role === 'owner' && !user.mustChangePassword
        ? await readAdminProfiles()
        : [user];
      if (profiles) setAdminUsers(profiles);
      return;
    }
    const user = adminUsers.find((candidate) => candidate.email === email.trim().toLowerCase());
    if (!user || !(await verifyAdminPassword(user, password))) {
      throw new Error('Email or password is incorrect.');
    }
    establishAdminSession(user, 'local');
  };

  const handleSetupOwner = async (email: string, password: string) => {
    if (isFirebaseConfigured) throw new Error('Firebase Owner accounts are initialized securely by the server bootstrap.');
    if (adminUsers.some((user) => user.role === 'owner')) throw new Error('An owner account is already set up.');
    if (password.length < 12) throw new Error('Use a password with at least 12 characters.');
    const owner = await createAdminUser(email, password, 'owner');
    setAdminUsers((users) => [...users, owner]);
    establishAdminSession(owner, 'local');
  };

  const handleAddManager = async (email: string, password: string) => {
    if (currentAdmin?.role !== 'owner') throw new Error('Only the Main Owner can add managers.');
    if (password.length < 12) throw new Error('Use a password with at least 12 characters.');
    const normalizedEmail = email.trim().toLowerCase();
    if (adminUsers.some((user) => user.email === normalizedEmail)) throw new Error('An account with this email already exists.');
    if (authBackend === 'firebase') {
      const created = await createFirebaseManager(normalizedEmail, password);
      if (!created) throw new Error('Firebase Functions are unavailable.');
      setAdminUsers((users) => [...users, { ...created, passwordSalt: '', passwordHash: '' }]);
      return;
    }
    const manager = await createAdminUser(normalizedEmail, password, 'manager');
    setAdminUsers((users) => [...users, manager]);
    setLocalFallbackUsers((users) => [...users, manager]);
  };

  const handleRegisterManager = async (email: string, password: string) => {
    if (!isFirebaseConfigured) throw new Error('Store Manager registration requires Firebase Authentication.');
    if (password.length < 12) throw new Error('Use a password with at least 12 characters.');
    isManagerRegistrationRef.current = true;
    try {
      await registerFirebaseManager(email, password);
    } finally {
      isManagerRegistrationRef.current = false;
    }
  };

  const handleApproveManager = async (userId: string) => {
    if (currentAdmin?.role !== 'owner') throw new Error('Only the Main Owner can approve managers.');
    if (authBackend === 'firebase') await approveFirebaseManager(userId);
    setAdminUsers((users) => users.map((user) => user.id === userId ? { ...user, status: 'approved' } : user));
  };

  const handleRejectManager = async (userId: string) => {
    if (currentAdmin?.role !== 'owner') throw new Error('Only the Main Owner can reject managers.');
    if (authBackend === 'firebase') await rejectFirebaseManager(userId);
    setAdminUsers((users) => users.map((user) => user.id === userId ? { ...user, status: 'rejected' } : user));
  };

  const handleRemoveManager = async (userId: string) => {
    if (currentAdmin?.role !== 'owner') throw new Error('Only the Main Owner can remove managers.');
    if (authBackend === 'firebase') await removeFirebaseManager(userId);
    setAdminUsers((users) => users.filter((user) => user.id !== userId || user.role !== 'manager'));
    setLocalFallbackUsers((users) => users.filter((user) => user.id !== userId || user.role !== 'manager'));
  };

  const handleResetManagerPassword = async (userId: string, password: string) => {
    if (currentAdmin?.role !== 'owner') throw new Error('Only the Main Owner can reset manager passwords.');
    if (password.length < 12) throw new Error('Use a password with at least 12 characters.');
    const target = adminUsers.find((user) => user.id === userId && user.role === 'manager');
    if (!target) throw new Error('Store Manager not found.');
    if (authBackend === 'firebase') {
      await resetFirebaseManagerPassword(userId, password);
      return;
    }
    const updated = await createAdminUser(target.email, password, 'manager');
    const updatedManager = { ...updated, id: userId };
    setAdminUsers((users) => users.map((user) => user.id === userId ? updatedManager : user));
    setLocalFallbackUsers((users) => users.map((user) => user.id === userId ? updatedManager : user));
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    if (authBackend === 'firebase') {
      await changeFirebasePassword(currentPassword, newPassword);
      if (currentAdmin) {
        setAdminUsers((users) => users.map((user) => user.id === currentAdmin.id
          ? { ...user, mustChangePassword: false }
          : user));
        if (currentAdmin.role === 'owner') {
          const profiles = await readAdminProfiles();
          if (profiles) setAdminUsers(profiles);
        }
      }
      return;
    }
    if (!currentAdmin || !(await verifyAdminPassword(currentAdmin, currentPassword))) {
      throw new Error('Current password is incorrect.');
    }
    if (newPassword.length < 12) throw new Error('Use a password with at least 12 characters.');
    const updated = { ...(await createAdminUser(currentAdmin.email, newPassword, currentAdmin.role)), id: currentAdmin.id, mustChangePassword: false };
    setAdminUsers((users) => users.map((user) => user.id === currentAdmin.id ? updated : user));
    setLocalFallbackUsers((users) => users.map((user) => user.id === currentAdmin.id ? updated : user));
  };

  const handleAdminLogout = () => {
    if (isDirty) {
      setPendingNavigation({ tab: 'portal', path: '/admin/login' });
      setPendingAdminSection(null);
      setPendingEditorExit(false);
      setPendingLogout(true);
      setUnsavedGuardOpen(true);
      return;
    }
    completeAdminLogout();
  };

  const completeAdminLogout = () => {
    if (authBackend === 'firebase') void signOutAdmin();
    window.sessionStorage.removeItem('sosta-admin-session-v1');
    window.sessionStorage.removeItem('sosta-admin-backend-v1');
    setActiveAdminId(null);
    window.history.replaceState({}, '', '/admin/login');
    routePathRef.current = '/admin/login';
    setCurrentPath('/admin/login');
    setActiveTab('portal');
  };

  const navigateToAdmin = () => {
    requestNavigation({ tab: 'portal', path: '/admin/login' });
  };

  const navigateToHappyCustomers = () => {
    requestNavigation({ tab: 'happy-customers', path: '/happy-customers' });
  };

  const navigateHome = () => {
    requestNavigation({ tab: 'home', path: '/' });
  };

  // Cart operations
  const handleAddToCart = (item: {
    productId: string;
    title: string;
    color: string;
    storage: string;
    simVariant: string;
    price: number;
    image: string;
    condition: string;
  }) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (it) =>
          it.productId === item.productId &&
          it.color === item.color &&
          it.storage === item.storage
      );
      if (existing) {
        return prev.map((it) =>
          it.id === existing.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [
        ...prev,
        {
          id: `cart-${Date.now()}`,
          ...item,
          quantity: 1,
        },
      ];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((it) => {
          if (it.id === id) {
            const newQty = it.quantity + delta;
            return newQty > 0 ? { ...it, quantity: newQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (id: string) => {
    setCartItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Compare operations
  const handleAddToCompare = (product: Product) => {
    setCompareList((prev) => {
      if (prev.some((p) => p.id === product.id)) {
        showToast(`${product.model} is already in the comparison matrix.`);
        return prev;
      }
      if (prev.length >= 3) {
        showToast('You can compare up to 3 flagships at once.');
        return prev;
      }
      showToast(`Added ${product.model} to comparison!`);
      return [...prev, product];
    });
    setIsCompareModalOpen(true);
  };

  const handleRemoveFromCompare = (productId: string) => {
    setCompareList((prev) => prev.filter((p) => p.id !== productId));
  };

  // Navigation handlers
  const handleSelectProduct = (productId: string) => {
    requestNavigation({ tab: 'pdp', path: pathForTab('pdp', productId), productId });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() && activeTab !== 'iphones' && activeTab !== 'android') {
      navigateToTab('iphones');
    }
  };

  // Admin inventory handlers
  const handleUpdateProductStock = (id: string, delta: number) => {
    setProducts((prev) =>
      prev.map((product) => {
        if (product.id !== id) return product;
        if (!product.variants?.length) return { ...product, stock: Math.max(0, product.stock + delta) };

        const variants = [...product.variants];
        const targetIndex = delta < 0 ? variants.findIndex((variant) => variant.stock > 0) : 0;
        if (targetIndex >= 0) variants[targetIndex] = { ...variants[targetIndex], stock: Math.max(0, variants[targetIndex].stock + delta) };
        const stock = variants.reduce((total, variant) => total + variant.stock, 0);
        return { ...product, variants, stock, inStock: stock > 0 };
      })
    );
  };

  const handleUpdateProductDetails = (updatedProduct: Product) => {
    setProducts((prev) =>
      prev.map((product) => product.id === updatedProduct.id ? updatedProduct : product)
    );
  };

  const handleAddProduct = (newProduct: Product) => {
    setProducts((prev) => [newProduct, ...prev]);
  };

  const handleImportBackup = (backupProducts: Product[], backupSettings: SiteSettings, backupCustomers: HappyCustomer[]) => {
    setProducts(backupProducts);
    setSiteSettings(normalizeSiteSettings({ ...DEFAULT_SITE_SETTINGS, ...backupSettings }));
    setHappyCustomers(sortHappyCustomers(backupCustomers));
  };

  const handleSaveSiteSettings = (settings: SiteSettings) => {
    setSiteSettings(normalizeSiteSettings({ ...settings, liveContent: draftLiveEdits }));
  };

  const handleAddHappyCustomer = (customer: HappyCustomer) => {
    if (currentAdmin?.role !== 'owner') return;
    const nextCustomers = sortHappyCustomers([customer, ...happyCustomers]);
    try {
      writeHappyCustomersStorage(nextCustomers);
      setHappyCustomers(nextCustomers);
      const pending = readPendingCloudSync();
      writePendingCloudSync({ ...pending, happyCustomers: true });
      if (isFirebaseConfigured && cloudDataReady && authBackend === 'firebase') {
        void Promise.all([
          persistHappyCustomers(nextCustomers),
          ...pending.deletedHappyCustomerIds.map((id) => deleteHappyCustomer(id)),
        ]).then(([uploadedCustomers]) => {
          if (!uploadedCustomers) throw new Error('The shared customer stories store is unavailable.');
          const savedCustomers = sortHappyCustomers(uploadedCustomers);
          writeHappyCustomersStorage(savedCustomers);
          setHappyCustomers(savedCustomers);
          setSavedHappyCustomers(savedCustomers);
          writePendingCloudSync({ ...pending, happyCustomers: false, deletedHappyCustomerIds: [] });
        }).catch((error) => showToast(`Story saved locally, but Firebase sync failed: ${error instanceof Error ? error.message : 'unknown error'}.`));
      } else if (isFirebaseConfigured && !isLocalDevelopment()) {
        showToast('Story saved in this browser. An authenticated Firebase Owner is required to publish it to other visitors.');
      }
    } catch (error) {
      showToast(`Customer story could not be saved locally: ${error instanceof Error ? error.message : 'storage error'}`);
    }
  };

  const handleDeleteHappyCustomer = (id: string) => {
    if (currentAdmin?.role !== 'owner') return;
    const nextCustomers = happyCustomers.filter((customer) => customer.id !== id);
    try {
      writeHappyCustomersStorage(nextCustomers);
      setHappyCustomers(nextCustomers);
      const pending = readPendingCloudSync();
      const pendingDeletes = [...new Set([...pending.deletedHappyCustomerIds, id])];
      writePendingCloudSync({ ...pending, happyCustomers: true, deletedHappyCustomerIds: pendingDeletes });
      if (isFirebaseConfigured && cloudDataReady && authBackend === 'firebase') {
        void Promise.all([
          persistHappyCustomers(nextCustomers),
          ...pendingDeletes.map((customerId) => deleteHappyCustomer(customerId)),
        ]).then(([uploadedCustomers]) => {
          if (!uploadedCustomers) throw new Error('The shared customer stories store is unavailable.');
          const savedCustomers = sortHappyCustomers(uploadedCustomers);
          writeHappyCustomersStorage(savedCustomers);
          setHappyCustomers(savedCustomers);
          setSavedHappyCustomers(savedCustomers);
          writePendingCloudSync({ ...pending, happyCustomers: false, deletedHappyCustomerIds: [] });
        }).catch((error) => showToast(`Story removal saved locally, but Firebase sync failed: ${error instanceof Error ? error.message : 'unknown error'}.`));
      } else if (isFirebaseConfigured && !isLocalDevelopment()) {
        showToast('Story removal saved in this browser. An authenticated Firebase Owner is required to publish it to other visitors.');
      }
    } catch (error) {
      showToast(`Customer story change could not be saved locally: ${error instanceof Error ? error.message : 'storage error'}`);
    }
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Active product for PDP
  const currentProduct = products.find((product) => product.id === selectedProductId);

  useEffect(() => {
    const pageTitle = activeTab === 'pdp' && currentProduct
      ? `${currentProduct.title} | Sosta Tech Rajshahi`
      : ({
          home: 'Sosta Tech Rajshahi | Flagship Phones & Accessories',
          iphones: 'Shop Smartphones | Sosta Tech Rajshahi',
          android: 'Android Flagships | Sosta Tech Rajshahi',
          about: 'About Sosta Tech | Rajshahi',
          'store-location': 'Store Location & Hours | Sosta Tech Rajshahi',
          'happy-customers': 'Customer Stories | Sosta Tech Rajshahi',
          compare: 'Compare Flagship Phones | Sosta Tech Rajshahi',
          portal: 'Admin Portal | Sosta Tech',
        }[activeTab] || 'Sosta Tech Rajshahi | Flagship Phones');
    const pageDescription = activeTab === 'pdp' && currentProduct
      ? `${currentProduct.title} available in Rajshahi from ${siteSettings.brandName}. ${currentProduct.description}`
      : `${siteSettings.brandName} sells authentic smartphones and accessories in Rajshahi, Bangladesh. Visit our Theme Omar Plaza store for verified stock, fair prices, and hands-on inspection.`;
    const pagePath = window.location.pathname === '/' ? '/' : window.location.pathname.replace(/\/+$/, '');
    const canonicalUrl = `${window.location.origin}${pagePath}`;
    const pageImage = activeTab === 'pdp' && currentProduct
      ? currentProduct.imageUrl || currentProduct.gallery.find((image) => image.isPrimary)?.src || currentProduct.gallery[0]?.src
      : siteSettings.heroBanners[0] || siteSettings.logoUrl;
    const setMeta = (selector: string, attribute: string, key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.content = content;
    };
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
    document.title = pageTitle;
    setMeta('meta[name="description"]', 'name', 'description', pageDescription);
    setMeta('meta[name="keywords"]', 'name', 'keywords', 'Sosta Tech Rajshahi, smartphones Rajshahi, iPhone Rajshahi, Android phones Bangladesh, Theme Omar Plaza, authentic phones');
    setMeta('meta[name="robots"]', 'name', 'robots', activeTab === 'portal' ? 'noindex, nofollow' : 'index, follow');
    setMeta('meta[property="og:title"]', 'property', 'og:title', pageTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', pageDescription);
    setMeta('meta[property="og:type"]', 'property', 'og:type', activeTab === 'pdp' ? 'product' : 'website');
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', siteSettings.brandName);
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', 'en_BD');
    setMeta('meta[property="og:image"]', 'property', 'og:image', pageImage || '');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', pageDescription);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', pageImage || '');

    const localBusiness = {
      '@type': 'LocalBusiness',
      '@id': `${window.location.origin}/#localbusiness`,
      name: siteSettings.brandName,
      url: `${window.location.origin}/`,
      image: pageImage,
      telephone: siteSettings.contactNumber,
      priceRange: '৳৳',
      address: {
        '@type': 'PostalAddress',
        streetAddress: siteSettings.footerLocation,
        addressLocality: 'Rajshahi',
        addressRegion: 'Rajshahi Division',
        postalCode: '6000',
        addressCountry: 'BD',
      },
      areaServed: { '@type': 'City', name: 'Rajshahi' },
    };
    const graph: Record<string, unknown>[] = [
      { '@type': 'WebSite', '@id': `${window.location.origin}/#website`, name: siteSettings.brandName, url: `${window.location.origin}/`, inLanguage: 'en-BD' },
      localBusiness,
    ];
    if (activeTab === 'pdp' && currentProduct) {
      graph.push({
        '@type': 'Product',
        name: currentProduct.title,
        description: currentProduct.detailedDescription || currentProduct.description,
        sku: currentProduct.sku,
        brand: { '@type': 'Brand', name: currentProduct.brand },
        image: currentProduct.gallery.map((image) => image.src),
        itemCondition: currentProduct.condition === 'Brand New'
          ? 'https://schema.org/NewCondition'
          : currentProduct.condition === 'Official Refurbished'
            ? 'https://schema.org/RefurbishedCondition'
            : 'https://schema.org/UsedCondition',
        offers: {
          '@type': 'Offer',
          priceCurrency: 'BDT',
          price: currentProduct.basePrice,
          availability: currentProduct.inStock && currentProduct.stock > 0
            ? 'https://schema.org/InStock'
            : currentProduct.preOrderOnly
              ? 'https://schema.org/PreOrder'
              : 'https://schema.org/OutOfStock',
          url: canonicalUrl,
          seller: { '@id': `${window.location.origin}/#localbusiness` },
        },
      });
    }
    if (activeTab === 'home') {
      graph.push({
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Where can I inspect a phone before buying in Rajshahi?',
            acceptedAnswer: { '@type': 'Answer', text: `${siteSettings.brandName} welcomes customers to inspect available devices at ${siteSettings.footerLocation} before purchase.` },
          },
          {
            '@type': 'Question',
            name: 'Does Sosta Tech sell new and pre-owned phones?',
            acceptedAnswer: { '@type': 'Answer', text: 'The catalog includes brand-new and pre-owned smartphones. Check each product listing for its condition, stock status, price, and included warranty.' },
          },
          {
            '@type': 'Question',
            name: 'How can I check current stock or ask about delivery?',
            acceptedAnswer: { '@type': 'Answer', text: `Contact ${siteSettings.brandName} by phone or WhatsApp to confirm current stock, delivery options, and product details.` },
          },
        ],
      });
    }
    let structuredData = document.head.querySelector<HTMLScriptElement>('script[data-sosta-structured-data]');
    if (!structuredData) {
      structuredData = document.createElement('script');
      structuredData.type = 'application/ld+json';
      structuredData.dataset.sostaStructuredData = 'true';
      document.head.appendChild(structuredData);
    }
    structuredData.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  }, [activeTab, currentProduct, siteSettings]);

  return (
    <SiteSettingsContext.Provider value={siteSettings}>
    <div data-persistence-backend={isFirebaseConfigured ? 'firebase' : 'browser-offline'} className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-[#0b1c30] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 border border-white/20">
          <span className="material-symbols-outlined text-[#6ffbbe] text-[20px]">
            check_circle
          </span>
          <span className="text-[13px] font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Storefront Header (Hidden when inside full Admin Portal for authentic ops screen) */}
      {activeTab !== 'portal' && (
        <Header
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'compare') {
              if (liveEditorEnabled) return;
              setIsCompareModalOpen(true);
            } else if (tab === 'portal') {
              navigateToAdmin();
            } else {
              navigateToTab(tab);
            }
          }}
          cartItems={cartItems}
          onOpenCart={() => setIsCartOpen(true)}
          onSearch={handleSearch}
          searchQuery={searchQuery}
        />
      )}

      {/* Main Router Content */}
      <main className="flex-1 w-full">
        <Suspense fallback={<div className="min-h-[60vh] animate-pulse bg-[#f8f9ff]" aria-busy="true" aria-label="Loading page" />}>
        {activeTab === 'home' && (
          <div className="pt-20">
            <HomePage
              products={products}
              reviews={happyCustomers.length
                ? happyCustomers.slice(0, 3).map((customer) => ({
                    id: customer.id,
                    name: customer.customerName,
                    title: customer.phoneModel,
                    role: 'Verified Sosta Tech customer',
                    avatarLetter: customer.customerName.charAt(0).toUpperCase(),
                    rating: customer.rating,
                    content: customer.review,
                  }))
                : REVIEWS}
              happyCustomers={happyCustomers}
              facebookFeed={facebookFeed}
              onSelectProduct={handleSelectProduct}
              onNavigateCatalog={(cat) => {
                setCatalogCategory(cat && cat !== 'Android' ? cat : '');
                if (cat === 'Android') {
                  navigateToTab('android');
                } else {
                  navigateToTab('iphones');
                }
              }}
              onNavigateStore={() => {
                navigateToTab('store-location');
              }}
              onSeeAllHappyCustomers={navigateToHappyCustomers}
              onAddToCart={(p) =>
                handleAddToCart({
                  productId: p.id,
                  title: p.title,
                  color: p.variants?.[0]?.color || p.colors[0]?.name || 'Default',
                  storage: p.variants?.[0]
                    ? `${p.variants[0].ram} RAM / ${p.variants[0].storage}`
                    : p.storages[0]?.capacity || '256GB',
                  simVariant: p.simVariants[0]?.name || 'USA LL/A',
                  price: p.variants?.[0]?.price ?? p.basePrice,
                  image: p.variants?.[0]?.imageUrl || p.gallery.find((image) => image.isPrimary)?.src || p.gallery[0]?.src || '',
                  condition: p.condition,
                })
              }
            />
          </div>
        )}

        {activeTab === 'iphones' && (
          <div className="pt-20">
            <CatalogPage
              products={products}
              brandFilter="all"
              categoryFilter={catalogCategory}
              onCategoryChange={setCatalogCategory}
              searchQuery={searchQuery}
              onSearchChange={handleSearch}
              onSelectProduct={handleSelectProduct}
              onAddToCompare={handleAddToCompare}
              compareList={compareList}
              onNavigateStore={() => {
                navigateToTab('store-location');
              }}
            />
          </div>
        )}

        {activeTab === 'android' && (
          <div className="pt-20">
            <CatalogPage
              products={products}
              brandFilter="Samsung"
              searchQuery={searchQuery}
              onSearchChange={handleSearch}
              onSelectProduct={handleSelectProduct}
              onAddToCompare={handleAddToCompare}
              compareList={compareList}
              onNavigateStore={() => {
                navigateToTab('store-location');
              }}
            />
          </div>
        )}

        {activeTab === 'pdp' && (
          <div className="pt-20">
            {currentProduct ? <ProductDetailPage
              product={currentProduct}
              onNavigateHome={() => {
                navigateHome();
              }}
              onNavigateCatalog={() => {
                navigateToTab('iphones');
              }}
              onAddToCart={handleAddToCart}
              onToast={showToast}
            /> : (
              <section className="mx-auto max-w-2xl px-6 py-24 text-center">
                <h1 className="text-3xl font-bold text-[#0b1c30]">Product not found</h1>
                <p className="mt-3 text-[#565e74]">This product may have been removed or its link may be outdated.</p>
                <button onClick={() => navigateToTab('iphones')} className="mt-6 rounded-lg bg-[#004ac6] px-5 py-3 font-semibold text-white">
                  Browse the catalog
                </button>
              </section>
            )}
          </div>
        )}

        {activeTab === 'store-location' && (
          <div className="pt-20">
            <StoreLocationPage />
          </div>
        )}

        {activeTab === 'about' && (
          <div className="pt-20"><AboutPage /></div>
        )}

        {activeTab === 'happy-customers' && (
          <HappyCustomersPage customers={happyCustomers} onNavigateHome={navigateHome} />
        )}

        {activeTab === 'portal' && (currentAdmin ? (
          <AdminPortalPage
            products={products}
            leads={leads}
            currentUser={currentAdmin}
            users={adminUsers}
            happyCustomers={happyCustomers}
            onUpdateProductStock={handleUpdateProductStock}
            onUpdateProductDetails={handleUpdateProductDetails}
            onAddProduct={handleAddProduct}
            onSaveSiteSettings={handleSaveSiteSettings}
            onImportBackup={currentAdmin.role === 'owner' ? handleImportBackup : () => undefined}
            onAddHappyCustomer={handleAddHappyCustomer}
            onDeleteHappyCustomer={handleDeleteHappyCustomer}
            activeAdminSection={activeAdminSection}
            onNavigateAdminSection={requestAdminSection}
            onAddManager={handleAddManager}
            onApproveManager={handleApproveManager}
            onRejectManager={handleRejectManager}
            onRemoveManager={handleRemoveManager}
            onResetManagerPassword={handleResetManagerPassword}
            onChangePassword={handleChangePassword}
            onLogout={handleAdminLogout}
            requirePasswordChange={Boolean(currentAdmin.mustChangePassword)}
            onDeleteProduct={handleDeleteProduct}
            onSelectProduct={handleSelectProduct}
            onBackToStorefront={() => {
              navigateHome();
            }}
            facebookFeedSyncedAt={facebookFeed.syncedAt}
            onSyncFacebookFeed={handleSyncFacebookFeed}
            onToast={showToast}
          />
        ) : (
          <AdminLoginPage
            needsOwnerSetup={isFirebaseConfigured ? needsOwnerSetup : !adminUsers.some((user) => user.role === 'owner')}
            firebaseMode={isFirebaseConfigured}
            ownerSetupLoading={ownerSetupLoading}
            ownerSetupError={ownerSetupError}
            onLogin={handleAdminLogin}
            onSetupOwner={handleSetupOwner}
            onRegisterManager={handleRegisterManager}
          />
        ))}
        </Suspense>
      </main>

      {/* Cart Slide-Over Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
      />

      {/* Compare Models Modal */}
      <CompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        products={compareList}
        inventory={products}
        onAddToCompare={handleAddToCompare}
        onSelectProduct={handleSelectProduct}
        onRemoveFromCompare={handleRemoveFromCompare}
      />

      {/* Storefront Footer (Visible on all customer-facing views) */}
      {activeTab !== 'portal' && (
        <Footer
          onNavigate={(tab) => {
            if (tab === 'portal') navigateToAdmin();
            else navigateToTab(tab);
          }}
        />
      )}

      {currentAdmin?.role === 'owner' && activeTab !== 'portal' && (
        <LiveEditorOverlay
          enabled={liveEditorEnabled}
          isDirty={isLiveEditDirty}
          isSaving={isSavingLiveEdits}
          routeKey={activeTab}
          edits={draftLiveEdits}
          pages={[
            { tab: 'home', label: 'Home', path: '/' },
            { tab: 'iphones', label: 'Catalog', path: '/catalog' },
            { tab: 'android', label: 'Android', path: '/android' },
            { tab: 'pdp', label: 'Product', path: pathForTab('pdp', selectedProductId) },
            { tab: 'about', label: 'About', path: '/about' },
            { tab: 'store-location', label: 'Contact', path: '/contact' },
            { tab: 'happy-customers', label: 'Stories', path: '/happy-customers' },
          ]}
          onToggle={toggleLiveEditor}
          onChange={setDraftLiveEdits}
          onSave={saveChanges}
          onDiscard={discardChanges}
          onNavigate={(tab, path) => requestNavigation({ tab, path, productId: tab === 'pdp' ? selectedProductId : undefined })}
        />
      )}

      {liveEditorEnabled && isLiveEditDirty && (
        <div data-live-editor-ui="true" className="fixed top-24 left-1/2 z-[90] flex w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-[#c3c6d7] bg-white px-4 py-3 shadow-2xl">
          <div>
            <p className="text-[13px] font-bold text-[#0b1c30]">Unsaved live site edits</p>
            <p className="text-[11px] text-[#565e74]">Save to publish these changes for all visitors.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button disabled={isSavingLiveEdits} onClick={discardChanges} className="rounded-lg border border-[#d4d9e5] px-3 py-2 text-[12px] font-semibold text-[#0b1c30] disabled:opacity-50">Discard</button>
            <button disabled={isSavingLiveEdits} onClick={saveChanges} className="rounded-lg bg-[#004ac6] px-4 py-2 text-[12px] font-semibold text-white disabled:cursor-wait disabled:opacity-60">{isSavingLiveEdits ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </div>
      )}

      {isDirty && !(liveEditorEnabled && isLiveEditDirty) && (
        <div data-live-editor-ui="true" className="fixed bottom-4 left-1/2 z-[90] flex w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-[#c3c6d7] bg-white px-4 py-3 shadow-2xl">
          <div>
            <p className="text-[13px] font-bold text-[#0b1c30]">Unsaved changes</p>
            <p className="text-[11px] text-[#565e74]">Your edits are drafts until saved.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button disabled={isSavingLiveEdits} onClick={discardChanges} className="rounded-lg border border-[#d4d9e5] px-3 py-2 text-[12px] font-semibold text-[#0b1c30] disabled:opacity-50">Discard Changes</button>
            <button disabled={isSavingLiveEdits} onClick={saveChanges} className="rounded-lg bg-[#004ac6] px-4 py-2 text-[12px] font-semibold text-white disabled:cursor-wait disabled:opacity-60">{isSavingLiveEdits ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </div>
      )}

      {unsavedGuardOpen && (
        <div data-live-editor-ui="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b1c30]/55 p-4" role="dialog" aria-modal="true" aria-labelledby="unsaved-changes-title">
          <section className="w-full max-w-md rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-2xl">
            <h2 id="unsaved-changes-title" className="text-[20px] font-bold text-[#0b1c30]">Unsaved changes</h2>
            <p className="mt-2 text-[13px] text-[#565e74]">You have unsaved changes. Do you want to save or discard them before leaving?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setUnsavedGuardOpen(false); setPendingNavigation(null); setPendingAdminSection(null); setPendingEditorExit(false); setPendingLogout(false); }} className="rounded-lg border border-[#d4d9e5] px-4 py-2.5 text-[13px] font-semibold text-[#0b1c30]">Stay</button>
              <button disabled={isSavingLiveEdits} onClick={discardChanges} className="rounded-lg bg-[#eff4ff] px-4 py-2.5 text-[13px] font-semibold text-[#0b1c30] disabled:opacity-50">Discard Changes</button>
              <button disabled={isSavingLiveEdits} onClick={saveChanges} className="rounded-lg bg-[#004ac6] px-4 py-2.5 text-[13px] font-semibold text-white disabled:cursor-wait disabled:opacity-60">{isSavingLiveEdits ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
    </SiteSettingsContext.Provider>
  );
}
