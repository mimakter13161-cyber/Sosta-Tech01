import React, { useEffect, useMemo, useState } from 'react';
import { FacebookFeed, HappyCustomer, Product, Review } from '../types';
import { STORE_MAP_IMAGE } from '../data/mockData';
import { useSiteSettings } from '../components/SiteSettingsContext';

interface HomePageProps {
  products: Product[];
  reviews: Review[];
  happyCustomers: HappyCustomer[];
  facebookFeed: FacebookFeed;
  onSelectProduct: (productId: string) => void;
  onNavigateCatalog: (category?: string) => void;
  onNavigateStore: () => void;
  onAddToCart: (product: Product) => void;
  onSeeAllHappyCustomers: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  reviews,
  happyCustomers,
  facebookFeed,
  onSelectProduct,
  onNavigateCatalog,
  onNavigateStore,
  onAddToCart,
  onSeeAllHappyCustomers,
}) => {
  const settings = useSiteSettings();
  const [activeHeroBanner, setActiveHeroBanner] = useState(0);
  const [visibleHomeProductCount, setVisibleHomeProductCount] = useState(10);
  const heroSlides = useMemo(() => {
    const iphone = products.find((product) => product.id === 'iphone-16-pro-max')
      || products.find((product) => product.brand === 'Apple' && /16 Pro/i.test(product.model));
    const android = products.find((product) => product.brand === 'Samsung' && /S24 Ultra/i.test(product.model))
      || products.find((product) => product.brand === 'Samsung');
    const refurbished = products.find((product) => product.condition !== 'Brand New');
    const candidates = [
      {
        product: iphone,
        eyebrow: 'Latest iPhone',
        title: settings.heroTitle,
        subtitle: settings.heroSubtitle,
        description: settings.heroDescription,
        fallbackTitle: 'iPhone 16 Pro & Pro Max',
      },
      {
        product: android,
        eyebrow: 'Android flagship',
        title: 'Samsung Galaxy S24 Ultra',
        subtitle: 'Galaxy AI. Titanium strength. Flagship performance.',
        description: 'Explore Samsung’s S Pen flagship with a vivid display, versatile cameras, and verified stock at Sosta Tech.',
        fallbackTitle: 'Samsung Galaxy S24 Ultra',
      },
      {
        product: refurbished,
        eyebrow: 'Certified refurbished deals',
        title: 'Refurbished Deals',
        subtitle: 'Premium iPhones, smarter prices.',
        description: 'Shop inspected pre-owned devices with transparent condition details and battery health information.',
        fallbackTitle: 'Refurbished Deals',
      },
    ];
    return candidates.flatMap((candidate, index) => {
      if (!candidate.product) return [];
      const productImage = candidate.product.imageUrl
        || candidate.product.gallery.find((image) => image.isPrimary)?.src
        || candidate.product.gallery[0]?.src
        || '';
      return [{
        ...candidate,
        title: candidate.title || candidate.fallbackTitle,
        image: settings.heroBanners[index] || productImage,
      }];
    });
  }, [products, settings.heroBanners, settings.heroDescription, settings.heroSubtitle, settings.heroTitle]);
  const activeHeroSlide = heroSlides[activeHeroBanner % Math.max(heroSlides.length, 1)];
  const activeHeroProduct = activeHeroSlide?.product;
  const homeProducts = useMemo(() => {
    const selectedProducts = products.filter((product) => product.showOnHomePage ?? product.featured);
    const selectedProductIds = new Set(selectedProducts.map((product) => product.id));
    return [...selectedProducts, ...products.filter((product) => !selectedProductIds.has(product.id))];
  }, [products]);
  const visibleHomeProducts = homeProducts.slice(0, visibleHomeProductCount);
  const latestHappyCustomers = [...happyCustomers]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 6);

  useEffect(() => {
    if (heroSlides.length < 2) return undefined;
    const interval = window.setInterval(() => {
      setActiveHeroBanner((current) => (current + 1) % heroSlides.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [heroSlides.length]);

  return (
    <div className="flex flex-col w-full">
      {/* Immersive Gallery Hero Section */}
      <section className="relative w-full overflow-hidden bg-[#ffffff]">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#eff4ff] via-[#f8f9ff] to-[#ffffff] pointer-events-none opacity-80"></div>
        <div className="relative max-w-[1440px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Hero Text & Conversions (6 Cols) */}
            <div className="lg:col-span-6 flex flex-col gap-6 z-10">
              <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-[#dce9ff] text-[#0b1c30]">
                <span className="inline-block w-2 h-2 rounded-full bg-[#006242] animate-pulse"></span>
                <span className="text-[11px] uppercase tracking-wider text-[#004ac6] font-bold">
                  {activeHeroSlide?.eyebrow || settings.tagline}
                </span>
              </div>
              <div className="space-y-3">
                <h1 className="text-[44px] sm:text-[56px] font-bold text-[#0b1c30] tracking-tight leading-none">
                  {activeHeroSlide?.title || settings.heroTitle}
                </h1>
                <p className="text-[22px] sm:text-[24px] text-[#434655] font-medium">
                  {activeHeroSlide?.subtitle || settings.heroSubtitle}
                </p>
              </div>
              <p className="text-[17px] text-[#565e74] max-w-xl leading-relaxed">
                {activeHeroSlide?.description || settings.heroDescription}
              </p>
              <div className="flex flex-wrap items-baseline gap-3 pt-2">
                <span className="text-[13px] uppercase tracking-wider text-[#434655]">
                  Starting from
                </span>
                <span className="text-[32px] font-bold text-[#004ac6] tracking-tight">
                  ৳{(activeHeroProduct?.basePrice ?? 152000).toLocaleString('en-IN')}
                </span>
                {activeHeroProduct && activeHeroProduct.originalPrice > activeHeroProduct.basePrice && (
                  <>
                    <span className="text-[16px] text-[#737686] line-through">
                      ৳{activeHeroProduct.originalPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#bdffdb] text-[#002113] text-[11px] font-bold">
                      Save ৳{(activeHeroProduct.originalPrice - activeHeroProduct.basePrice).toLocaleString('en-IN')}
                    </span>
                  </>
                )}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                <a
                  className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-[#007d55] hover:bg-[#006242] text-white text-[14px] font-semibold shadow-md hover:opacity-95 transition-all"
                  href={`https://wa.me/${settings.whatsAppNumber}?text=${encodeURIComponent(`Hello ${settings.brandName}, I am interested in the ${activeHeroProduct?.model || 'featured flagship'} in Rajshahi.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                  <span>Inquire via WhatsApp</span>
                </a>
                <button
                  onClick={() => activeHeroProduct && onSelectProduct(activeHeroProduct.id)}
                  className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-[#dce9ff] text-[#0b1c30] text-[14px] font-semibold hover:bg-[#d3e4fe] transition-colors shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[#004ac6]">
                    storefront
                  </span>
                  <span>{activeHeroProduct ? `View ${activeHeroProduct.model}` : 'Browse Products'}</span>
                </button>
                <a
                  href={settings.facebookPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-[#fff0d0] text-[#573b00] text-[14px] font-semibold hover:bg-[#ffe5ac] transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">campaign</span>
                  <span>Today&apos;s Special Offers &amp; Live Stock</span>
                </a>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-3 gap-4 pt-6 max-w-lg">
                <div className="p-3 rounded-lg bg-[#eff4ff]">
                  <span className="text-[20px] font-bold text-[#0b1c30] block">100%</span>
                  <span className="text-[11px] text-[#434655]">Genuine Stock</span>
                </div>
                <div className="p-3 rounded-lg bg-[#eff4ff]">
                  <span className="text-[20px] font-bold text-[#006242] block">7 Days</span>
                  <span className="text-[11px] text-[#434655]">Replacement</span>
                </div>
                <div className="p-3 rounded-lg bg-[#eff4ff]">
                  <span className="text-[20px] font-bold text-[#004ac6] block">30 Min</span>
                  <span className="text-[11px] text-[#434655]">City Delivery</span>
                </div>
              </div>
            </div>

            {/* Hero Visual Showcase (6 Cols) */}
            <div className="lg:col-span-6 relative flex flex-col justify-center items-center">
              <div
                onClick={() => activeHeroProduct && onSelectProduct(activeHeroProduct.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (activeHeroProduct) onSelectProduct(activeHeroProduct.id);
                  }
                }}
                className="relative w-full aspect-square max-w-[540px] rounded-3xl bg-[#eff4ff] overflow-hidden shadow-xl p-8 flex items-center justify-center cursor-pointer group"
              >
                <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#dbe1ff] filter blur-3xl opacity-30"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[#6ffbbe] filter blur-3xl opacity-30"></div>
                <img
                  width={1000}
                  height={1000}
                  fetchPriority="high"
                  className="relative z-10 w-full h-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
                  alt={activeHeroProduct?.model || `${settings.brandName} featured product banner`}
                  src={activeHeroSlide?.image || '/favicon.svg'}
                />
                {/* Floating Spec Token */}
                <div className="absolute top-6 right-6 z-20 px-3.5 py-2 rounded-xl bg-white/90 backdrop-blur-md shadow-md flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#006242]"></span>
                  <span className="text-[11px] text-[#0b1c30] font-bold tracking-tight">
                    {activeHeroProduct?.condition === 'Brand New' ? 'Brand New · Verified Stock' : activeHeroProduct?.condition || 'Verified Stock'}
                  </span>
                </div>
                <div className="absolute bottom-6 left-6 z-20 px-4 py-2.5 rounded-xl bg-white/95 backdrop-blur-md shadow-md flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#004ac6] text-[22px]">memory</span>
                  <div>
                    <p className="text-[11px] text-[#434655] uppercase tracking-wider">Featured model</p>
                    <p className="text-[13px] text-[#0b1c30] font-bold">{activeHeroProduct?.model || settings.brandName}</p>
                  </div>
                </div>
              </div>
              {heroSlides.length > 1 && (
                <div className="flex items-center gap-2 mt-3" aria-label="Hero banners">
                  {heroSlides.map((slide, index) => (
                    <button
                      key={`${slide.eyebrow}-${index}`}
                      type="button"
                      aria-label={`Show ${slide.eyebrow} slide`}
                      aria-pressed={activeHeroBanner % heroSlides.length === index}
                      onClick={() => setActiveHeroBanner(index)}
                      className={`h-2.5 rounded-full transition-all ${activeHeroBanner % heroSlides.length === index ? 'w-8 bg-[#004ac6]' : 'w-2.5 bg-[#c3c6d7]'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Regional Trust Assurance Strip */}
      <section className="w-full bg-[#eff4ff] py-8 shadow-xs border-y border-[#e2e8f0]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          <h2 className="sr-only">Why shop at Sosta Tech</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[#dce9ff] flex items-center justify-center shrink-0 text-[#004ac6]">
                <span className="material-symbols-outlined text-[26px]">pin</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-[13px] text-[#0b1c30] font-bold">100% Original &amp; IMEI Match</h3>
                <p className="text-[13px] text-[#434655]">
                  Official &amp; authentic Global variants with verified packaging and BTRC checking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[#dce9ff] flex items-center justify-center shrink-0 text-[#006242]">
                <span className="material-symbols-outlined text-[26px]">verified_user</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-[13px] text-[#0b1c30] font-bold">7D Return &amp; 1Y Warranty</h3>
                <p className="text-[13px] text-[#434655]">
                  Instant replacement for factory anomalies plus continuous direct repair support.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[#dce9ff] flex items-center justify-center shrink-0 text-[#004ac6]">
                <span className="material-symbols-outlined text-[26px]">touch_app</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-[13px] text-[#0b1c30] font-bold">Hands-On In-Store Testing</h3>
                <p className="text-[13px] text-[#434655]">
                  Test cameras, TrueTone, speakers, and ports thoroughly before paying 1 Taka.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[#dce9ff] flex items-center justify-center shrink-0 text-[#006242]">
                <span className="material-symbols-outlined text-[26px]">battery_charging_full</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-[13px] text-[#0b1c30] font-bold">Verified Battery &amp; 3uTools</h3>
                <p className="text-[13px] text-[#434655]">
                  100% transparent diagnostics report with original serials for all pre-owned units.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Quick Jump Section */}
      <section className="w-full py-14 bg-[#f8f9ff]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-[11px] text-[#004ac6] uppercase font-bold tracking-wider">
                Browse By Tier
              </span>
              <h2 className="text-[32px] font-bold text-[#0b1c30] tracking-tight">
                Curated Flagship Catalog
              </h2>
            </div>
            <p className="text-[15px] text-[#434655] max-w-md">
              Explore factory-sealed arrivals, certified pre-owned treasures, and high-performance Android devices.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <button
              onClick={() => onNavigateCatalog('iPhone 16 Series')}
              className="group p-5 rounded-2xl bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between h-44 text-left border border-[#e2e8f0]/60 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#004ac6] group-hover:bg-[#2563eb] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[22px]">phone_iphone</span>
              </div>
              <div>
                <h3 className="text-[16px] text-[#0b1c30] font-bold group-hover:text-[#004ac6] transition-colors">
                  iPhone 16 Series
                </h3>
                <p className="text-[11px] text-[#434655] mt-1 font-medium">From ৳109,000</p>
              </div>
            </button>

            <button
              onClick={() => onNavigateCatalog('iPhone 15 Series')}
              className="group p-5 rounded-2xl bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between h-44 text-left border border-[#e2e8f0]/60 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#004ac6] group-hover:bg-[#2563eb] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[22px]">devices</span>
              </div>
              <div>
                <h3 className="text-[16px] text-[#0b1c30] font-bold group-hover:text-[#004ac6] transition-colors">
                  iPhone 15 Series
                </h3>
                <p className="text-[11px] text-[#434655] mt-1 font-medium">From ৳104,000</p>
              </div>
            </button>

            <button
              onClick={() => onNavigateCatalog('Pre-Owned')}
              className="group p-5 rounded-2xl bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between h-44 text-left border border-[#e2e8f0]/60 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#006242] group-hover:bg-[#007d55] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
              </div>
              <div>
                <h3 className="text-[16px] text-[#0b1c30] font-bold group-hover:text-[#006242] transition-colors">
                  Pre-Owned Certified
                </h3>
                <p className="text-[11px] text-[#434655] mt-1 font-medium">Battery Health 90%+</p>
              </div>
            </button>

            <button
              onClick={() => onNavigateCatalog('Android')}
              className="group p-5 rounded-2xl bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between h-44 text-left border border-[#e2e8f0]/60 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#004ac6] group-hover:bg-[#2563eb] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[22px]">android</span>
              </div>
              <div>
                <h3 className="text-[16px] text-[#0b1c30] font-bold group-hover:text-[#004ac6] transition-colors">
                  Android Flagships
                </h3>
                <p className="text-[11px] text-[#434655] mt-1 font-medium">Samsung &amp; Pixel 9</p>
              </div>
            </button>

            <button
              onClick={() => onNavigateCatalog('Accessories')}
              className="group p-5 rounded-2xl bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between h-44 text-left border border-[#e2e8f0]/60 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#565e74] group-hover:bg-[#0b1c30] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[22px]">headphones</span>
              </div>
              <div>
                <h3 className="text-[16px] text-[#0b1c30] font-bold group-hover:text-[#0b1c30] transition-colors">
                  Accessories
                </h3>
                <p className="text-[11px] text-[#434655] mt-1 font-medium">Chargers, MagSafe, Buds</p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Featured Real-Time Inventory Grid */}
      <section className="w-full py-16 bg-[#ffffff]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#006242]"></span>
                <span className="text-[11px] uppercase font-bold text-[#0b1c30] tracking-wider">
                  In-Store Ready
                </span>
              </div>
              <h2 className="text-[32px] font-bold text-[#0b1c30] mt-1 tracking-tight">
                Featured Flagship Inventory
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[#434655] text-[13px]">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>Physical units verified on Rajshahi showroom shelves</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {visibleHomeProducts.map((phone) => (
              <div
                key={phone.id}
                className="group flex flex-col rounded-2xl bg-white border border-[#e2e8f0] shadow-xs hover:shadow-xl transition-all duration-300 p-4"
              >
                {/* Image Canvas */}
                <div
                  onClick={() => onSelectProduct(phone.id)}
                  className="relative w-full aspect-square rounded-xl bg-[#eff4ff] overflow-hidden p-6 flex items-center justify-center cursor-pointer"
                >
                  <span
                    className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      phone.condition.includes('Brand New')
                        ? 'bg-[#2563eb] text-white'
                        : 'bg-[#dae2fd] text-[#131b2e]'
                    }`}
                  >
                    {phone.condition}
                  </span>
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-[#d3e4fe] text-[#0b1c30] text-[11px] font-bold">
                    {phone.storages[0]?.capacity}
                  </span>
                  <img
                    width={600}
                    height={600}
                    loading="lazy"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    alt={phone.title}
                      src={phone.imageUrl || phone.gallery.find((image) => image.isPrimary)?.src || phone.gallery[0]?.src || ''}
                  />
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-[#006242] animate-pulse"></span>
                    <span className="text-[11px] text-[#0b1c30] font-medium">
                      {phone.stock} units left
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="flex flex-col flex-1 pt-4 space-y-3">
                  <div className="space-y-1">
                    <h3
                      onClick={() => onSelectProduct(phone.id)}
                      className="text-[18px] text-[#0b1c30] font-bold leading-tight cursor-pointer hover:text-[#004ac6] transition-colors"
                    >
                      {phone.model}
                    </h3>
                    <p className="text-[12px] text-[#434655]">
                      {phone.colors[0]?.name} • {phone.simVariants[0]?.name}
                    </p>
                    {(phone.weightSpecifications || phone.detailedDescription || phone.description) && (
                      <p className="text-[12px] text-[#434655] line-clamp-2">
                        {[phone.weightSpecifications, phone.detailedDescription || phone.description]
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    )}
                  </div>

                  {/* Swatches & Region */}
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-1.5">
                      {phone.colors.slice(0, 3).map((c, i) => (
                        <span
                          key={c.name}
                          className={`w-3.5 h-3.5 rounded-full ${i === 0 ? 'ring-2 ring-[#004ac6] ring-offset-2' : ''}`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        ></span>
                      ))}
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#eff4ff] text-[11px] text-[#565e74] font-medium">
                      {phone.regionVariantBadge}
                    </span>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[20px] font-bold text-[#0b1c30]">
                        ৳{phone.basePrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[13px] text-[#737686] line-through">
                        ৳{phone.originalPrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#006242] font-semibold">
                      Ready for pickup at Theme Omar
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 mt-auto space-y-2">
                    <a
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#006242] hover:bg-[#007d55] text-white text-[13px] font-semibold transition-opacity"
                      href={`https://wa.me/${settings.whatsAppNumber}?text=Hello%20${encodeURIComponent(settings.brandName)},%20inquiring%20about%20${encodeURIComponent(
                        phone.model
                      )}%20at%20৳${phone.basePrice.toLocaleString('en-IN')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                      <span>WhatsApp Inquiry</span>
                    </a>
                    <button
                      onClick={() => onSelectProduct(phone.id)}
                      className="w-full py-2 rounded-lg bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff] text-[13px] font-medium transition-colors cursor-pointer"
                    >
                      View Full Specifications
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {homeProducts.length > visibleHomeProducts.length && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleHomeProductCount((count) => Math.min(count + 8, homeProducts.length))}
                className="rounded-xl bg-[#004ac6] px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#2563eb]"
              >
                Load More Products
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="w-full bg-[#f8f9ff] py-16" aria-labelledby="store-faq-heading">
        <div className="mx-auto max-w-[1100px] space-y-6 px-6 lg:px-12">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#004ac6]">Rajshahi phone buying guide</span>
            <h2 id="store-faq-heading" className="mt-1 text-[30px] font-bold tracking-tight text-[#0b1c30]">Frequently Asked Questions</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-[#e2e8f0] bg-white p-5">
              <h3 className="font-bold text-[#0b1c30]">Where can I inspect a phone before buying in Rajshahi?</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#565e74]">Visit {settings.brandName} at {settings.footerLocation} to inspect available devices before purchase.</p>
            </article>
            <article className="rounded-xl border border-[#e2e8f0] bg-white p-5">
              <h3 className="font-bold text-[#0b1c30]">Does Sosta Tech sell new and pre-owned phones?</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#565e74]">The catalog includes brand-new and pre-owned smartphones. Check each listing for its condition, stock status, price, and included warranty.</p>
            </article>
            <article className="rounded-xl border border-[#e2e8f0] bg-white p-5">
              <h3 className="font-bold text-[#0b1c30]">How can I check stock or ask about delivery?</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#565e74]">Contact our Rajshahi showroom by phone or WhatsApp to confirm current stock, delivery options, and product details.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Physical Store Showcase: Theme Omar Plaza */}
      <section className="w-full py-20 bg-[#f8f9ff]" id="store-showcase">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          <div className="rounded-3xl bg-white shadow-xl overflow-hidden border border-[#e2e8f0]">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
              {/* Store Information & Direct Contacts (7 Cols) */}
              <div className="lg:col-span-7 p-8 md:p-12 lg:p-14 flex flex-col justify-between space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dce9ff] text-[#004ac6]">
                    <span className="material-symbols-outlined text-[18px]">storefront</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Rajshahi Experience Hub
                    </span>
                  </div>
                  <h2 className="text-[32px] sm:text-[36px] font-bold text-[#0b1c30] tracking-tight">
                    Experience Before You Buy at Theme Omar Plaza
                  </h2>
                  <p className="text-[16px] text-[#434655] max-w-xl leading-relaxed">
                    {settings.footerDescription}
                  </p>
                </div>

                {/* Key Location Attributes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[#0b1c30] font-semibold text-[16px]">
                      <span className="material-symbols-outlined text-[#004ac6] text-[22px]">
                        location_on
                      </span>
                      <span>Exact Address</span>
                    </div>
                    <p className="text-[14px] text-[#434655]">
                      {settings.footerLocation}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[#0b1c30] font-semibold text-[16px]">
                      <span className="material-symbols-outlined text-[#004ac6] text-[22px]">
                        schedule
                      </span>
                      <span>Store Hours</span>
                    </div>
                    <p className="text-[14px] text-[#434655]">
                      {settings.storeHours}
                    </p>
                  </div>
                </div>

                {/* Interactive Action Hub */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#004ac6] text-white text-[13px] font-semibold hover:bg-[#2563eb] transition-colors shadow-md"
                    href="https://maps.google.com/?q=Theme+Omar+Plaza+Rajshahi"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="material-symbols-outlined text-[20px]">directions</span>
                    <span>Get Google Maps Directions</span>
                  </a>
                  <a
                    className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#dce9ff] text-[#0b1c30] text-[13px] font-semibold hover:bg-[#d3e4fe] transition-colors"
                    href={`tel:${settings.contactNumber}`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#004ac6]">call</span>
                    <span>Direct Showroom Call</span>
                  </a>
                  <a
                    className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#007d55] text-white text-[13px] font-semibold hover:bg-[#006242] transition-opacity"
                    href={`https://wa.me/${settings.whatsAppNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="material-symbols-outlined text-[20px]">chat</span>
                    <span>Showroom WhatsApp</span>
                  </a>
                </div>

                {/* In-Store Services Ticker */}
                <div className="pt-2 flex flex-wrap items-center gap-4 text-[#434655] text-[13px] border-t border-[#eff4ff]">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[#006242]">check_circle</span>
                    Instant Free Data Migration
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[#006242]">check_circle</span>
                    POS Card &amp; bKash Accepted
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[#006242]">check_circle</span>
                    Free Screen Protector Installation
                  </span>
                </div>
              </div>

              {/* Storefront Visual Media / Simulated Map (5 Cols) */}
              <div className="lg:col-span-5 relative min-h-[360px] lg:min-h-full bg-[#eff4ff] flex flex-col justify-end p-6">
                <div
                  className="absolute inset-0 w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url('${STORE_MAP_IMAGE}')` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1c30]/85 via-[#0b1c30]/30 to-transparent"></div>
                <div className="relative z-10 p-5 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg space-y-2 border border-[#e2e8f0]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#006242] animate-ping"></span>
                      <span className="text-[14px] text-[#0b1c30] font-bold">Store Open Now</span>
                    </div>
                    <span className="text-[11px] text-[#434655] font-semibold">{settings.footerLocation}</span>
                  </div>
                  <p className="text-[12px] text-[#434655]">
                    Located centrally in New Market commercial precinct with dedicated escalator access and basement parking facilities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials: Trusted by Rajshahi Tech Community */}
      <section className="w-full py-20 bg-[#eff4ff]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[11px] uppercase font-bold text-[#004ac6] tracking-wider">
              Community Reputation
            </span>
            <h2 className="text-[32px] font-bold text-[#0b1c30] tracking-tight">
              Loved by Rajshahi&apos;s Tech Community
            </h2>
            <p className="text-[15px] text-[#434655]">
              Hear from students, medical residents, and seasoned professionals who rely on {settings.brandName} for transparent flagship pricing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-8 rounded-2xl bg-white shadow-xs flex flex-col justify-between space-y-6 border border-[#e2e8f0]"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-[#006242]">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className="material-symbols-outlined text-[18px]"
                        style={{ fontVariationSettings: i < rev.rating ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <p className="text-[15px] text-[#0b1c30] leading-relaxed italic">
                    {rev.content}
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-[#eff4ff]">
                  <div className="w-10 h-10 rounded-full bg-[#dbe1ff] flex items-center justify-center text-[18px] text-[#00174b] font-bold">
                    {rev.avatarLetter}
                  </div>
                  <div>
                    <h3 className="text-[13px] text-[#0b1c30] font-bold">{rev.name}</h3>
                    <p className="text-[11px] text-[#434655]">{rev.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust Stats Banner */}
          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <span className="text-[32px] text-[#004ac6] font-bold">3,500+</span>
              <p className="text-[11px] text-[#434655] uppercase tracking-wider font-semibold">
                Devices Delivered in Rajshahi
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[32px] text-[#006242] font-bold">100%</span>
              <p className="text-[11px] text-[#434655] uppercase tracking-wider font-semibold">
                Verified Authentic HW
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[32px] text-[#0b1c30] font-bold">4.9 / 5</span>
              <p className="text-[11px] text-[#434655] uppercase tracking-wider font-semibold">
                Google Reviews Score
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[32px] text-[#004ac6] font-bold">Theme Omar</span>
              <p className="text-[11px] text-[#434655] uppercase tracking-wider font-semibold">
                Flagship Experience Store
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VIP WhatsApp Consultation Call-to-Action Bar */}
      <section className="w-full py-12 bg-[#004ac6] text-white">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-[24px] font-bold tracking-tight">
              Looking for a specific model, region variant or color?
            </h3>
            <p className="text-[15px] text-white/80">
              Chat directly with our inventory manager at Theme Omar Plaza for real-time stock holds and custom quotes.
            </p>
          </div>
          <a
            className="shrink-0 flex items-center gap-3 px-8 py-4 rounded-xl bg-white text-[#004ac6] text-[14px] font-bold shadow-lg hover:bg-[#eff4ff] transition-colors"
            href={`https://wa.me/${settings.whatsAppNumber}?text=${encodeURIComponent(`Hello ${settings.brandName}, I am looking for a flagship phone in Rajshahi.`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="material-symbols-outlined text-[#006242] text-[22px]">chat</span>
            <span>Chat Now ({settings.contactNumber})</span>
          </a>
        </div>
      </section>

      <section className="w-full bg-white py-14 border-y border-[#e2e8f0]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-[11px] uppercase font-bold text-[#004ac6] tracking-wider">Official Facebook Page</span>
              <h2 className="text-[28px] font-bold text-[#0b1c30] mt-1">Latest Updates &amp; Offers from Facebook</h2>
              <p className="text-[13px] text-[#565e74] mt-1">Live public posts from {settings.facebookPageUrl.replace(/^https?:\/\//, '')}</p>
            </div>
            <a href={settings.facebookPageUrl} target="_blank" rel="noopener noreferrer" className="self-start sm:self-auto inline-flex items-center gap-2 rounded-lg bg-[#0866ff] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0758dc]">
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              Visit Facebook Page
            </a>
          </div>
          {facebookFeed.posts.length > 0 ? (
            <div className="mx-auto flex max-w-[1200px] flex-wrap justify-center gap-4">
              {facebookFeed.posts.map((post) => (
                <article key={post.id} className="w-full max-w-[380px] overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
                  {post.imageUrl && (
                    <a href={post.permalinkUrl} target="_blank" rel="noopener noreferrer" aria-label="Open Facebook post">
                      <img
                        src={post.imageUrl}
                        alt="Image from a Sosta Tech Facebook post"
                        width={640}
                        height={480}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    </a>
                  )}
                  <div className="space-y-3 p-5">
                    <p className="whitespace-pre-line break-words text-[13px] leading-relaxed text-[#434655]">
                      {post.message || 'View this update on the Sosta Tech Facebook page.'}
                    </p>
                    <div className="flex items-center justify-between gap-3 text-[11px] text-[#737686]">
                      <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString()}</time>
                      <a href={post.permalinkUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0866ff] hover:underline">
                        View on Facebook
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
          <div>
            <p className="mb-3 rounded-lg bg-[#eff4ff] px-4 py-3 text-[12px] leading-relaxed text-[#565e74]">
              Showing the live Facebook Page timeline. If Facebook does not load here, open the page directly using the link above.
            </p>
          <div className="mx-auto max-w-[720px] overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f8f9ff]">
            <iframe
              title="Latest posts and offers from Sosta Tech on Facebook"
              src={`https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(settings.facebookPageUrl)}&tabs=timeline&width=500&height=620&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true`}
              width="500"
              height="620"
              style={{ border: 'none', overflow: 'hidden', width: '100%', maxWidth: '500px', display: 'block', margin: '0 auto' }}
              scrolling="no"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
          </div>
          )}
          {facebookFeed.posts.length > 0 && facebookFeed.syncedAt && (
            <p className="mt-3 text-[11px] text-[#737686]">
              Latest saved Facebook updates · Last synced {new Date(facebookFeed.syncedAt).toLocaleString()} ·{' '}
              <a href={settings.facebookPageUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0866ff] hover:underline">
                Visit Facebook for more
              </a>
            </p>
          )}
        </div>
      </section>

      <section className="w-full bg-[#f8f9ff] py-16 lg:py-20">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="space-y-2">
              <span className="text-[11px] uppercase font-bold text-[#006242] tracking-wider">Real customers. Real deliveries.</span>
              <h2 className="text-[30px] font-bold text-[#0b1c30]">Happy Customers &amp; Delivery Showcase</h2>
              <p className="text-[14px] text-[#565e74]">Stories from customers who picked up their phones at {settings.brandName}.</p>
            </div>
            {happyCustomers.length > 0 && (
              <button onClick={onSeeAllHappyCustomers} className="self-start md:self-auto px-4 py-2.5 rounded-lg bg-white border border-[#d4d9e5] text-[#004ac6] text-[13px] font-semibold hover:bg-[#eff4ff]">
                See All Customer Stories / Proofs
              </button>
            )}
          </div>
          {latestHappyCustomers.length === 0 ? (
            <p className="rounded-lg border border-[#e2e8f0] bg-white p-8 text-center text-[13px] text-[#565e74]">Customer delivery stories will appear here.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {latestHappyCustomers.map((customer) => (
                <article key={customer.id} className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-xs">
                  <img width={640} height={480} src={customer.image} alt={`${customer.customerName} with ${customer.phoneModel}`} loading="lazy" className="w-full h-64 object-cover bg-[#eff4ff]" />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div><h3 className="text-[15px] font-bold text-[#0b1c30]">{customer.customerName}</h3><p className="text-[12px] text-[#565e74] mt-0.5">{customer.phoneModel}</p></div>
                      <span className="shrink-0 text-[11px] text-[#565e74]">{new Date(customer.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-[#d68b00] mt-3" aria-label={`${customer.rating} out of 5 stars`}>
                      {Array.from({ length: customer.rating }, (_, index) => <span key={index} className="material-symbols-outlined text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                    </div>
                    <p className="text-[13px] text-[#434655] leading-relaxed mt-2 line-clamp-3">{customer.review}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
          {happyCustomers.length > 0 && (
            <div className="text-center">
              <button onClick={onSeeAllHappyCustomers} className="px-5 py-2.5 rounded-lg bg-[#004ac6] text-white text-[13px] font-semibold hover:bg-[#2563eb]">
                See All Customer Stories / Proofs
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
