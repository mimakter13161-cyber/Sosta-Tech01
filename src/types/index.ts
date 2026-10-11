export interface ColorOption {
  name: string;
  hex: string;
  image?: string;
}

export interface StorageOption {
  capacity: string;
  price: number;
  originalPrice: number;
}

export interface SimOption {
  name: string;
  subtitle: string;
  surcharge: number;
}

export interface ProductVariant {
  id: string;
  ram: string;
  storage: string;
  color: string;
  colorHex: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  stock: number;
  batteryHealth?: number;
  imageUrl?: string;
}

export interface ProductImage {
  src: string;
  label: string;
  alt: string;
  isPrimary?: boolean;
}

export interface SiteSettings {
  logoUrl: string;
  brandName: string;
  contactNumber: string;
  whatsAppNumber: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroBanners: string[];
  facebookPageUrl: string;
  liveContent?: LiveEditMap;
  footerDescription: string;
  footerTrustText: string;
  footerCopyright: string;
  footerLocation: string;
  storeHours: string;
}

export interface FacebookPost {
  id: string;
  message: string;
  permalinkUrl: string;
  createdAt: string;
  imageUrl?: string;
}

export interface FacebookFeed {
  posts: FacebookPost[];
  syncedAt: string | null;
}

export interface LiveEditValue {
  route: string;
  selector: string;
  kind: 'text' | 'image';
  value: string;
  settingKey?: 'logoUrl';
}

export type LiveEditMap = Record<string, LiveEditValue>;

export type AdminRole = 'owner' | 'manager';

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  passwordSalt: string;
  passwordHash: string;
  mustChangePassword?: boolean;
}

export interface HappyCustomer {
  id: string;
  image: string;
  customerName: string;
  phoneModel: string;
  rating: 1 | 2 | 3 | 4 | 5;
  review: string;
  createdAt: string;
}

export interface TechnicalSpecs {
  display: {
    screenSize: string;
    resolution: string;
    refreshRate: string;
    peakBrightness: string;
    chassisMaterial: string;
  };
  camera: {
    primary: string;
    ultraWide: string;
    telephoto: string;
    cameraControl: string;
    videoRecording: string;
  };
  performance: {
    chipset: string;
    cpuCores: string;
    gpuCores: string;
    neuralEngine: string;
    ram: string;
  };
  battery: {
    playback: string;
    port: string;
    wireless: string;
    wired: string;
  };
  box: {
    inTheBox: string;
    warranty: string;
    replacement: string;
    inspection: string;
  };
  compliance: {
    imeiWhitelisting: string;
    cellular5G: string;
    esimOperators: string;
    invoiceType: string;
  };
}

export interface Product {
  id: string;
  model: string;
  brand: string;
  series: string;
  category?: string;
  title: string;
  description: string;
  imageUrl?: string;
  weightSpecifications?: string;
  detailedDescription?: string;
  condition: 'Brand New' | 'Pre-Owned (Like New 99%)' | 'Official Refurbished' | 'Pre-Owned (Like New 98%)';
  batteryHealth?: number; // percentage for pre-owned
  modelIdentifier: string;
  basePrice: number;
  originalPrice: number;
  stock: number;
  stockLocation: string;
  sku: string;
  costPrice: number;
  inStock: boolean;
  preOrderOnly?: boolean;
  featured?: boolean;
  showOnHomePage?: boolean;
  regionVariantBadge: string;
  regionCountryCode: string; // e.g. "USA LL/A", "HK ZA/A"
  colors: ColorOption[];
  storages: StorageOption[];
  simVariants: SimOption[];
  variants?: ProductVariant[];
  gallery: ProductImage[];
  specs: TechnicalSpecs;
  heroTag?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  color: string;
  storage: string;
  simVariant: string;
  price: number;
  quantity: number;
  image: string;
  condition: string;
}

export interface WhatsAppLead {
  id: string;
  customerName: string;
  phone: string;
  device: string;
  variant: string;
  referenceId: string;
  leadStatus: 'Confirmed (Deposit Paid)' | 'Contacted (Price Offered)' | 'Pending (New Ping)' | 'Completed';
  timestamp: string;
}

export interface Review {
  id: string;
  name: string;
  title: string;
  role: string;
  avatarLetter: string;
  rating: number;
  content: string;
}
