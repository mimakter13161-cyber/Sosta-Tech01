import React, { useEffect, useState } from 'react';
import { AdminUser, HappyCustomer, Product, ProductImage, ProductVariant, SiteSettings, TechnicalSpecs, WhatsAppLead } from '../types';
import { useSiteSettings } from '../components/SiteSettingsContext';
import { ImageUploadField } from '../components/ImageUploadField';
import { downloadImageAsDataUrl, isFirebaseConfigured } from '../firebaseClient';

interface ProductTaxonomy {
  brands: string[];
  seriesByBrand: Record<string, string[]>;
}

const PRODUCT_TAXONOMY_KEY = 'sosta-product-taxonomy-v1';

const createDefaultTechnicalSpecs = (): TechnicalSpecs => ({
  display: {
    screenSize: 'Premium OLED display (add size)',
    resolution: 'Manufacturer-rated resolution',
    refreshRate: 'Up to 120Hz (verify model)',
    peakBrightness: 'Manufacturer-rated peak brightness',
    chassisMaterial: 'Glass, aluminum, or titanium (specify)',
  },
  camera: {
    primary: 'High-resolution main camera (specify sensor)',
    ultraWide: 'Ultra-wide camera (specify resolution)',
    telephoto: 'Telephoto camera or N/A',
    cameraControl: 'Model-specific camera controls',
    videoRecording: '4K video recording (verify frame rates)',
  },
  performance: {
    chipset: 'Model-specific flagship chipset',
    cpuCores: 'Manufacturer-specified CPU cores',
    gpuCores: 'Manufacturer-specified GPU cores',
    neuralEngine: 'On-device AI engine (specify details)',
    ram: 'Specify installed RAM',
  },
  battery: {
    playback: 'Manufacturer-rated video playback',
    port: 'USB-C or model-specific charging port',
    wireless: 'Wireless charging (verify standard and wattage)',
    wired: 'Manufacturer-rated wired charging speed',
  },
  box: {
    inTheBox: 'Device, charging cable, documentation (verify pack)',
    warranty: 'Specify applicable warranty',
    replacement: 'Specify replacement window',
    inspection: 'Physical inspection available before purchase',
  },
  compliance: {
    imeiWhitelisting: 'Verify IMEI status against BTRC records',
    cellular5G: 'Specify supported 5G bands for this region',
    esimOperators: 'Specify supported SIM/eSIM configuration',
    invoiceType: 'Sales invoice provided',
  },
});

const normalizeTechnicalSpecs = (specs: Partial<TechnicalSpecs>): TechnicalSpecs => {
  const defaults = createDefaultTechnicalSpecs();
  const fill = <T extends Record<string, string>>(values: Partial<T>, fallback: T): T =>
    Object.fromEntries(Object.entries(fallback).map(([key, defaultValue]) => [
      key,
      typeof values[key] === 'string' && values[key].trim() ? values[key].trim() : defaultValue,
    ])) as T;

  return {
    display: fill(specs.display || {}, defaults.display),
    camera: fill(specs.camera || {}, defaults.camera),
    performance: fill(specs.performance || {}, defaults.performance),
    battery: fill(specs.battery || {}, defaults.battery),
    box: fill(specs.box || {}, defaults.box),
    compliance: fill(specs.compliance || {}, defaults.compliance),
  };
};

const loadProductTaxonomy = (): ProductTaxonomy => {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(PRODUCT_TAXONOMY_KEY) || '{}');
    if (!saved || typeof saved !== 'object') return { brands: [], seriesByBrand: {} };
    const data = saved as Partial<ProductTaxonomy>;
    return {
      brands: Array.isArray(data.brands) ? data.brands.filter((value): value is string => typeof value === 'string') : [],
      seriesByBrand: data.seriesByBrand && typeof data.seriesByBrand === 'object' ? data.seriesByBrand : {},
    };
  } catch {
    return { brands: [], seriesByBrand: {} };
  }
};

interface SuggestionInputProps {
  label: string;
  value: string;
  options: string[];
  createLabel: string;
  placeholder: string;
  onChange: (value: string) => void;
  onCreate?: (value: string) => void;
  required?: boolean;
}

const SuggestionInput: React.FC<SuggestionInputProps> = ({
  label,
  value,
  options,
  createLabel,
  placeholder,
  onChange,
  onCreate,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const matches = options.filter((option) => option.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()));
  const hasExactMatch = options.some((option) => option.toLocaleLowerCase() === value.trim().toLocaleLowerCase());

  return (
    <div className="relative">
      <label className="font-semibold text-[#0b1c30] block mb-1">{label}</label>
      <input
        ref={inputRef}
        type="text"
        required={required}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => { onChange(event.target.value); setIsOpen(true); }}
        className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0]"
      />
      {isOpen && (
        <div className="absolute z-20 mt-1 max-h-56 w-full origin-top overflow-y-auto rounded-lg border border-[#d4d9e5] bg-white p-1 shadow-xl animate-in fade-in slide-in-from-top-1">
          {matches.map((option) => (
            <button
              key={option}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { onChange(option); setIsOpen(false); }}
              className="block w-full rounded-md px-3 py-2 text-left text-[13px] text-[#0b1c30] hover:bg-[#eff4ff]"
            >
              {option}
            </button>
          ))}
          {onCreate && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                const entered = value.trim();
                if (entered) {
                  onCreate(entered);
                  setIsOpen(false);
                } else {
                  inputRef.current?.focus();
                }
              }}
              className="block w-full rounded-md border-t border-[#e2e8f0] px-3 py-2 text-left text-[13px] font-semibold text-[#004ac6] hover:bg-[#eff4ff]"
            >
              + {createLabel}{value.trim() && !hasExactMatch ? ` “${value.trim()}”` : ''}
            </button>
          )}
          {matches.length === 0 && (!onCreate || hasExactMatch) && (
            <p className="px-3 py-2 text-[12px] text-[#565e74]">No matching suggestions. Keep typing to use a custom value.</p>
          )}
        </div>
      )}
    </div>
  );
};

interface AdminPortalPageProps {
  products: Product[];
  leads: WhatsAppLead[];
  currentUser: AdminUser;
  requirePasswordChange: boolean;
  users: AdminUser[];
  happyCustomers: HappyCustomer[];
  onUpdateProductStock: (id: string, delta: number) => void;
  onUpdateProductDetails: (product: Product) => void;
  onAddProduct: (newProduct: Product) => void;
  onSaveSiteSettings: (settings: SiteSettings) => void;
  onImportBackup: (products: Product[], settings: SiteSettings, customers: HappyCustomer[]) => void;
  onAddHappyCustomer: (customer: HappyCustomer) => void;
  onDeleteHappyCustomer: (id: string) => void;
  activeAdminSection: string;
  onNavigateAdminSection: (section: string) => void;
  onAddManager: (email: string, password: string) => Promise<void>;
  onRemoveManager: (userId: string) => Promise<void> | void;
  onResetManagerPassword: (userId: string, password: string) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onLogout: () => void;
  onDeleteProduct: (id: string) => void;
  onSelectProduct: (productId: string) => void;
  onBackToStorefront: () => void;
  onToast: (msg: string) => void;
}

export const AdminPortalPage: React.FC<AdminPortalPageProps> = ({
  products,
  leads,
  currentUser,
  requirePasswordChange,
  users,
  happyCustomers,
  onUpdateProductStock,
  onUpdateProductDetails,
  onAddProduct,
  onSaveSiteSettings,
  onImportBackup,
  onAddHappyCustomer,
  onDeleteHappyCustomer,
  activeAdminSection,
  onNavigateAdminSection,
  onAddManager,
  onRemoveManager,
  onResetManagerPassword,
  onChangePassword,
  onLogout,
  onDeleteProduct,
  onSelectProduct,
  onBackToStorefront,
  onToast,
}) => {
  // Navigation inside admin
  const activeAdminNav = activeAdminSection;
  const [searchFilter, setSearchFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState<'All' | 'Brand New' | 'Pre-Owned' | 'Refurbished'>('All');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<{ type: 'self' } | { type: 'manager'; userId: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerInitialPassword, setManagerInitialPassword] = useState('');
  const [userManagementError, setUserManagementError] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);
  const isOwner = currentUser.role === 'owner';
  const siteSettings = useSiteSettings();
  const [happyCustomerImage, setHappyCustomerImage] = useState<ProductImage[]>([]);
  const [happyCustomerName, setHappyCustomerName] = useState('');
  const [happyCustomerModel, setHappyCustomerModel] = useState('');
  const [happyCustomerRating, setHappyCustomerRating] = useState<HappyCustomer['rating']>(5);
  const [happyCustomerReview, setHappyCustomerReview] = useState('');
  const [happyCustomerError, setHappyCustomerError] = useState('');
  const [backupError, setBackupError] = useState('');
  const [settingsDraft, setSettingsDraft] = useState(siteSettings);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);

  useEffect(() => {
    if (requirePasswordChange) setPasswordTarget({ type: 'self' });
  }, [requirePasswordChange]);

  useEffect(() => {
    setSettingsDraft(siteSettings);
  }, [siteSettings]);

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [editVariants, setEditVariants] = useState<ProductVariant[]>([]);
  const [editTitle, setEditTitle] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editSeries, setEditSeries] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWeightSpecifications, setEditWeightSpecifications] = useState('');
  const [editCondition, setEditCondition] = useState<Product['condition']>('Brand New');
  const [editCostPrice, setEditCostPrice] = useState(0);
  const [editModelIdentifier, setEditModelIdentifier] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editStockLocation, setEditStockLocation] = useState('');
  const [editRegionVariantBadge, setEditRegionVariantBadge] = useState('');
  const [editRegionCountryCode, setEditRegionCountryCode] = useState('');
  const [editSimVariants, setEditSimVariants] = useState<Product['simVariants']>([]);
  const [editGallery, setEditGallery] = useState<ProductImage[]>([]);
  const [editPrimaryImageIndex, setEditPrimaryImageIndex] = useState(0);
  const [editTechnicalSpecs, setEditTechnicalSpecs] = useState<TechnicalSpecs>(createDefaultTechnicalSpecs);
  const [editSaveError, setEditSaveError] = useState('');
  const [editStatus, setEditStatus] = useState<string>('in_stock');
  const [editAuditorNote, setEditAuditorNote] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Add Phone Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newModel, setNewModel] = useState('');
  const [newBrand, setNewBrand] = useState<string>('Apple');
  const [newSeries, setNewSeries] = useState<string>('iPhone 16 Series');
  const [newCondition, setNewCondition] = useState<Product['condition']>('Brand New');
  const [newModelIdentifier, setNewModelIdentifier] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newStockLocation, setNewStockLocation] = useState('Theme Omar Plaza, Rajshahi');
  const [newRegionVariantBadge, setNewRegionVariantBadge] = useState('🌐 Dual eSIM/SIM');
  const [newRegionCountryCode, setNewRegionCountryCode] = useState('Global / BTRC');
  const [newSimVariants, setNewSimVariants] = useState<Product['simVariants']>([
    { name: 'Global Dual', subtitle: 'Nano + eSIM', surcharge: 0 },
  ]);
  const [newTechnicalSpecs, setNewTechnicalSpecs] = useState<TechnicalSpecs>(createDefaultTechnicalSpecs);
  const [newVariants, setNewVariants] = useState<ProductVariant[]>([
    { id: 'variant-1', ram: '8GB', storage: '256GB', color: 'Natural Titanium', colorHex: '#8a8984', price: 150000, originalPrice: 160000, costPrice: 143000, stock: 3, batteryHealth: 100 },
  ]);
  const [newGallery, setNewGallery] = useState<ProductImage[]>([]);
  const [newPrimaryImageIndex, setNewPrimaryImageIndex] = useState(0);
  const [isReadingImages, setIsReadingImages] = useState(false);
  const [newWeightSpecifications, setNewWeightSpecifications] = useState('');
  const [newDetailedDescription, setNewDetailedDescription] = useState('');
  const [productTaxonomy, setProductTaxonomy] = useState<ProductTaxonomy>(loadProductTaxonomy);
  const availableBrands = Array.from(new Set([
    ...products.map((product) => product.brand),
    ...productTaxonomy.brands,
  ])).sort((left, right) => left.localeCompare(right));
  const canonicalBrand = availableBrands.find((brand) => brand.toLocaleLowerCase() === newBrand.trim().toLocaleLowerCase()) || newBrand.trim();
  const availableSeries = Array.from(new Set([
    ...products.filter((product) => product.brand.toLocaleLowerCase() === canonicalBrand.toLocaleLowerCase()).map((product) => product.series),
    ...(productTaxonomy.seriesByBrand[canonicalBrand] || []),
  ])).sort((left, right) => left.localeCompare(right));
  const availableSeriesKey = availableSeries.join('\u0000');
  const availableModels = Array.from(new Set(products.map((product) => product.model))).sort((left, right) => left.localeCompare(right));
  const previousBrand = React.useRef(canonicalBrand);

  useEffect(() => {
    try {
      window.localStorage.setItem(PRODUCT_TAXONOMY_KEY, JSON.stringify(productTaxonomy));
    } catch {
      onToast('Custom brands and series could not be saved in this browser.');
    }
  }, [productTaxonomy]);

  useEffect(() => {
    if (previousBrand.current !== canonicalBrand) {
      previousBrand.current = canonicalBrand;
      if (!availableSeries.some((series) => series.toLocaleLowerCase() === newSeries.trim().toLocaleLowerCase())) {
        setNewSeries('');
      }
    }
  }, [canonicalBrand, availableSeriesKey, newSeries]);
  const enteredGalleryImages = newGallery;

  const updateVariant = (id: string, changes: Partial<ProductVariant>) => {
    setNewVariants((current) => current.map((variant) => variant.id === id ? { ...variant, ...changes } : variant));
  };

  const updateTechnicalSpec = <K extends keyof TechnicalSpecs,>(
    section: K,
    field: Extract<keyof TechnicalSpecs[K], string>,
    value: string
  ) => {
    setNewTechnicalSpecs((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }));
  };

  const renderTechnicalSpecSection = <K extends keyof TechnicalSpecs,>(
    specs: TechnicalSpecs,
    updateSpecs: (section: K, field: Extract<keyof TechnicalSpecs[K], string>, value: string) => void,
    section: K,
    title: string,
    fields: Array<{ key: Extract<keyof TechnicalSpecs[K], string>; label: string }>
  ) => (
    <details key={section} className="rounded-lg border border-[#e2e8f0] bg-white">
      <summary className="cursor-pointer px-3 py-3 font-semibold text-[#0b1c30]">{title}</summary>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-3 pb-3">
        {fields.map(({ key, label }) => (
          <label key={key} className="font-semibold text-[#0b1c30]">
            {label}
            <input
              value={String(specs[section][key])}
              onChange={(event) => updateSpecs(section, key, event.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal"
            />
          </label>
        ))}
      </div>
    </details>
  );

  const autofillTechnicalSpecs = () => {
    setNewTechnicalSpecs(createDefaultTechnicalSpecs());
  };

  const updateEditTechnicalSpec = <K extends keyof TechnicalSpecs,>(
    section: K,
    field: Extract<keyof TechnicalSpecs[K], string>,
    value: string
  ) => {
    setEditTechnicalSpecs((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }));
  };

  const updateEditVariant = (id: string, changes: Partial<ProductVariant>) => {
    setEditVariants((current) => current.map((variant) => variant.id === id ? { ...variant, ...changes } : variant));
  };

  const updateSetting = <K extends keyof SiteSettings,>(key: K, value: SiteSettings[K]) => {
    const nextSettings = { ...settingsDraft, [key]: value };
    setSettingsDraft(nextSettings);
    onSaveSiteSettings(nextSettings);
  };

  const rememberBrandAndSeries = (brand: string, series?: string) => {
    setProductTaxonomy((current) => {
      const brands = current.brands.some((item) => item.toLocaleLowerCase() === brand.toLocaleLowerCase())
        ? current.brands
        : [...current.brands, brand];
      const existingSeries = current.seriesByBrand[brand] || [];
      const seriesByBrand = series && !existingSeries.some((item) => item.toLocaleLowerCase() === series.toLocaleLowerCase())
        ? { ...current.seriesByBrand, [brand]: [...existingSeries, series] }
        : current.seriesByBrand;
      return { brands, seriesByBrand };
    });
  };

  const imageAsDataUrl = async (src: string) => src.startsWith('data:') ? src : downloadImageAsDataUrl(src);

  const handleExportBackup = async () => {
    setBackupError('');
    try {
      const portableProducts = await Promise.all(products.map(async (product) => ({
        ...product,
        imageUrl: product.imageUrl ? await imageAsDataUrl(product.imageUrl) : undefined,
        gallery: await Promise.all(product.gallery.map(async (image) => ({ ...image, src: await imageAsDataUrl(image.src) }))),
        variants: product.variants ? await Promise.all(product.variants.map(async (variant) => ({ ...variant, imageUrl: variant.imageUrl ? await imageAsDataUrl(variant.imageUrl) : undefined }))) : undefined,
      })));
      const portableSettings = {
        ...siteSettings,
        logoUrl: await imageAsDataUrl(siteSettings.logoUrl),
        heroBanners: await Promise.all(siteSettings.heroBanners.map(imageAsDataUrl)),
      };
      const portableCustomers = await Promise.all(happyCustomers.map(async (customer) => ({ ...customer, image: await imageAsDataUrl(customer.image) })));
      const backup = { version: 1, exportedAt: new Date().toISOString(), products: portableProducts, siteSettings: portableSettings, happyCustomers: portableCustomers };
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `sosta-tech-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      onToast('Offline site backup exported.');
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Could not export the site backup.');
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setBackupError('');
    try {
      const payload: unknown = JSON.parse(await file.text());
      if (!payload || typeof payload !== 'object') throw new Error('Invalid backup file.');
      const data = payload as { products?: Product[]; siteSettings?: Partial<SiteSettings>; happyCustomers?: HappyCustomer[] };
      if (!Array.isArray(data.products) || !data.siteSettings || !Array.isArray(data.happyCustomers)) {
        throw new Error('Backup must include products, site settings, and customer stories.');
      }
      onImportBackup(data.products, { ...siteSettings, ...data.siteSettings }, data.happyCustomers);
      onToast('Site backup imported as unsaved changes. Use the global Save Changes bar to publish it.');
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Could not import the site backup.');
    }
  };

  const handleAddManager = async (event: React.FormEvent) => {
    event.preventDefault();
    setUserManagementError('');
    setIsSavingUser(true);
    try {
      await onAddManager(managerEmail, managerInitialPassword);
      setManagerEmail('');
      setManagerInitialPassword('');
      onToast(`Store Manager ${managerEmail} added.`);
    } catch (error) {
      setUserManagementError(error instanceof Error ? error.message : 'Could not add this manager.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleRemoveManager = async (userId: string) => {
    setUserManagementError('');
    try {
      await onRemoveManager(userId);
      onToast('Store Manager removed.');
    } catch (error) {
      setUserManagementError(error instanceof Error ? error.message : 'Could not remove this manager.');
    }
  };

  const handleSavePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    if (newPassword.length < 12) {
      setPasswordError('Use a password with at least 12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setIsSavingUser(true);
    try {
      if (passwordTarget?.type === 'self') await onChangePassword(currentPassword, newPassword);
      if (passwordTarget?.type === 'manager') await onResetManagerPassword(passwordTarget.userId, newPassword);
      setPasswordTarget(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onToast(passwordTarget?.type === 'self' ? 'Password changed.' : 'Manager password reset.');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Could not update the password.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleAddHappyCustomer = (event: React.FormEvent) => {
    event.preventDefault();
    setHappyCustomerError('');
    if (!happyCustomerImage[0]) {
      setHappyCustomerError('Upload a customer photo before adding this story.');
      return;
    }
    onAddHappyCustomer({
      id: `customer-proof-${Date.now()}`,
      image: happyCustomerImage[0].src,
      customerName: happyCustomerName.trim(),
      phoneModel: happyCustomerModel.trim(),
      rating: happyCustomerRating,
      review: happyCustomerReview.trim(),
      createdAt: new Date().toISOString(),
    });
    setHappyCustomerImage([]);
    setHappyCustomerName('');
    setHappyCustomerModel('');
    setHappyCustomerRating(5);
    setHappyCustomerReview('');
    onToast('Happy customer story saved in this browser.');
  };

  // Filtered products list
  const filteredInventory = products.filter((p) => {
    if (conditionFilter === 'Brand New' && !p.condition.includes('Brand New')) return false;
    if (conditionFilter === 'Pre-Owned' && !p.condition.includes('Pre-Owned')) return false;
    if (conditionFilter === 'Refurbished' && !p.condition.includes('Refurbished')) return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        p.model.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.regionCountryCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setEditPrice(p.basePrice);
    setEditStock(p.stock);
    setEditCostPrice(p.costPrice || 0);
    const specs = normalizeTechnicalSpecs(p.specs || {});
    const ram = specs.performance.ram.match(/\d+(?:\.\d+)?GB/i)?.[0] || '8GB';
    const legacyVariants: ProductVariant[] = p.colors.flatMap((color) => p.storages.map((storage) => ({
      id: `${p.id}-${color.name}-${storage.capacity}`,
      ram,
      storage: storage.capacity,
      color: color.name,
      colorHex: color.hex,
      price: storage.price,
      originalPrice: storage.originalPrice,
      costPrice: p.costPrice,
      stock: color.name === p.colors[0]?.name && storage.capacity === p.storages[0]?.capacity ? p.stock : 0,
      batteryHealth: p.batteryHealth ?? (p.condition === 'Brand New' ? 100 : undefined),
      imageUrl: color.image,
    })));
    const sourceVariants = p.variants?.length ? p.variants : legacyVariants;
    setEditVariants(sourceVariants.map((variant, index) => ({
      ...variant,
      originalPrice: variant.originalPrice ?? (index === 0 ? p.originalPrice : variant.price),
      costPrice: variant.costPrice ?? p.costPrice,
      batteryHealth: variant.batteryHealth ?? p.batteryHealth ?? (p.condition === 'Brand New' ? 100 : undefined),
    })));
    setEditTitle(p.title);
    setEditModel(p.model);
    setEditBrand(p.brand);
    setEditSeries(p.series);
    setEditDescription(p.detailedDescription || p.description);
    setEditWeightSpecifications(p.weightSpecifications || '');
    setEditCondition(p.condition);
    setEditModelIdentifier(p.modelIdentifier || '');
    setEditSku(p.sku || '');
    setEditStockLocation(p.stockLocation || '');
    setEditRegionVariantBadge(p.regionVariantBadge || '');
    setEditRegionCountryCode(p.regionCountryCode || '');
    setEditSimVariants(p.simVariants?.length ? p.simVariants.map((sim) => ({ ...sim })) : [{ name: '', subtitle: '', surcharge: 0 }]);
    setEditGallery(p.gallery.map((image, index) => ({ ...image, isPrimary: image.isPrimary ?? index === 0 })));
    setEditPrimaryImageIndex(Math.max(0, p.gallery.findIndex((image) => image.isPrimary)));
    setEditTechnicalSpecs(specs);
    setEditSaveError('');
    setEditStatus(!p.inStock || p.stock === 0 ? 'out_of_stock' : p.stock > 1 ? 'in_stock' : 'low_stock');
    setEditAuditorNote('');
  };

  const handleSaveEdit = () => {
    if (!editingProduct) return;
    setEditSaveError('');
    if (!editVariants.length) {
      setEditSaveError('Add at least one product variant.');
      return;
    }
    if (editVariants.some((variant) => variant.batteryHealth !== undefined &&
      (!Number.isFinite(variant.batteryHealth) || variant.batteryHealth < 0 || variant.batteryHealth > 100))) {
      setEditSaveError('Battery health must be a percentage from 0 to 100.');
      return;
    }
    if (editVariants.some((variant) => !Number.isFinite(variant.price) || variant.price < 0 ||
      !Number.isFinite(variant.stock) || variant.stock < 0 ||
      (variant.costPrice !== undefined && (!Number.isFinite(variant.costPrice) || variant.costPrice < 0)))) {
      setEditSaveError('Variant price, cost, and stock must be valid non-negative numbers.');
      return;
    }
    setIsSavingEdit(true);

    setTimeout(() => {
      const primaryImage = editGallery[editPrimaryImageIndex] || editGallery[0];
      const variants = editVariants.map((variant) => ({ ...variant, imageUrl: variant.imageUrl || primaryImage?.src }));
      const colors = Array.from(new Map(variants.map((variant) => [variant.color, { name: variant.color, hex: variant.colorHex }])).values());
      const storages = Array.from(new Map(variants.map((variant) => [variant.storage, variant])).values())
        .map((variant) => ({ capacity: variant.storage, price: variant.price, originalPrice: variant.originalPrice ?? variant.price }));
      const stock = variants.reduce((total, variant) => total + variant.stock, 0);
      const primaryVariant = variants[0];
      onUpdateProductDetails({
        ...editingProduct,
        title: editTitle,
        model: editModel,
        brand: editBrand,
        series: editSeries,
        description: editDescription,
        detailedDescription: editDescription,
        weightSpecifications: editWeightSpecifications,
        condition: editCondition,
        batteryHealth: primaryVariant.batteryHealth,
        modelIdentifier: editModelIdentifier,
        sku: editSku,
        stockLocation: editStockLocation,
        regionVariantBadge: editRegionVariantBadge,
        regionCountryCode: editRegionCountryCode,
        simVariants: editSimVariants.filter((sim) => sim.name.trim() || sim.subtitle.trim()).map((sim) => ({
          ...sim,
          name: sim.name.trim(),
          subtitle: sim.subtitle.trim(),
          surcharge: Number(sim.surcharge) || 0,
        })),
        basePrice: primaryVariant.price || editPrice,
        originalPrice: primaryVariant.originalPrice ?? primaryVariant.price,
        costPrice: primaryVariant.costPrice ?? editCostPrice,
        stock,
        inStock: editStatus !== 'out_of_stock' && stock > 0,
        variants,
        colors,
        storages,
        gallery: editGallery.map((image, index) => ({ ...image, isPrimary: index === editPrimaryImageIndex })),
        imageUrl: primaryImage?.src,
        specs: normalizeTechnicalSpecs(editTechnicalSpecs),
      });
      setIsSavingEdit(false);
      setEditingProduct(null);
      onToast(`Successfully updated ${editModel}!`);
    }, 600);
  };

  const handleExportCSV = () => {
    const headers = ['Model', 'SKU', 'Condition', 'Base Price BDT', 'Cost Price BDT', 'Stock', 'Location'];
    const rows = products.map((p) => [
      `"${p.model}"`,
      `"${p.sku}"`,
      `"${p.condition}"`,
      p.basePrice,
      p.costPrice,
      p.stock,
      `"${p.stockLocation}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sosta_tech_inventory_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast('Inventory Audit CSV exported successfully!');
  };

  const handleCreateNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModel.trim() || !newBrand.trim() || !newSeries.trim()) return;

    const brand = canonicalBrand;
    const series = newSeries.trim();
    rememberBrandAndSeries(brand, series);

    const id = newModel.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const configuredVariants = newVariants.map((variant) => ({
      ...variant,
      id: `${id}-${variant.id}`,
      price: Number(variant.price),
      originalPrice: Number(variant.originalPrice ?? variant.price),
      costPrice: Number(variant.costPrice ?? 0),
      stock: Number(variant.stock),
    }));
    const fallbackImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBm73k-l7kQ-BokMGRdGorS_xPiOAHL7TH-4r6hrrHdX7RUEbtwhfbzvveZsc8vEkfQzfvOxhxLh-uHdgv4Es_zdbV_nxSOXIk2PZ5_MmnGqbAPH4xxEIJBMYQiYegRCjae7g_YYu1P-XkrExV-upzDhtISTB_K-En8V_chjz3dHF40Sej3tQ4lly8BMhoNg4k_na9kAjmbQTCHK5DYr-TU9gTuCY5MyQWaU739X1EgbjeECgrP8CH7';
    const gallery = enteredGalleryImages.length
      ? enteredGalleryImages.map((image, index) => ({ ...image, isPrimary: index === newPrimaryImageIndex }))
      : [{ src: fallbackImage, label: `${newModel} Primary Angle`, alt: `${newModel} studio photograph`, isPrimary: true }];
    const imageUrl = gallery.find((image) => image.isPrimary)?.src || gallery[0].src;
    const productColors = Array.from(new Map(configuredVariants.map((variant) => [variant.color, { name: variant.color, hex: variant.colorHex }])).values());
    const productStorages = Array.from(new Map(configuredVariants.map((variant) => [variant.storage, variant])).values());
    const totalStock = configuredVariants.reduce((total, variant) => total + variant.stock, 0);
    const detailedDescription = newDetailedDescription.trim();
    const primaryVariant = configuredVariants[0];
    const enteredSku = newSku.trim();
    const createdProduct: Product = {
      id,
      model: newModel,
      brand,
      series,
      title: `${brand} ${newModel}`,
      description: detailedDescription || 'Newly added verified flagship unit in Rajshahi. Complete warranty coverage.',
      imageUrl,
      weightSpecifications: newWeightSpecifications.trim(),
      detailedDescription,
      condition: newCondition,
      modelIdentifier: newModelIdentifier.trim() || 'Not specified',
      basePrice: primaryVariant.price,
      originalPrice: primaryVariant.originalPrice ?? primaryVariant.price,
      costPrice: primaryVariant.costPrice ?? 0,
      batteryHealth: primaryVariant.batteryHealth,
      stock: totalStock,
      stockLocation: newStockLocation.trim(),
      sku: enteredSku || `${brand.slice(0, 2).toUpperCase()}-${newModel.slice(0, 6).toUpperCase()}-${primaryVariant.storage}`,
      inStock: totalStock > 0,
      regionVariantBadge: newRegionVariantBadge.trim(),
      regionCountryCode: newRegionCountryCode.trim(),
      colors: productColors,
      storages: productStorages.map((variant) => ({ capacity: variant.storage, price: variant.price, originalPrice: variant.originalPrice || variant.price + 10000 })),
      variants: configuredVariants.map((variant) => ({ ...variant, imageUrl: variant.imageUrl?.trim() || imageUrl })),
      simVariants: newSimVariants.filter((sim) => sim.name.trim() || sim.subtitle.trim()).map((sim) => ({
        ...sim,
        name: sim.name.trim(),
        subtitle: sim.subtitle.trim(),
        surcharge: Number(sim.surcharge) || 0,
      })),
      gallery,
      specs: normalizeTechnicalSpecs({
        ...newTechnicalSpecs,
        performance: {
          ...newTechnicalSpecs.performance,
          ram: newTechnicalSpecs.performance.ram.trim()
            ? newTechnicalSpecs.performance.ram
            : `${Array.from(new Set(configuredVariants.map((variant) => variant.ram))).join(' / ')} (variant dependent)`,
        },
      }),
    };

    onAddProduct(createdProduct);
    setIsAddModalOpen(false);
    onToast(`Added ${newModel} to Rajshahi inventory vault!`);
    setNewModel('');
    setNewModelIdentifier('');
    setNewSku('');
    setNewStockLocation('Theme Omar Plaza, Rajshahi');
    setNewRegionVariantBadge('🌐 Dual eSIM/SIM');
    setNewRegionCountryCode('Global / BTRC');
    setNewSimVariants([{ name: 'Global Dual', subtitle: 'Nano + eSIM', surcharge: 0 }]);
    setNewVariants([{ id: 'variant-1', ram: '8GB', storage: '256GB', color: 'Natural Titanium', colorHex: '#8a8984', price: 150000, originalPrice: 160000, costPrice: 143000, stock: 3, batteryHealth: 100 }]);
    setNewGallery([]);
    setNewPrimaryImageIndex(0);
    setNewWeightSpecifications('');
    setNewDetailedDescription('');
    setNewTechnicalSpecs(createDefaultTechnicalSpecs());
  };

  return (
    <div className="flex bg-[#f8f9ff] min-h-screen text-[#0b1c30]">
      {/* Sidebar (Fixed on left) */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-[#e2e8f0] z-50 flex flex-col justify-between py-6">
        <div className="flex flex-col gap-6">
          {/* Admin Header */}
          <div className="px-6 flex items-center gap-3">
            <img
              alt={`${siteSettings.brandName} logo`}
              className="h-7 w-auto object-contain"
              src={siteSettings.logoUrl}
            />
            <div className="flex flex-col">
              <span className="font-semibold text-[18px] text-[#0b1c30] leading-tight">
                {siteSettings.brandName} Admin
              </span>
              <span className="text-[11px] text-[#434655] uppercase tracking-wider font-semibold">
                Rajshahi Ops
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 flex flex-col gap-1">
            {isOwner && (
              <button
                onClick={() => onNavigateAdminSection('overview')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-colors text-left cursor-pointer ${
                  activeAdminNav === 'overview'
                    ? 'bg-[#2563eb] text-white font-semibold'
                    : 'text-[#434655] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">dashboard</span>
                <span>Overview &amp; Sales</span>
              </button>
            )}

            <button
              onClick={() => onNavigateAdminSection('inventory')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-colors text-left cursor-pointer ${
                activeAdminNav === 'inventory'
                  ? 'bg-[#2563eb] text-white font-semibold'
                  : 'text-[#434655] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">devices</span>
              <span>Device Inventory</span>
            </button>

            <button
              onClick={() => onNavigateAdminSection('orders')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-colors text-left cursor-pointer ${
                activeAdminNav === 'orders'
                  ? 'bg-[#2563eb] text-white font-semibold'
                  : 'text-[#434655] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">local_shipping</span>
              <span>Rajshahi Orders &amp; COD</span>
            </button>

            {isOwner && (
              <button
                onClick={() => onNavigateAdminSection('leads')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-colors text-left cursor-pointer ${
                  activeAdminNav === 'leads'
                    ? 'bg-[#2563eb] text-white font-semibold'
                    : 'text-[#434655] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">chat</span>
                <span>WhatsApp Leads</span>
              </button>
            )}

            {isOwner && (
              <button
                onClick={() => onNavigateAdminSection('happy-customers')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-colors text-left cursor-pointer ${
                  activeAdminNav === 'happy-customers'
                    ? 'bg-[#2563eb] text-white font-semibold'
                    : 'text-[#434655] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">celebration</span>
                <span>Happy Customers</span>
              </button>
            )}

            {isOwner && (
              <button
                onClick={() => onNavigateAdminSection('settings')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-colors text-left cursor-pointer ${
                  activeAdminNav === 'settings'
                    ? 'bg-[#2563eb] text-white font-semibold'
                    : 'text-[#434655] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">store</span>
                <span>Outlet Settings</span>
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => onNavigateAdminSection('user-management')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-colors text-left cursor-pointer ${
                  activeAdminNav === 'user-management'
                    ? 'bg-[#2563eb] text-white font-semibold'
                    : 'text-[#434655] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                <span>User Management</span>
              </button>
            )}
          </nav>
        </div>

        {/* Back to storefront link */}
        <div className="px-4">
          <button
            onClick={onBackToStorefront}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-[#434655] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors text-[13px] font-medium cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            <span>Back to Storefront</span>
          </button>
        </div>
      </aside>

      {/* Main Body */}
      <div className="pl-64 flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="fixed top-0 left-64 right-0 h-16 bg-white/90 backdrop-blur-xl border-b border-[#e2e8f0] z-40 flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <span className="text-[13px] px-2.5 py-1 rounded bg-[#eff4ff] text-[#0b1c30] font-medium border border-[#e2e8f0]">
              Theme Omar Plaza Outlet
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#007d55] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006242]"></span>
            </span>
            <span className="text-[11px] text-[#006242] font-semibold uppercase tracking-wider">
              Store Active
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[#434655] text-[13px]">
              <span className="material-symbols-outlined text-[20px]">calendar_today</span>
              <span>Rajshahi Desk</span>
            </div>
            <div className="relative">
              <button
                aria-label="Admin profile menu"
                aria-expanded={isProfileMenuOpen}
                onClick={() => setIsProfileMenuOpen((open) => !open)}
                className="w-8 h-8 rounded-full bg-[#004ac6] flex items-center justify-center text-white"
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
              </button>
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-10 z-[60] w-60 bg-white border border-[#e2e8f0] rounded-lg shadow-xl p-2">
                  <div className="px-3 py-2 border-b border-[#eff4ff]">
                    <p className="text-[13px] font-semibold text-[#0b1c30] truncate">{currentUser.email}</p>
                    <p className="text-[11px] text-[#565e74]">{isOwner ? 'Main Owner' : 'Store Manager'}</p>
                  </div>
                  <button onClick={() => { setPasswordTarget({ type: 'self' }); setIsProfileMenuOpen(false); }} className="w-full text-left px-3 py-2 mt-1 rounded-md text-[13px] text-[#0b1c30] hover:bg-[#eff4ff]">
                    Change Password
                  </button>
                  <button onClick={onLogout} className="w-full text-left px-3 py-2 rounded-md text-[13px] text-[#ba1a1a] hover:bg-[#fff0ee]">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Admin Content Area */}
        <main className="pt-20 px-8 py-8 flex flex-col gap-8 max-w-[1560px] w-full">
          {/* Header Action & Realtime Telemetry */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h1 className="text-[32px] font-bold text-[#0b1c30] tracking-tight">
                  {activeAdminNav === 'settings' ? 'Global Site Settings' : activeAdminNav === 'user-management' ? 'User Management' : activeAdminNav === 'orders' ? 'Rajshahi Orders & COD' : activeAdminNav === 'happy-customers' ? 'Happy Customers & Delivery Proofs' : 'Inventory & Variant Management'}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#bdffdb]/40 text-[#006242] text-[11px] font-semibold border border-[#007d55]/30">
                  <span className="w-2 h-2 rounded-full bg-[#006242] animate-pulse"></span>
                  Supabase PostgreSQL Live
                </span>
              </div>
              <div className="flex items-center gap-4 text-[#434655] text-[13px]">
                <span>
                  Logged in as: <strong className="text-[#0b1c30]">{currentUser.email}</strong> ({isOwner ? 'Main Owner' : 'Store Manager'})
                </span>
                <span className="text-[#c3c6d7]">•</span>
                <span>
                  Cluster: <span className="font-mono text-[12px]">raj-node-01.prod</span>
                </span>
                <span className="text-[#c3c6d7]">•</span>
                <span>
                  Latency: <span className="text-[#006242] font-bold">18ms</span>
                </span>
              </div>
            </div>

            {activeAdminNav === 'inventory' && (
            <div className="flex items-center gap-3 self-start lg:self-center">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[13px] font-semibold transition-all flex items-center gap-2 border border-[#e2e8f0] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">ios_share</span>
                <span>Export Audit (.CSV)</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-5 py-2.5 rounded-lg bg-[#004ac6] hover:bg-[#2563eb] text-white text-[13px] font-semibold transition-all flex items-center gap-2 shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[19px]">add_circle</span>
                <span>+ Add New Phone</span>
              </button>
            </div>
            )}
          </div>

          {activeAdminNav === 'settings' && (
            <section className="bg-white rounded-xl border border-[#e2e8f0] p-6 flex flex-col gap-6">
              <div>
                <h2 className="text-[20px] font-bold text-[#0b1c30]">Brand & storefront content</h2>
                <p className="text-[13px] text-[#434655] mt-1">Edits remain drafts until you use the global Save Changes bar to publish them.</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => void handleExportBackup()} className="inline-flex items-center gap-2 rounded-lg bg-[#004ac6] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2563eb]">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Export Site Backup (.json)
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#d4d9e5] bg-[#eff4ff] px-4 py-2.5 text-[13px] font-semibold text-[#0b1c30] hover:bg-[#e5eeff]">
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    Import Site Backup
                    <input type="file" accept="application/json,.json" onChange={(event) => void handleImportBackup(event)} className="sr-only" />
                  </label>
                </div>
                {backupError && <p role="alert" className="mt-2 text-[12px] text-[#ba1a1a]">{backupError}</p>}
              </div>
              <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-[13px] font-semibold text-[#0b1c30]">Outlet Name
                  <input value={settingsDraft.brandName} onChange={(event) => updateSetting('brandName', event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <div className="text-[13px] font-semibold text-[#0b1c30]">
                  <ImageUploadField
                    label="Site Logo"
                    images={settingsDraft.logoUrl ? [{ src: settingsDraft.logoUrl, label: 'Site logo', alt: `${settingsDraft.brandName} logo` }] : []}
                    onChange={(images) => updateSetting('logoUrl', images[0]?.src || '')}
                    onProcessingChange={setIsProcessingLogo}
                  />
                </div>
                <label className="text-[13px] font-semibold text-[#0b1c30]">Phone / WhatsApp
                  <input type="tel" value={settingsDraft.contactNumber} onChange={(event) => updateSetting('contactNumber', event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[13px] font-semibold text-[#0b1c30]">Facebook Page / Offers URL
                  <input type="url" value={settingsDraft.facebookPageUrl} onChange={(event) => updateSetting('facebookPageUrl', event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[13px] font-semibold text-[#0b1c30]">Tagline
                  <input value={settingsDraft.tagline} onChange={(event) => updateSetting('tagline', event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[13px] font-semibold text-[#0b1c30]">Hero Title
                  <input value={settingsDraft.heroTitle} onChange={(event) => updateSetting('heroTitle', event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[13px] font-semibold text-[#0b1c30]">Hero Tagline
                  <input value={settingsDraft.heroSubtitle} onChange={(event) => updateSetting('heroSubtitle', event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="md:col-span-2 text-[13px] font-semibold text-[#0b1c30]">Hero Description
                  <textarea rows={3} value={settingsDraft.heroDescription} onChange={(event) => updateSetting('heroDescription', event.target.value)} className="mt-1 w-full p-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <div className="md:col-span-2">
                  <ImageUploadField
                    label="Hero Banners"
                    helperText="Upload one or more images; the storefront displays them as selectable banners."
                    images={settingsDraft.heroBanners.map((src, index) => ({ src, label: `Hero banner ${index + 1}`, alt: `${settingsDraft.brandName} hero banner ${index + 1}` }))}
                    onChange={(images) => updateSetting('heroBanners', images.map((image) => image.src))}
                    multiple
                  />
                </div>
                <label className="md:col-span-2 text-[13px] font-semibold text-[#0b1c30]">Business Description & Key Products
                  <textarea rows={5} value={settingsDraft.footerDescription} onChange={(event) => updateSetting('footerDescription', event.target.value)} className="mt-1 w-full p-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[13px] font-semibold text-[#0b1c30]">Core Values
                  <input value={settingsDraft.footerTrustText} onChange={(event) => updateSetting('footerTrustText', event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[13px] font-semibold text-[#0b1c30]">Outlet Address
                  <input value={settingsDraft.footerLocation} onChange={(event) => updateSetting('footerLocation', event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="md:col-span-2 text-[13px] font-semibold text-[#0b1c30]">Business Hours
                  <textarea rows={2} value={settingsDraft.storeHours} onChange={(event) => updateSetting('storeHours', event.target.value)} className="mt-1 w-full p-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="md:col-span-2 text-[13px] font-semibold text-[#0b1c30]">Footer Copyright Text
                  <input value={settingsDraft.footerCopyright} onChange={(event) => updateSetting('footerCopyright', event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
              </fieldset>
              {isProcessingLogo && <p role="status" className="text-[12px] text-[#565e74]">Preparing logo image…</p>}
              <p className="border-t border-[#e2e8f0] pt-4 text-[12px] text-[#565e74]">Settings are drafts. Use the global Save Changes bar to publish them.</p>
            </section>
          )}

          {activeAdminNav === 'user-management' && isOwner && (
            <section className="bg-white rounded-xl border border-[#e2e8f0] p-6 flex flex-col gap-6">
              <div>
                <h2 className="text-[20px] font-bold text-[#0b1c30]">Store Manager Accounts</h2>
                <p className="text-[13px] text-[#565e74] mt-1">Managers can manage inventory and view orders, but cannot edit site settings or administer accounts.</p>
              </div>
              <form onSubmit={handleAddManager} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <label className="text-[13px] font-semibold text-[#0b1c30]">Username / Email
                  <input required type="email" autoComplete="username" value={managerEmail} onChange={(event) => setManagerEmail(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[13px] font-semibold text-[#0b1c30]">Temporary Password
                  <input required minLength={12} type="password" autoComplete="new-password" value={managerInitialPassword} onChange={(event) => setManagerInitialPassword(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <button disabled={isSavingUser} type="submit" className="h-10 px-4 rounded-lg bg-[#004ac6] text-white text-[13px] font-semibold disabled:opacity-60">Add Store Manager</button>
                {userManagementError && <p role="alert" className="md:col-span-3 text-[12px] text-[#ba1a1a]">{userManagementError}</p>}
              </form>
              <div className="overflow-x-auto border border-[#e2e8f0] rounded-lg">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-[#eff4ff] text-[#434655]"><tr><th className="p-3 font-semibold">Username / Email</th><th className="p-3 font-semibold">Role</th><th className="p-3 font-semibold text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-[#eff4ff]">
                    {users.filter((user) => user.role === 'manager').map((user) => (
                      <tr key={user.id}>
                        <td className="p-3 font-medium text-[#0b1c30]">{user.email}</td>
                        <td className="p-3 text-[#565e74]">Store Manager</td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { setPasswordTarget({ type: 'manager', userId: user.id }); setPasswordError(''); }} className="px-3 py-1.5 rounded bg-[#eff4ff] text-[#004ac6] font-semibold">Reset Password</button>
                            <button onClick={() => void handleRemoveManager(user.id)} className="px-3 py-1.5 rounded bg-[#fff0ee] text-[#ba1a1a] font-semibold">Remove</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.every((user) => user.role !== 'manager') && <tr><td colSpan={3} className="p-6 text-center text-[#565e74]">No Store Managers have been added.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeAdminNav === 'orders' && (
            <section className="bg-white rounded-xl border border-[#e2e8f0] p-8">
              <h2 className="text-[20px] font-bold text-[#0b1c30]">Orders &amp; Cash on Delivery</h2>
              <p className="text-[13px] text-[#565e74] mt-2">No order records are connected to this browser-only dashboard yet.</p>
            </section>
          )}

          {activeAdminNav === 'happy-customers' && (
            <section className="bg-white rounded-xl border border-[#e2e8f0] p-6 flex flex-col gap-6">
              <div>
                <h2 className="text-[20px] font-bold text-[#0b1c30]">Add a delivery story</h2>
                <p className="text-[13px] text-[#565e74] mt-1">New stories appear first in the home page showcase.</p>
              </div>
              <form onSubmit={handleAddHappyCustomer} className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                <ImageUploadField
                  label="Customer Photo"
                  helperText="Upload a delivery photo in JPG, PNG, WEBP, or SVG format."
                  images={happyCustomerImage}
                  onChange={setHappyCustomerImage}
                  onProcessingChange={setIsReadingImages}
                />
                <div className="flex flex-col gap-4">
                  <label className="text-[13px] font-semibold text-[#0b1c30]">Customer Name
                    <input required value={happyCustomerName} onChange={(event) => setHappyCustomerName(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                  </label>
                  <label className="text-[13px] font-semibold text-[#0b1c30]">Purchased Phone Model
                    <input required list="happy-customer-products" value={happyCustomerModel} onChange={(event) => setHappyCustomerModel(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                    <datalist id="happy-customer-products">{products.map((product) => <option key={product.id} value={product.model} />)}</datalist>
                  </label>
                  <fieldset>
                    <legend className="text-[13px] font-semibold text-[#0b1c30]">Rating</legend>
                    <div className="flex items-center gap-1 mt-1" role="radiogroup" aria-label="Customer rating">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button key={rating} type="button" role="radio" aria-checked={happyCustomerRating === rating} aria-label={`${rating} star${rating === 1 ? '' : 's'}`} onClick={() => setHappyCustomerRating(rating as HappyCustomer['rating'])} className={`p-1 ${rating <= happyCustomerRating ? 'text-[#d68b00]' : 'text-[#c3c6d7]'}`}>
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <label className="text-[13px] font-semibold text-[#0b1c30]">Review / Feedback
                    <textarea required maxLength={400} rows={3} value={happyCustomerReview} onChange={(event) => setHappyCustomerReview(event.target.value)} className="mt-1 w-full p-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                  </label>
                  {happyCustomerError && <p role="alert" className="text-[12px] text-[#ba1a1a]">{happyCustomerError}</p>}
                  <button disabled={isReadingImages} type="submit" className="self-start px-5 py-2.5 rounded-lg bg-[#004ac6] text-white text-[13px] font-semibold disabled:opacity-60">
                    {isReadingImages ? 'Preparing photo...' : 'Publish Customer Story'}
                  </button>
                </div>
              </form>
              <div>
                <h2 className="text-[18px] font-bold text-[#0b1c30] mb-3">Published stories ({happyCustomers.length})</h2>
                {happyCustomers.length === 0 ? (
                  <p className="rounded-lg bg-[#f8f9ff] p-6 text-center text-[13px] text-[#565e74]">No customer delivery stories yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...happyCustomers].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)).map((customer) => (
                      <article key={customer.id} className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white">
                        <img src={customer.image} alt={`${customer.customerName} with ${customer.phoneModel}`} className="h-44 w-full object-cover bg-[#eff4ff]" />
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div><h3 className="font-bold text-[#0b1c30]">{customer.customerName}</h3><p className="text-[12px] text-[#565e74]">{customer.phoneModel}</p></div>
                            <span className="text-[11px] text-[#565e74]">{new Date(customer.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center text-[#d68b00] mt-2" aria-label={`${customer.rating} out of 5 stars`}>
                            {Array.from({ length: customer.rating }, (_, index) => <span key={index} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                          </div>
                          <p className="text-[13px] text-[#434655] mt-2 line-clamp-3">{customer.review}</p>
                          <button onClick={() => onDeleteHappyCustomer(customer.id)} className="mt-3 text-[12px] font-semibold text-[#ba1a1a] hover:underline">Remove story</button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 4 KPI Summary Cards */}
          <div hidden={activeAdminNav === 'settings' || activeAdminNav === 'user-management' || activeAdminNav === 'orders' || activeAdminNav === 'happy-customers'} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* KPI 1 */}
            <div className="bg-white p-6 rounded-xl shadow-xs border border-[#e2e8f0] flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] uppercase tracking-wider text-[#434655] font-bold">
                  Active Stock Level
                </span>
                <span className="p-2 rounded-lg bg-[#eff4ff] text-[#004ac6]">
                  <span className="material-symbols-outlined text-[20px]">warehouse</span>
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-bold text-[#0b1c30]">
                    {products.reduce((acc, p) => acc + p.stock, 0)}
                  </span>
                  <span className="text-[13px] text-[#434655]">Devices in Vault</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[13px]">
                  <span className="text-[#434655]">Asset Value:</span>
                  <span className="text-[14px] text-[#0b1c30] font-bold">
                    ৳
                    {products
                      .reduce((acc, p) => acc + p.basePrice * p.stock, 0)
                      .toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <div className="w-full bg-[#eff4ff] h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-[#004ac6] h-full rounded-full" style={{ width: '78%' }}></div>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white p-6 rounded-xl shadow-xs border border-[#e2e8f0] flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] uppercase tracking-wider text-[#434655] font-bold">
                  Inquiries Today
                </span>
                <span className="p-2 rounded-lg bg-[#eff4ff] text-[#006242]">
                  <span className="material-symbols-outlined text-[20px]">mark_chat_unread</span>
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-bold text-[#0b1c30]">19</span>
                  <span className="text-[13px] text-[#006242] font-semibold">WhatsApp Leads</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[13px]">
                  <span className="text-[#434655]">Converted to Deal:</span>
                  <span className="text-[13px] text-[#006242] font-bold">8 Confirmed (42.1%)</span>
                </div>
              </div>
              <div className="w-full bg-[#eff4ff] h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-[#006242] h-full rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white p-6 rounded-xl shadow-xs border border-[#e2e8f0] flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] uppercase tracking-wider text-[#ba1a1a] font-bold">
                  Low Stock Alerts
                </span>
                <span className="p-2 rounded-lg bg-[#ffdad6]/50 text-[#ba1a1a]">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-bold text-[#ba1a1a]">
                    {products.filter((p) => p.stock <= 2).length}
                  </span>
                  <span className="text-[13px] text-[#434655]">Critical SKUs</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[13px]">
                  <span className="text-[#434655]">Replenish Action:</span>
                  <span className="text-[13px] text-[#ba1a1a] font-semibold">Need PO in 48h</span>
                </div>
              </div>
              <div className="w-full bg-[#eff4ff] h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-[#ba1a1a] h-full rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white p-6 rounded-xl shadow-xs border border-[#e2e8f0] flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] uppercase tracking-wider text-[#434655] font-bold">
                  Pre-Owned Inventory
                </span>
                <span className="p-2 rounded-lg bg-[#eff4ff] text-[#565e74]">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-bold text-[#0b1c30]">
                    {products.filter((p) => p.condition.includes('Pre-Owned')).length}
                  </span>
                  <span className="text-[13px] text-[#434655]">Graded Handsets</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[13px]">
                  <span className="text-[#434655]">Avg Tested Health:</span>
                  <span className="text-[13px] text-[#0b1c30] font-bold">94% Battery</span>
                </div>
              </div>
              <div className="w-full bg-[#eff4ff] h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-[#565e74] h-full rounded-full" style={{ width: '94%' }}></div>
              </div>
            </div>
          </div>

          {/* Interactive Inventory Table */}
          <div hidden={activeAdminNav === 'settings' || activeAdminNav === 'user-management' || activeAdminNav === 'orders' || activeAdminNav === 'happy-customers'} className="bg-white rounded-xl shadow-xs border border-[#e2e8f0] flex flex-col overflow-hidden">
            {/* Filter Bar */}
            <div className="p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#eff4ff]">
              <div className="flex items-center gap-3 flex-1 max-w-lg">
                <div className="relative w-full">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#434655] text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search by model, IMEI, SKU code, or storage variant..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#eff4ff] rounded-lg text-[#0b1c30] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#004ac6]/30 border border-[#e2e8f0]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center bg-[#eff4ff] rounded-lg p-1 border border-[#e2e8f0]">
                  {(['All', 'Brand New', 'Pre-Owned', 'Refurbished'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setConditionFilter(tab)}
                      className={`px-3 py-1.5 rounded text-[13px] font-semibold transition-all cursor-pointer ${
                        conditionFilter === tab
                          ? 'bg-white text-[#0b1c30] shadow-xs'
                          : 'text-[#434655] hover:text-[#0b1c30]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSearchFilter('')}
                  className="p-2.5 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#434655] border border-[#e2e8f0]"
                  title="Filter options"
                >
                  <span className="material-symbols-outlined text-[20px]">filter_list</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#eff4ff]/60 text-[#434655] text-[11px] uppercase tracking-wider border-b border-[#eff4ff]">
                    <th className="py-4 px-6 font-semibold">Device &amp; Model</th>
                    <th className="py-4 px-4 font-semibold">Condition</th>
                    <th className="py-4 px-4 font-semibold">Variant / Specs</th>
                    <th className="py-4 px-4 font-semibold">Unit Price</th>
                    <th className="py-4 px-4 font-semibold">Stock Qty</th>
                    <th className="py-4 px-4 font-semibold">BATTERY</th>
                    <th className="py-4 px-4 font-semibold">Status</th>
                    <th className="py-4 px-6 font-semibold text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eff4ff] text-[13px] text-[#0b1c30]">
                  {filteredInventory.map((phone) => (
                    <tr key={phone.id} className="hover:bg-[#f8f9ff] transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-lg bg-[#eff4ff] p-1.5 flex items-center justify-center shrink-0 border border-[#e2e8f0]">
                            <img
                              className="w-full h-full object-contain"
                              alt={phone.title}
                              src={phone.imageUrl || phone.gallery.find((image) => image.isPrimary)?.src || phone.gallery[0]?.src || ''}
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[15px] text-[#0b1c30] font-bold tracking-tight">
                              {phone.model}
                            </span>
                            <span className="text-[#434655] text-[11px] font-mono">
                              SKU: {phone.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            phone.condition.includes('Brand New')
                              ? 'bg-[#dbe1ff] text-[#00174b]'
                              : phone.condition.includes('Refurbished')
                              ? 'bg-[#dce9ff] text-[#0b1c30]'
                              : 'bg-[#dae2fd] text-[#131b2e]'
                          }`}
                        >
                          {phone.condition}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium text-[#0b1c30]">
                            {phone.storages[0]?.capacity} • {phone.colors[0]?.name}
                          </span>
                          <span className="text-[#434655] text-[12px]">
                            {phone.regionVariantBadge} ({phone.regionCountryCode})
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="text-[16px] font-bold text-[#0b1c30]">
                            ৳ {phone.basePrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[#434655] text-[11px] font-mono">
                            Cost: ৳{phone.costPrice.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-2 bg-[#eff4ff] px-2.5 py-1 rounded-lg border border-[#e2e8f0]">
                          <button
                            onClick={() => onUpdateProductStock(phone.id, -1)}
                            className="text-[#434655] hover:text-[#0b1c30] font-bold text-base leading-none px-1 cursor-pointer"
                          >
                            −
                          </button>
                          <span className="text-[13px] font-bold w-4 text-center">{phone.stock}</span>
                          <button
                            onClick={() => onUpdateProductStock(phone.id, 1)}
                            className="text-[#434655] hover:text-[#0b1c30] font-bold text-base leading-none px-1 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {(phone.batteryHealth ?? (phone.condition === 'Brand New' ? 100 : undefined)) !== undefined ? (
                          <span className="inline-flex items-center gap-1 text-[#006242] font-semibold text-[13px]">
                            <span className="material-symbols-outlined text-[16px]">
                              battery_charging_full
                            </span>
                            {phone.batteryHealth ?? 100}%
                          </span>
                        ) : (
                          <span className="text-[#434655] font-mono text-[12px]">Not recorded</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {phone.stock <= 2 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ffdad6]/40 text-[#ba1a1a] text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] animate-ping"></span>
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#bdffdb]/40 text-[#006242] text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#006242]"></span>
                            In Stock
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(phone)}
                            className="p-2 rounded-lg hover:bg-[#eff4ff] text-[#434655] hover:text-[#004ac6] transition-colors cursor-pointer"
                            title="Edit Pricing & Stock"
                          >
                            <span className="material-symbols-outlined text-[19px]">edit</span>
                          </button>
                          <button
                            onClick={() => onSelectProduct(phone.id)}
                            className="p-2 rounded-lg hover:bg-[#eff4ff] text-[#434655] hover:text-[#0b1c30] transition-colors cursor-pointer"
                            title="View Public Catalog"
                          >
                            <span className="material-symbols-outlined text-[19px]">open_in_new</span>
                          </button>
                          <button
                            onClick={() => {
                              onDeleteProduct(phone.id);
                              onToast(`Archived ${phone.model}`);
                            }}
                            className="p-2 rounded-lg hover:bg-[#eff4ff] text-[#434655] hover:text-[#ba1a1a] transition-colors cursor-pointer"
                            title="Archive SKU"
                          >
                            <span className="material-symbols-outlined text-[19px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination & Table Footer */}
            <div className="p-4 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[#434655] border-t border-[#eff4ff]">
              <span>
                Showing <strong className="text-[#0b1c30]">1 - {filteredInventory.length}</strong> of{' '}
                <strong>42</strong> verified devices across Rajshahi Hub
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled
                  className="px-3 py-1.5 rounded bg-[#eff4ff] text-[#434655] text-[12px] font-medium disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 rounded bg-[#004ac6] text-white text-[12px] font-bold">
                  1
                </span>
                <button className="px-3 py-1.5 rounded bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff] text-[12px] font-medium">
                  2
                </button>
                <button className="px-3 py-1.5 rounded bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff] text-[12px] font-medium">
                  3
                </button>
                <button className="px-3 py-1.5 rounded bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff] text-[12px] font-medium">
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Recent WhatsApp Customer Inquiries Panel */}
          <div hidden={activeAdminNav === 'settings' || activeAdminNav === 'user-management' || activeAdminNav === 'orders' || activeAdminNav === 'happy-customers'} className="bg-white rounded-xl shadow-xs border border-[#e2e8f0] p-6 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#bdffdb]/40 text-[#006242]">
                  <span className="material-symbols-outlined text-[24px]">chat</span>
                </div>
                <div>
                  <h2 className="text-[20px] font-bold text-[#0b1c30] tracking-tight">
                    Recent WhatsApp Customer Inquiries
                  </h2>
                  <p className="text-[13px] text-[#434655]">
                    Live lead synchronization via Rajshahi Omar Plaza customer desk
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eff4ff] text-[#0b1c30] text-[11px] font-semibold border border-[#e2e8f0]">
                  <span className="w-2 h-2 rounded-full bg-[#006242]"></span>
                  Sync Active (Webhook: Port 8443)
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-[13px] font-medium">
                  View All ({leads.length})
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#eff4ff]/60 text-[#434655] text-[11px] uppercase tracking-wider border-b border-[#eff4ff]">
                    <th className="py-3 px-4 font-semibold">Customer</th>
                    <th className="py-3 px-4 font-semibold">Inquired Device &amp; Variant</th>
                    <th className="py-3 px-4 font-semibold">Reference ID</th>
                    <th className="py-3 px-4 font-semibold">Lead Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Direct Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eff4ff] text-[13px]">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#f8f9ff] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#0b1c30]">{lead.customerName}</span>
                          <span className="text-[#434655] font-mono text-[12px]">{lead.phone}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-[#0b1c30] font-medium">{lead.device}</span>
                          <span className="text-[#434655] text-[12px]">{lead.variant}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] text-[#434655] bg-[#eff4ff] px-2 py-0.5 rounded border border-[#e2e8f0]">
                          {lead.referenceId}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            lead.leadStatus.includes('Confirmed')
                              ? 'bg-[#bdffdb]/50 text-[#006242]'
                              : lead.leadStatus.includes('Contacted')
                              ? 'bg-[#dbe1ff] text-[#004ac6]'
                              : 'bg-[#eff4ff] text-[#434655]'
                          }`}
                        >
                          {lead.leadStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <a
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#006242] hover:bg-[#007d55] text-white text-[12px] font-semibold transition-all shadow-xs"
                          href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(
                            lead.customerName
                          )},%20regarding%20your%20inquiry%20${lead.referenceId}%20for%20${encodeURIComponent(
                            lead.device
                          )}...`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="material-symbols-outlined text-[16px]">forum</span>
                          <span>Open WhatsApp</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Slide-Over Modal: Quick Stock & Price Update */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#0b1c30]/40 backdrop-blur-xs transition-opacity duration-200">
          <div className="w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col justify-between p-6 overflow-y-auto border-l border-[#e2e8f0]">
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#eff4ff]">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-wider text-[#004ac6] font-bold">
                    Fast DB Sync
                  </span>
                  <h3 className="text-[20px] text-[#0b1c30] font-bold">
                    Edit Product
                  </h3>
                </div>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="p-2 rounded-lg hover:bg-[#eff4ff] text-[#434655] hover:text-[#0b1c30]"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Sync Indicator */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#bdffdb]/40 text-[#006242] text-[13px] border border-[#007d55]/20 font-medium">
                <span className="material-symbols-outlined text-[18px]">cloud_sync</span>
                <span>
                  Instant commit to <strong>public.store_variants</strong> table
                </span>
              </div>

              {/* Target Info */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-[#e2e8f0] p-4">
                <label className="text-[12px] font-semibold text-[#0b1c30]">Product Title
                  <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[12px] font-semibold text-[#0b1c30]">Catalog Model
                  <input value={editModel} onChange={(event) => setEditModel(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[12px] font-semibold text-[#0b1c30]">Brand
                  <input value={editBrand} onChange={(event) => setEditBrand(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[12px] font-semibold text-[#0b1c30]">Series
                  <input value={editSeries} onChange={(event) => setEditSeries(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[12px] font-semibold text-[#0b1c30]">Condition
                  <select value={editCondition} onChange={(event) => {
                    const condition = event.target.value as Product['condition'];
                    setEditCondition(condition);
                    if (condition !== 'Brand New' && editCondition === 'Brand New') {
                      setEditVariants((current) => current.map((variant) => ({ ...variant, batteryHealth: undefined })));
                    } else if (condition === 'Brand New') {
                      setEditVariants((current) => current.map((variant) => ({ ...variant, batteryHealth: variant.batteryHealth ?? 100 })));
                    }
                  }} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal">
                    <option value="Brand New">Brand New (Sealed Pack)</option>
                    <option value="Pre-Owned (Like New 99%)">Pre-Owned (Like New 99%)</option>
                    <option value="Pre-Owned (Like New 98%)">Pre-Owned (Like New 98%)</option>
                    <option value="Official Refurbished">Official Refurbished</option>
                  </select>
                </label>
                <label className="text-[12px] font-semibold text-[#0b1c30]">Model Identifier
                  <input value={editModelIdentifier} onChange={(event) => setEditModelIdentifier(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[12px] font-semibold text-[#0b1c30]">SKU
                  <input value={editSku} onChange={(event) => setEditSku(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[12px] font-semibold text-[#0b1c30]">Region Variant Tag
                  <input value={editRegionVariantBadge} onChange={(event) => setEditRegionVariantBadge(event.target.value)} placeholder="HK ZA/A Dual Nano SIM" className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[12px] font-semibold text-[#0b1c30]">Region / Model Code
                  <input value={editRegionCountryCode} onChange={(event) => setEditRegionCountryCode(event.target.value)} placeholder="USA LL/A" className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[12px] font-semibold text-[#0b1c30]">Stock Location
                  <input value={editStockLocation} onChange={(event) => setEditStockLocation(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="md:col-span-2 text-[12px] font-semibold text-[#0b1c30]">Product Description
                  <textarea rows={3} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className="mt-1 w-full p-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[12px] font-semibold text-[#0b1c30]">Weight / Specifications Summary
                  <input value={editWeightSpecifications} onChange={(event) => setEditWeightSpecifications(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="text-[12px] font-semibold text-[#0b1c30]">Cost Price (৳)
                  <input type="number" min="0" value={editCostPrice} onChange={(event) => setEditCostPrice(Number(event.target.value))} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
              </section>

              <section className="space-y-3">
                <h4 className="text-[13px] font-bold text-[#0b1c30]">SIM / eSIM Options</h4>
                {editSimVariants.map((sim, index) => (
                  <div key={`edit-sim-${index}`} className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-lg border border-[#e2e8f0] p-3">
                    <input value={sim.name} onChange={(event) => setEditSimVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="Option name (e.g. USA Dual eSIM)" aria-label="SIM option name" className="h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0]" />
                    <input value={sim.subtitle} onChange={(event) => setEditSimVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, subtitle: event.target.value } : item))} placeholder="SIM details" aria-label="SIM option details" className="h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0]" />
                    <input type="number" value={sim.surcharge} onChange={(event) => setEditSimVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, surcharge: Number(event.target.value) } : item))} aria-label="SIM option price adjustment" className="h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0]" />
                  </div>
                ))}
                <button type="button" onClick={() => setEditSimVariants((current) => [...current, { name: '', subtitle: '', surcharge: 0 }])} className="px-3 py-2 rounded-lg bg-[#e5eeff] text-[#004ac6] text-[12px] font-semibold">Add SIM Option</button>
              </section>

              <ImageUploadField
                label="Product Gallery & Cover Photo"
                helperText="Upload images, remove old photos, or set any thumbnail as the storefront cover."
                images={editGallery}
                onChange={setEditGallery}
                multiple
                showPrimary
                primaryIndex={editPrimaryImageIndex}
                onPrimaryChange={setEditPrimaryImageIndex}
                onProcessingChange={setIsReadingImages}
              />

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[13px] font-bold text-[#0b1c30]">Color, RAM &amp; ROM variants</h4>
                    {!editingProduct.variants?.length && <p className="text-[11px] text-[#565e74]">This legacy product's current stock is assigned to its first combination; allocate it across the combinations below.</p>}
                  </div>
                  <button type="button" onClick={() => setEditVariants((variants) => [...variants, { id: `${editingProduct.id}-variant-${Date.now()}`, ram: '8GB', storage: '256GB', color: '', colorHex: '#8a8984', price: editPrice, originalPrice: editVariants[0]?.originalPrice ?? editPrice, costPrice: editCostPrice, stock: 0, batteryHealth: editCondition === 'Brand New' ? 100 : undefined }])} className="px-3 py-2 rounded-lg bg-[#e5eeff] text-[#004ac6] text-[12px] font-semibold">Add Variant</button>
                </div>
                {editVariants.map((variant) => (
                  <div key={variant.id} className="grid grid-cols-2 md:grid-cols-4 gap-2 rounded-lg border border-[#e2e8f0] p-3">
                    <label className="text-[11px] font-semibold text-[#0b1c30]">RAM
                      <input value={variant.ram} onChange={(event) => setEditVariants((current) => current.map((item) => item.id === variant.id ? { ...item, ram: event.target.value } : item))} className="mt-1 w-full h-9 px-2 rounded bg-[#eff4ff] border border-[#e2e8f0]" />
                    </label>
                    <label className="text-[11px] font-semibold text-[#0b1c30]">ROM / Storage
                      <input value={variant.storage} onChange={(event) => setEditVariants((current) => current.map((item) => item.id === variant.id ? { ...item, storage: event.target.value } : item))} className="mt-1 w-full h-9 px-2 rounded bg-[#eff4ff] border border-[#e2e8f0]" />
                    </label>
                    <label className="text-[11px] font-semibold text-[#0b1c30]">Color
                      <input value={variant.color} onChange={(event) => setEditVariants((current) => current.map((item) => item.id === variant.id ? { ...item, color: event.target.value } : item))} className="mt-1 w-full h-9 px-2 rounded bg-[#eff4ff] border border-[#e2e8f0]" />
                    </label>
                    <label className="text-[11px] font-semibold text-[#0b1c30]">Color Swatch
                      <input type="color" value={variant.colorHex} onChange={(event) => setEditVariants((current) => current.map((item) => item.id === variant.id ? { ...item, colorHex: event.target.value } : item))} className="mt-1 w-full h-9 p-1 rounded bg-[#eff4ff] border border-[#e2e8f0]" />
                    </label>
                    <label className="text-[11px] font-semibold text-[#0b1c30]">Discounted Price (৳)
                      <input type="number" min="0" value={variant.price} onChange={(event) => setEditVariants((current) => current.map((item) => item.id === variant.id ? { ...item, price: Number(event.target.value) } : item))} className="mt-1 w-full h-9 px-2 rounded bg-[#eff4ff] border border-[#e2e8f0]" />
                    </label>
                    <label className="text-[11px] font-semibold text-[#0b1c30]">Original Price (৳)
                      <input type="number" min="0" value={variant.originalPrice ?? variant.price} onChange={(event) => setEditVariants((current) => current.map((item) => item.id === variant.id ? { ...item, originalPrice: Number(event.target.value) } : item))} className="mt-1 w-full h-9 px-2 rounded bg-[#eff4ff] border border-[#e2e8f0]" />
                    </label>
                    <label className="text-[11px] font-semibold text-[#0b1c30]">Cost Price (৳)
                      <input type="number" min="0" value={variant.costPrice ?? editCostPrice} onChange={(event) => updateEditVariant(variant.id, { costPrice: Number(event.target.value) })} className="mt-1 w-full h-9 px-2 rounded bg-[#eff4ff] border border-[#e2e8f0]" />
                    </label>
                    <label className="text-[11px] font-semibold text-[#0b1c30]">Stock
                      <input type="number" min="0" value={variant.stock} onChange={(event) => setEditVariants((current) => current.map((item) => item.id === variant.id ? { ...item, stock: Number(event.target.value) } : item))} className="mt-1 w-full h-9 px-2 rounded bg-[#eff4ff] border border-[#e2e8f0]" />
                    </label>
                    <label className="text-[11px] font-semibold text-[#0b1c30]">Battery Health (%)
                      <input type="number" min="0" max="100" value={variant.batteryHealth ?? ''} onChange={(event) => updateEditVariant(variant.id, { batteryHealth: event.target.value === '' ? undefined : Number(event.target.value) })} placeholder={editCondition === 'Brand New' ? '100' : 'e.g. 89'} className="mt-1 w-full h-9 px-2 rounded bg-[#eff4ff] border border-[#e2e8f0]" />
                    </label>
                    <button type="button" onClick={() => setEditVariants((current) => current.filter((item) => item.id !== variant.id))} className="self-end h-9 rounded bg-[#fff0ee] text-[#ba1a1a] text-[11px] font-semibold">Remove Variant</button>
                    <div className="col-span-2 md:col-span-4">
                      <ImageUploadField
                        label={`${variant.color || 'Variant'} image`}
                        images={variant.imageUrl ? [{ src: variant.imageUrl, label: `${variant.color} ${variant.ram} ${variant.storage}`, alt: `${variant.color} variant` }] : []}
                        onChange={(images) => setEditVariants((current) => current.map((item) => item.id === variant.id ? { ...item, imageUrl: images[0]?.src } : item))}
                        onProcessingChange={setIsReadingImages}
                      />
                    </div>
                  </div>
                ))}
              </section>

              <section className="space-y-3">
                <h4 className="text-[13px] font-bold text-[#0b1c30]">Technical specifications</h4>
                {renderTechnicalSpecSection(editTechnicalSpecs, updateEditTechnicalSpec, 'display', 'Display & Finish', [
                  { key: 'screenSize', label: 'Screen Size' },
                  { key: 'resolution', label: 'Resolution' },
                  { key: 'refreshRate', label: 'Refresh Rate' },
                  { key: 'peakBrightness', label: 'Peak Brightness' },
                  { key: 'chassisMaterial', label: 'Material' },
                ])}
                {renderTechnicalSpecSection(editTechnicalSpecs, updateEditTechnicalSpec, 'camera', 'Pro Camera System', [
                  { key: 'primary', label: 'Primary' },
                  { key: 'ultraWide', label: 'Ultra Wide' },
                  { key: 'telephoto', label: 'Telephoto' },
                  { key: 'cameraControl', label: 'Camera Control' },
                  { key: 'videoRecording', label: 'Video Recording' },
                ])}
                {renderTechnicalSpecSection(editTechnicalSpecs, updateEditTechnicalSpec, 'performance', 'Processor & Intelligence', [
                  { key: 'chipset', label: 'Chipset' },
                  { key: 'cpuCores', label: 'CPU Cores' },
                  { key: 'gpuCores', label: 'GPU Cores' },
                  { key: 'neuralEngine', label: 'Neural Engine' },
                  { key: 'ram', label: 'RAM' },
                ])}
                {renderTechnicalSpecSection(editTechnicalSpecs, updateEditTechnicalSpec, 'battery', 'Battery & Fast Charge', [
                  { key: 'playback', label: 'Video Playback' },
                  { key: 'port', label: 'Port' },
                  { key: 'wireless', label: 'Wireless' },
                  { key: 'wired', label: 'Charging Speed' },
                ])}
                {renderTechnicalSpecSection(editTechnicalSpecs, updateEditTechnicalSpec, 'box', 'Retail Box & Policy', [
                  { key: 'inTheBox', label: 'In The Box' },
                  { key: 'warranty', label: 'Warranty' },
                  { key: 'replacement', label: 'Replacement Window' },
                  { key: 'inspection', label: 'Physical Inspection' },
                ])}
                {renderTechnicalSpecSection(editTechnicalSpecs, updateEditTechnicalSpec, 'compliance', 'BTRC & Legal Standards', [
                  { key: 'imeiWhitelisting', label: 'IMEI Whitelisting' },
                  { key: 'cellular5G', label: '5G Bands' },
                  { key: 'esimOperators', label: 'eSIM' },
                  { key: 'invoiceType', label: 'Invoice Type' },
                ])}
              </section>
              {editSaveError && <p role="alert" className="text-[12px] text-[#ba1a1a]">{editSaveError}</p>}

              {/* Form Fields */}
              <div className="flex flex-col gap-4">
                <div hidden={editVariants.length > 0} className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-[#0b1c30]">
                    Customer Retail Price (BDT ৳)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[#434655]">
                      ৳
                    </span>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(Number(e.target.value))}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-[14px] font-semibold focus:bg-white focus:ring-2 focus:ring-[#004ac6] focus:outline-none border border-[#e2e8f0]"
                    />
                  </div>
                  <span className="text-[11px] text-[#434655]">
                    Standard pricing threshold for Rajshahi retail desk
                  </span>
                </div>

                <div hidden={editVariants.length > 0} className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-[#0b1c30]">
                    Physical Units in Vault
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={editStock}
                      onChange={(e) => setEditStock(Math.max(0, Number(e.target.value)))}
                      className="w-full px-4 py-2.5 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-[14px] font-semibold focus:bg-white focus:ring-2 focus:ring-[#004ac6] focus:outline-none border border-[#e2e8f0]"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditStock((s) => Math.max(0, s - 1))}
                        className="w-10 h-10 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] font-bold text-lg text-[#0b1c30] flex items-center justify-center border border-[#e2e8f0]"
                      >
                        −
                      </button>
                      <button
                        onClick={() => setEditStock((s) => s + 1)}
                        className="w-10 h-10 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] font-bold text-lg text-[#0b1c30] flex items-center justify-center border border-[#e2e8f0]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-[#0b1c30]">
                    Inventory Status Override
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#004ac6] border border-[#e2e8f0]"
                  >
                    <option value="in_stock">In Stock (Publicly Available)</option>
                    <option value="low_stock">Low Stock Warning</option>
                    <option value="reserved">Reserved / Customer Token Held</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-[#0b1c30]">
                    Auditor Note (Internal)
                  </label>
                  <textarea
                    rows={2}
                    value={editAuditorNote}
                    onChange={(e) => setEditAuditorNote(e.target.value)}
                    placeholder="e.g. Received shipment batch B-90 from Dhaka HQ via Sundarban Courier"
                    className="w-full p-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#004ac6] border border-[#e2e8f0]"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-6 border-t border-[#eff4ff]">
              <button
                onClick={() => setEditingProduct(null)}
                className="w-1/2 py-2.5 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[13px] font-semibold transition-all border border-[#e2e8f0]"
              >
                Cancel
              </button>
              <button
                disabled={isSavingEdit}
                onClick={handleSaveEdit}
                className="w-1/2 py-2.5 rounded-lg bg-[#004ac6] hover:bg-[#2563eb] text-white text-[13px] font-semibold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">check</span>
                )}
                <span>{isSavingEdit ? 'Syncing...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Phone Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1c30]/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 border border-[#e2e8f0]">
            <div className="flex items-center justify-between pb-4 border-b border-[#eff4ff]">
              <div>
                <h3 className="text-[20px] font-bold text-[#0b1c30]">Add New Flagship SKU</h3>
                <p className="text-[12px] text-[#434655]">Register a new device into Rajshahi Hub Vault</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-lg hover:bg-[#eff4ff] text-[#434655]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateNewProduct} className="py-4 space-y-4 text-[13px]">
              <div className="grid grid-cols-2 gap-3">
                <SuggestionInput
                  label="Brand"
                  value={newBrand}
                  options={availableBrands}
                  createLabel="Add New Brand"
                  placeholder="Search or enter a brand"
                  required
                  onChange={setNewBrand}
                  onCreate={(brand) => { setNewBrand(brand); rememberBrandAndSeries(brand); }}
                />
                <SuggestionInput
                  label="Series"
                  value={newSeries}
                  options={availableSeries}
                  createLabel="Add New Series"
                  placeholder={newBrand.trim() ? `Search ${canonicalBrand} series` : 'Choose a brand first'}
                  required
                  onChange={setNewSeries}
                  onCreate={(series) => { setNewSeries(series); if (canonicalBrand) rememberBrandAndSeries(canonicalBrand, series); }}
                />
              </div>

              <div>
                <SuggestionInput
                  label="Device Model Title"
                  placeholder="e.g. iPhone 16 Plus or Galaxy S24+"
                  value={newModel}
                  options={availableModels}
                  createLabel="Use New Model"
                  required
                  onChange={setNewModel}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#0b1c30] block mb-1">Condition</label>
                  <select
                    value={newCondition}
                    onChange={(event) => {
                      const condition = event.target.value as Product['condition'];
                      setNewCondition(condition);
                      if (condition === 'Brand New') {
                        setNewVariants((current) => current.map((variant) => ({ ...variant, batteryHealth: variant.batteryHealth ?? 100 })));
                      } else if (newCondition === 'Brand New') {
                        setNewVariants((current) => current.map((variant) => ({ ...variant, batteryHealth: undefined })));
                      }
                    }}
                    className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0]"
                  >
                    <option value="Brand New">Brand New (Sealed Pack)</option>
                    <option value="Pre-Owned (Like New 99%)">Pre-Owned (Like New 99%)</option>
                    <option value="Pre-Owned (Like New 98%)">Pre-Owned (Like New 98%)</option>
                    <option value="Official Refurbished">Official Refurbished</option>
                  </select>
                </div>
              </div>
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="font-semibold text-[#0b1c30]">Model Identifier
                  <input value={newModelIdentifier} onChange={(event) => setNewModelIdentifier(event.target.value)} placeholder="e.g. A3296 / LL/A" className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="font-semibold text-[#0b1c30]">SKU
                  <input value={newSku} onChange={(event) => setNewSku(event.target.value)} placeholder="Auto-generated if blank" className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="font-semibold text-[#0b1c30]">Region Variant Tag
                  <input value={newRegionVariantBadge} onChange={(event) => setNewRegionVariantBadge(event.target.value)} placeholder="HK ZA/A Dual Nano SIM" className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="font-semibold text-[#0b1c30]">Region / Model Code
                  <input value={newRegionCountryCode} onChange={(event) => setNewRegionCountryCode(event.target.value)} placeholder="HK ZA/A" className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
                <label className="font-semibold text-[#0b1c30]">Stock Location
                  <input value={newStockLocation} onChange={(event) => setNewStockLocation(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                </label>
              </section>
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#0b1c30]">SIM / eSIM Options</h4>
                  <button type="button" onClick={() => setNewSimVariants((current) => [...current, { name: '', subtitle: '', surcharge: 0 }])} className="px-3 py-2 rounded-lg bg-[#e5eeff] text-[#004ac6] font-semibold">Add SIM Option</button>
                </div>
                {newSimVariants.map((sim, index) => (
                  <div key={`new-sim-${index}`} className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-lg border border-[#e2e8f0] p-3">
                    <input value={sim.name} onChange={(event) => setNewSimVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="Option name (e.g. HK Dual Nano SIM)" aria-label="SIM option name" className="h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0]" />
                    <input value={sim.subtitle} onChange={(event) => setNewSimVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, subtitle: event.target.value } : item))} placeholder="SIM details" aria-label="SIM option details" className="h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0]" />
                    <input type="number" value={sim.surcharge} onChange={(event) => setNewSimVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, surcharge: Number(event.target.value) } : item))} placeholder="Price adjustment" aria-label="SIM option price adjustment" className="h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0]" />
                  </div>
                ))}
              </section>
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-[#0b1c30]">Technical specifications</h4>
                    <p className="text-[11px] text-[#434655]">Review and customize model-specific details before publishing.</p>
                  </div>
                  <button
                    type="button"
                    onClick={autofillTechnicalSpecs}
                    className="shrink-0 px-3 py-2 rounded-lg bg-[#e5eeff] text-[#004ac6] font-semibold"
                  >
                    Auto-fill Default Spec Template
                  </button>
                </div>
                {renderTechnicalSpecSection(newTechnicalSpecs, updateTechnicalSpec, 'display', 'Display & Finish', [
                  { key: 'screenSize', label: 'Screen Size' },
                  { key: 'resolution', label: 'Resolution' },
                  { key: 'refreshRate', label: 'Refresh Rate' },
                  { key: 'peakBrightness', label: 'Peak Brightness' },
                  { key: 'chassisMaterial', label: 'Material' },
                ])}
                {renderTechnicalSpecSection(newTechnicalSpecs, updateTechnicalSpec, 'camera', 'Pro Camera System', [
                  { key: 'primary', label: 'Primary' },
                  { key: 'ultraWide', label: 'Ultra Wide' },
                  { key: 'telephoto', label: 'Telephoto' },
                  { key: 'cameraControl', label: 'Camera Control' },
                  { key: 'videoRecording', label: 'Video Recording' },
                ])}
                {renderTechnicalSpecSection(newTechnicalSpecs, updateTechnicalSpec, 'performance', 'Processor & Intelligence', [
                  { key: 'chipset', label: 'Chipset' },
                  { key: 'cpuCores', label: 'CPU Cores' },
                  { key: 'gpuCores', label: 'GPU Cores' },
                  { key: 'neuralEngine', label: 'Neural Engine' },
                  { key: 'ram', label: 'RAM' },
                ])}
                {renderTechnicalSpecSection(newTechnicalSpecs, updateTechnicalSpec, 'battery', 'Battery & Fast Charge', [
                  { key: 'playback', label: 'Video Playback' },
                  { key: 'port', label: 'Port' },
                  { key: 'wireless', label: 'Wireless' },
                  { key: 'wired', label: 'Charging Speed' },
                ])}
                {renderTechnicalSpecSection(newTechnicalSpecs, updateTechnicalSpec, 'box', 'Retail Box & Policy', [
                  { key: 'inTheBox', label: 'In The Box' },
                  { key: 'warranty', label: 'Warranty' },
                  { key: 'replacement', label: 'Replacement Window' },
                  { key: 'inspection', label: 'Physical Inspection' },
                ])}
                {renderTechnicalSpecSection(newTechnicalSpecs, updateTechnicalSpec, 'compliance', 'BTRC & Legal Standards', [
                  { key: 'imeiWhitelisting', label: 'IMEI Whitelisting' },
                  { key: 'cellular5G', label: '5G Bands' },
                  { key: 'esimOperators', label: 'eSIM' },
                  { key: 'invoiceType', label: 'Invoice Type' },
                ])}
              </section>
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[#0b1c30]">RAM, storage &amp; color variants</h4>
                    <p className="text-[11px] text-[#434655]">Add one row for each purchasable combination.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewVariants((current) => [...current, { id: `variant-${Date.now()}`, ram: '8GB', storage: '256GB', color: '', colorHex: '#8a8984', price: 150000, originalPrice: 150000, costPrice: 0, stock: 0, batteryHealth: newCondition === 'Brand New' ? 100 : undefined }])}
                    className="px-3 py-2 rounded-lg bg-[#e5eeff] text-[#004ac6] font-semibold"
                  >
                    Add Variant
                  </button>
                </div>
                {newVariants.map((variant, index) => (
                  <div key={variant.id} className="rounded-lg border border-[#e2e8f0] p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#0b1c30]">Variant {index + 1}</span>
                      {newVariants.length > 1 && (
                        <button type="button" onClick={() => setNewVariants((current) => current.filter((item) => item.id !== variant.id))} className="text-[#ba1a1a] font-semibold">Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="font-semibold text-[#0b1c30]">RAM
                        <input required value={variant.ram} onChange={(event) => updateVariant(variant.id, { ram: event.target.value })} placeholder="8GB" className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                      </label>
                      <label className="font-semibold text-[#0b1c30]">Storage / ROM
                        <input required value={variant.storage} onChange={(event) => updateVariant(variant.id, { storage: event.target.value })} placeholder="256GB" className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                      </label>
                      <label className="font-semibold text-[#0b1c30]">Color
                        <input required value={variant.color} onChange={(event) => updateVariant(variant.id, { color: event.target.value })} placeholder="Natural Titanium" className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                      </label>
                      <label className="font-semibold text-[#0b1c30]">Color Swatch
                        <input type="color" value={variant.colorHex} onChange={(event) => updateVariant(variant.id, { colorHex: event.target.value })} className="mt-1 w-full h-10 p-1 rounded-lg bg-[#eff4ff] border border-[#e2e8f0]" />
                      </label>
                      <label className="font-semibold text-[#0b1c30]">Price (৳)
                        <input required type="number" min="0" value={variant.price} onChange={(event) => updateVariant(variant.id, { price: Number(event.target.value) })} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                      </label>
                      <label className="font-semibold text-[#0b1c30]">Original Price (৳)
                        <input type="number" min="0" value={variant.originalPrice ?? variant.price} onChange={(event) => updateVariant(variant.id, { originalPrice: Number(event.target.value) })} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                      </label>
                      <label className="font-semibold text-[#0b1c30]">Cost Price (৳)
                        <input required type="number" min="0" value={variant.costPrice ?? ''} onChange={(event) => updateVariant(variant.id, { costPrice: Number(event.target.value) })} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                      </label>
                      <label className="font-semibold text-[#0b1c30]">Battery Health (%)
                        <input type="number" min="0" max="100" value={variant.batteryHealth ?? ''} onChange={(event) => updateVariant(variant.id, { batteryHealth: event.target.value === '' ? undefined : Number(event.target.value) })} placeholder={newCondition === 'Brand New' ? '100' : 'e.g. 89'} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                      </label>
                      <label className="font-semibold text-[#0b1c30]">Stock
                        <input required type="number" min="0" value={variant.stock} onChange={(event) => updateVariant(variant.id, { stock: Number(event.target.value) })} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
                      </label>
                      <div className="col-span-2">
                        <ImageUploadField
                          label="Variant image"
                          helperText="Optional; defaults to the primary gallery image."
                          images={variant.imageUrl ? [{ src: variant.imageUrl, label: `${variant.color} ${variant.ram} ${variant.storage}`, alt: `${variant.color} variant` }] : []}
                          onChange={(images) => updateVariant(variant.id, { imageUrl: images[0]?.src })}
                          onProcessingChange={setIsReadingImages}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </section>

              <ImageUploadField
                label="Product gallery"
                helperText="Upload several images and choose the cover photo used by product cards."
                images={enteredGalleryImages}
                onChange={setNewGallery}
                multiple
                showPrimary
                primaryIndex={newPrimaryImageIndex}
                onPrimaryChange={setNewPrimaryImageIndex}
                onProcessingChange={setIsReadingImages}
              />

              <div>
                <label className="font-semibold text-[#0b1c30] block mb-1">Weight/Specifications</label>
                <input
                  type="text"
                  placeholder="e.g. 227 g • 163.0 × 77.6 × 8.3 mm"
                  value={newWeightSpecifications}
                  onChange={(e) => setNewWeightSpecifications(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#0b1c30] block mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the device, included features, and warranty details"
                  value={newDetailedDescription}
                  onChange={(e) => setNewDetailedDescription(e.target.value)}
                  className="w-full p-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0]"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReadingImages}
                  className="w-1/2 py-2.5 rounded-lg bg-[#004ac6] hover:bg-[#2563eb] text-white font-semibold shadow-md disabled:opacity-50"
                >
                  {isReadingImages ? 'Processing Images...' : 'Add Device to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {passwordTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0b1c30]/50 p-4">
          <form onSubmit={handleSavePassword} className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl border border-[#e2e8f0] space-y-4">
            <div>
              <h3 className="text-[20px] font-bold text-[#0b1c30]">{passwordTarget.type === 'self' ? 'Change Password' : 'Reset Manager Password'}</h3>
              <p className="text-[12px] text-[#565e74] mt-1">
                {passwordTarget.type === 'self' ? currentUser.email : users.find((user) => user.id === passwordTarget.userId)?.email}
              </p>
            </div>
            {passwordTarget.type === 'self' && (
              <label className="block text-[13px] font-semibold text-[#0b1c30]">Current Password
                <input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
              </label>
            )}
            <label className="block text-[13px] font-semibold text-[#0b1c30]">New Password
              <input required minLength={12} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
            </label>
            <label className="block text-[13px] font-semibold text-[#0b1c30]">Confirm New Password
              <input required minLength={12} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#e2e8f0] font-normal" />
            </label>
            {passwordError && <p role="alert" className="text-[12px] text-[#ba1a1a]">{passwordError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              {!requirePasswordChange && <button type="button" onClick={() => { setPasswordTarget(null); setPasswordError(''); }} className="px-4 py-2 rounded-lg bg-[#eff4ff] text-[#0b1c30] font-semibold">Cancel</button>}
              <button disabled={isSavingUser} type="submit" className="px-4 py-2 rounded-lg bg-[#004ac6] text-white font-semibold disabled:opacity-60">{isSavingUser ? 'Saving...' : 'Save Password'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
