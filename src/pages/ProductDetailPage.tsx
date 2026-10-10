import React, { useState } from 'react';
import { Product } from '../types';
import { STORE_MAP_IMAGE } from '../data/mockData';
import { InquiryModal } from '../components/InquiryModal';
import { useSiteSettings } from '../components/SiteSettingsContext';

interface ProductDetailPageProps {
  product: Product;
  onNavigateHome: () => void;
  onNavigateCatalog: () => void;
  onAddToCart: (item: {
    productId: string;
    title: string;
    color: string;
    storage: string;
    simVariant: string;
    price: number;
    image: string;
    condition: string;
  }) => void;
  onToast: (msg: string) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onNavigateHome,
  onNavigateCatalog,
  onAddToCart,
  onToast,
}) => {
  const settings = useSiteSettings();
  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Variant selections
  const [selectedColor, setSelectedColor] = useState(
    product.variants?.[0]?.color || product.colors[0]?.name || 'Desert Titanium'
  );
  const [selectedRam, setSelectedRam] = useState(product.variants?.[0]?.ram || '');
  const [selectedStorage, setSelectedStorage] = useState(
    product.variants?.[0]?.storage || product.storages[0]?.capacity || '256GB'
  );
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants?.[0]?.id || '');
  const [hasSelectedVariant, setHasSelectedVariant] = useState(false);
  const [selectedSim, setSelectedSim] = useState(
    product.simVariants[0]?.name || 'USA LL/A'
  );

  // Active specs tab
  const [activeSpecTab, setActiveSpecTab] = useState('all');

  // Modal
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

  // Price calculations
  const activeVariant = product.variants?.find((variant) => variant.id === selectedVariantId) || product.variants?.[0];
  const storageObj = product.storages.find((s) => s.capacity === selectedStorage) || product.storages[0];
  const simObj = product.simVariants.find((s) => s.name === selectedSim) || product.simVariants[0];

  const currentPrice = (activeVariant?.price ?? (storageObj ? storageObj.price : product.basePrice)) + (simObj ? simObj.surcharge : 0);
  const currentOriginalPrice = (activeVariant?.originalPrice ?? (storageObj ? storageObj.originalPrice : product.originalPrice)) + (simObj ? simObj.surcharge : 0);
  const savings = currentOriginalPrice - currentPrice;
  const currentStock = activeVariant?.stock ?? product.stock;
  const activeBatteryHealth = activeVariant?.batteryHealth ?? product.batteryHealth ?? (product.condition === 'Brand New' ? 100 : undefined);

  const primaryImage = product.gallery.find((image) => image.isPrimary) || product.gallery[0];
  const galleryItems = hasSelectedVariant && activeVariant?.imageUrl
    ? [
        { src: activeVariant.imageUrl, label: `${activeVariant.color} ${activeVariant.ram} / ${activeVariant.storage}`, alt: `${product.title} in ${activeVariant.color}` },
        ...product.gallery.filter((image) => image.src !== activeVariant.imageUrl),
      ]
    : [primaryImage, ...product.gallery.filter((image) => image !== primaryImage)].filter(Boolean);
  const currentGalleryItem = galleryItems[activeImageIndex] || galleryItems[0];

  const selectVariant = (variant: NonNullable<Product['variants']>[number]) => {
    setHasSelectedVariant(true);
    setSelectedVariantId(variant.id);
    setSelectedColor(variant.color);
    setSelectedRam(variant.ram);
    setSelectedStorage(variant.storage);
    setActiveImageIndex(0);
  };

  const findVariant = (predicate: (variant: NonNullable<Product['variants']>[number]) => boolean) =>
    product.variants?.find(predicate);

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % galleryItems.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${product.title} - ${settings.brandName} Rajshahi`,
        text: `Check out ${product.title} in Rajshahi at Theme Omar Plaza`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      onToast('Product link copied to clipboard!');
    }
  };

  const whatsAppMessage = `Hello ${settings.brandName}, I want to order ${product.title} ${selectedRam ? `${selectedRam} RAM ` : ''}${selectedStorage} ${selectedColor} (${selectedSim}) at ৳${currentPrice.toLocaleString(
    'en-IN'
  )}. Please confirm stock.`;

  return (
    <div className="flex flex-col w-full bg-[#f8f9ff]">
      {/* Product View Stage */}
      <section className="max-w-[1440px] w-full mx-auto px-6 lg:px-12 py-8 lg:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-[13px] text-[#434655]">
          <button
            onClick={onNavigateHome}
            className="hover:text-[#004ac6] transition-colors cursor-pointer"
          >
            Home
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <button
            onClick={onNavigateCatalog}
            className="hover:text-[#004ac6] transition-colors cursor-pointer"
          >
            iPhones
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#0b1c30] font-semibold">{product.model}</span>
          {product.heroTag && (
            <span className="text-[#004ac6] bg-[#e5eeff] px-2 py-0.5 rounded text-[11px] font-semibold uppercase ml-2 tracking-wider">
              {product.heroTag}
            </span>
          )}
        </div>

        {/* Product Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Gallery (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5 sticky top-28">
            {/* Main Stage Image Container */}
            <div className="relative w-full aspect-[4/3] rounded-2xl bg-white shadow-xs border border-[#e2e8f0] flex items-center justify-center overflow-hidden group">
              {/* Badges on Top Left */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e5eeff] text-[11px] text-[#0b1c30] uppercase tracking-wider font-semibold shadow-xs">
                  <span className="material-symbols-outlined text-[14px] text-[#006242]">verified</span>
                  100% Genuine Boxed
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#004ac6]/10 text-[#004ac6] text-[11px] font-semibold">
                  Grade A+ Factory Sealed
                </span>
              </div>

              {/* Share button Top Right */}
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={handleShare}
                  aria-label="Share product"
                  className="w-10 h-10 rounded-full bg-[#eff4ff]/80 backdrop-blur-md hover:bg-[#e5eeff] flex items-center justify-center text-[#0b1c30] transition-colors shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">share</span>
                </button>
              </div>

              {/* Product Main Image */}
              <img
                id="main-product-img"
                alt={currentGalleryItem.alt}
                src={currentGalleryItem.src}
                className="w-full h-full object-contain p-8 transition-transform duration-500 ease-out group-hover:scale-105"
              />

              {/* Angle Label & Prev/Next Arrows */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <div className="px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-md text-[11px] text-[#434655] flex items-center gap-1.5 shadow-xs border border-[#e2e8f0]">
                  <span className="material-symbols-outlined text-[16px] text-[#004ac6]">search</span>
                  <span className="font-medium">{currentGalleryItem.label}</span>
                </div>
                <div className="flex items-center gap-1.5 pointer-events-auto">
                  <button
                    onClick={handlePrevImage}
                    aria-label="Previous gallery image"
                    className="w-8 h-8 rounded-full bg-white/95 hover:bg-[#eff4ff] shadow-xs flex items-center justify-center text-[#0b1c30] transition-colors cursor-pointer border border-[#e2e8f0]"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <button
                    onClick={handleNextImage}
                    aria-label="Next gallery image"
                    className="w-8 h-8 rounded-full bg-white/95 hover:bg-[#eff4ff] shadow-xs flex items-center justify-center text-[#0b1c30] transition-colors cursor-pointer border border-[#e2e8f0]"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Thumbnail Switcher */}
            <div className="grid grid-cols-5 gap-3">
              {galleryItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`gallery-thumb relative rounded-xl aspect-square bg-white p-2 transition-all overflow-hidden shadow-xs cursor-pointer border ${
                    activeImageIndex === idx
                      ? 'ring-2 ring-[#004ac6] border-transparent'
                      : 'border-[#e2e8f0] hover:border-[#004ac6]'
                  }`}
                >
                  <img
                    alt={item.label}
                    src={item.src}
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute bottom-1 right-1 px-1 rounded bg-white/90 text-[9px] font-semibold text-[#0b1c30]">
                    {item.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick Assurance Badges */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[#eff4ff] border border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#004ac6] shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#0b1c30]">100% Genuine</p>
                  <p className="text-[11px] text-[#434655]">Active Apple Coverage</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#006242] shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">sync</span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#0b1c30]">7 Days Replace</p>
                  <p className="text-[11px] text-[#434655]">Instant Defect Swap</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#2563eb] shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#0b1c30]">Rajshahi Express</p>
                  <p className="text-[11px] text-[#434655]">Under 3h Local Delivery</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Product Configuration & Inquiry Engine (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Title & Condition Header */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[#bdffdb] text-[#002113] text-[11px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006242]"></span>
                  {product.condition}
                </span>
                {activeBatteryHealth !== undefined && (
                  <span className="px-2.5 py-1 rounded-full bg-[#e5eeff] text-[#006242] text-[11px] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">battery_charging_full</span>
                    Battery Health: {activeBatteryHealth}%
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-full bg-[#e5eeff] text-[11px] text-[#434655] font-medium">
                  Model: {product.modelIdentifier}
                </span>
              </div>
              <h1 className="text-[32px] sm:text-[36px] font-bold text-[#0b1c30] tracking-tight">
                {product.title}
              </h1>
              <p className="text-[15px] text-[#434655] leading-relaxed">
                {product.detailedDescription || product.description}
              </p>
              {product.weightSpecifications && (
                <p className="text-[13px] text-[#434655]">
                  <span className="font-semibold text-[#0b1c30]">Weight/Specifications:</span>{' '}
                  {product.weightSpecifications}
                </p>
              )}
            </div>

            {/* Pricing Card */}
            <div className="p-5 rounded-2xl bg-white shadow-xs border border-[#e2e8f0] flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-3">
                  <span className="text-[36px] sm:text-[42px] font-bold text-[#004ac6] tracking-tight">
                    ৳{currentPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[20px] text-[#c3c6d7] line-through">
                    ৳{currentOriginalPrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#ffdad6] text-[#93000a] text-[11px] font-semibold">
                  Save ৳{savings.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-2 text-[#0b1c30] text-[13px] font-medium border-t border-[#eff4ff]">
                <span className="material-symbols-outlined text-[18px] text-[#006242]">
                  check_circle
                </span>
                <span>7 Days Replacement + 1 Year Official Service Warranty included</span>
              </div>

              {/* Live Rajshahi Store Stock */}
              <div className="mt-1 p-3 rounded-xl bg-[#eff4ff] flex items-center justify-between border border-[#e2e8f0]">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006242] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#006242]"></span>
                  </span>
                  <span className={`text-[13px] font-semibold ${currentStock > 0 ? 'text-[#0b1c30]' : 'text-[#ba1a1a]'}`}>
                    {currentStock > 0 ? `${currentStock} Units Available` : 'Out of Stock'}
                  </span>
                </div>
                <span className="text-[12px] text-[#434655]">{product.stockLocation}</span>
              </div>
            </div>

            {/* Interactive Spec Selectors */}
            <div className="space-y-5">
              {/* Color Switcher */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] text-[#0b1c30] font-semibold">
                    Finish / Color
                  </label>
                  <span className="text-[13px] text-[#004ac6] font-medium">
                    {selectedColor}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  {product.colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => {
                        const variant = findVariant((item) => item.color === color.name && item.ram === selectedRam && item.storage === selectedStorage)
                          || findVariant((item) => item.color === color.name);
                        if (variant) selectVariant(variant);
                        else setSelectedColor(color.name);
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl bg-white shadow-xs border transition-all cursor-pointer ${
                        selectedColor === color.name
                          ? 'ring-2 ring-[#004ac6] border-transparent'
                          : 'border-[#e2e8f0] hover:bg-[#eff4ff]'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full shrink-0 shadow-inner"
                        style={{ backgroundColor: color.hex }}
                      ></span>
                      <span className="text-[12px] text-[#0b1c30] truncate font-medium">
                        {color.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {product.variants && product.variants.length > 0 && (
                <div className="space-y-2.5">
                  <label className="text-[13px] text-[#0b1c30] font-semibold">RAM</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {Array.from(new Set(product.variants.filter((variant) => variant.color === selectedColor).map((variant) => variant.ram))).map((ram) => (
                      <button
                        key={ram}
                        onClick={() => {
                          const variant = findVariant((item) => item.color === selectedColor && item.ram === ram && item.storage === selectedStorage)
                            || findVariant((item) => item.color === selectedColor && item.ram === ram);
                          if (variant) selectVariant(variant);
                        }}
                        className={`p-3 rounded-xl bg-white shadow-xs border text-left font-semibold ${selectedRam === ram ? 'ring-2 ring-[#004ac6] border-transparent' : 'border-[#e2e8f0] hover:bg-[#eff4ff]'}`}
                      >
                        {ram}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Storage Switcher */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] text-[#0b1c30] font-semibold">
                    Internal Storage
                  </label>
                  <span className="text-[13px] text-[#434655]">NVMe Fast Storage</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {(product.variants?.length
                    ? Array.from(new Map(product.variants.filter((variant) => variant.color === selectedColor && variant.ram === selectedRam).map((variant) => [variant.storage, variant])).values()).map((variant) => ({ capacity: variant.storage, price: variant.price, originalPrice: variant.originalPrice || variant.price }))
                    : product.storages).map((storage) => (
                    <button
                      key={storage.capacity}
                      onClick={() => {
                        const variant = findVariant((item) => item.color === selectedColor && item.ram === selectedRam && item.storage === storage.capacity);
                        if (variant) selectVariant(variant);
                        else setSelectedStorage(storage.capacity);
                      }}
                      className={`p-3 rounded-xl bg-white shadow-xs border text-left transition-all cursor-pointer ${
                        selectedStorage === storage.capacity
                          ? 'ring-2 ring-[#004ac6] border-transparent'
                          : 'border-[#e2e8f0] hover:bg-[#eff4ff]'
                      }`}
                    >
                      <span className="block text-[18px] text-[#0b1c30] font-bold">
                        {storage.capacity}
                      </span>
                      <span className="block text-[11px] text-[#434655] mt-0.5 font-medium">
                        ৳{storage.price.toLocaleString('en-IN')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Regional Spec / SIM Variant */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] text-[#0b1c30] font-semibold">
                    Regional Spec &amp; SIM Variant
                  </label>
                  <span className="text-[11px] text-[#004ac6] font-medium">
                    BTRC Compliant
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {product.simVariants.map((sim) => (
                    <button
                      key={sim.name}
                      onClick={() => setSelectedSim(sim.name)}
                      className={`p-3 rounded-xl bg-white shadow-xs border text-left transition-all cursor-pointer ${
                        selectedSim === sim.name
                          ? 'ring-2 ring-[#004ac6] border-transparent'
                          : 'border-[#e2e8f0] hover:bg-[#eff4ff]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[13px] font-semibold text-[#0b1c30]">
                        <span>{sim.name}</span>
                        {sim.surcharge > 0 && (
                          <span className="text-[10px] text-[#004ac6] font-bold">
                            +৳{sim.surcharge / 1000}k
                          </span>
                        )}
                      </div>
                      <span className="block text-[11px] text-[#434655] mt-0.5">
                        {sim.subtitle}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* WhatsApp Direct & Action CTAs */}
            <div className="space-y-3 pt-2">
              {/* WhatsApp Order CTA */}
              <a
                className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl bg-[#007d55] hover:bg-[#006242] text-white font-semibold text-[18px] transition-all shadow-md group cursor-pointer"
                href={`https://wa.me/${settings.whatsAppNumber}?text=${encodeURIComponent(
                  whatsAppMessage
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined text-[24px]">chat</span>
                <span>Inquire on WhatsApp (Instant Order)</span>
              </a>

              {/* WhatsApp Pre-filled Preview */}
              <div className="px-3.5 py-2 rounded-lg bg-[#e5eeff] text-[12px] text-[#434655] flex items-center justify-between">
                <span className="truncate">
                  Preview: &quot;Order {product.model} {selectedStorage} {selectedColor}&quot;
                </span>
                <span className="text-[11px] text-[#006242] font-semibold shrink-0 uppercase tracking-wider">
                  Fastest Reply
                </span>
              </div>

              {/* Secondary Store Pickup & Inquiry Drawer Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setInquiryModalOpen(true)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0b1c30] text-[13px] font-semibold transition-colors shadow-xs cursor-pointer border border-[#c3c6d7]/30"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#004ac6]">
                    edit_note
                  </span>
                  <span>Reserve &amp; Inquiry Form</span>
                </button>

                <button
                  disabled={currentStock === 0}
                  onClick={() => {
                    onAddToCart({
                      productId: product.id,
                      title: product.title,
                      color: selectedColor,
                      storage: selectedRam ? `${selectedRam} RAM / ${selectedStorage}` : selectedStorage,
                      simVariant: selectedSim,
                      price: currentPrice,
                      image: currentGalleryItem.src,
                      condition: product.condition,
                    });
                    onToast(`${product.model} added to your shopping bag!`);
                  }}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[13px] font-semibold transition-colors cursor-pointer border border-[#e2e8f0] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#004ac6]">
                    shopping_bag
                  </span>
                  <span>Add to Bag</span>
                </button>
              </div>
            </div>

            {/* Verified Regional Policy Snapshot */}
            <div className="p-4 rounded-xl bg-white shadow-xs border border-[#e2e8f0] flex items-start gap-3">
              <span className="material-symbols-outlined text-[20px] text-[#004ac6] shrink-0 mt-0.5">
                shield
              </span>
              <div className="space-y-1">
                <h4 className="text-[13px] font-semibold text-[#0b1c30]">
                  Rajshahi Hand-to-Hand Delivery
                </h4>
                <p className="text-[13px] text-[#434655] leading-relaxed">
                  Examine the sealed box, verify the Apple serial number on checkcoverage.apple.com with our executive before making final payment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications Matrix Section */}
      <section className="w-full bg-[#eff4ff] py-16 border-t border-[#e2e8f0]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-[11px] uppercase tracking-widest text-[#004ac6] font-bold">
                Engineering Breakdown
              </span>
              <h2 className="text-[32px] font-bold text-[#0b1c30] mt-1 tracking-tight">
                Official Technical Specifications
              </h2>
              <p className="text-[15px] text-[#434655] mt-1">
                Sourced from Apple Inc. Cupertino technical documentation and North Bengal BTRC standards.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[#434655] text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[16px] text-[#006242]">verified</span>
              <span>Verified against Model Identifier iPhone17,2</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
            {[
              { id: 'all', label: 'All Specifications' },
              { id: 'display', label: 'Super Retina XDR Display' },
              { id: 'camera', label: 'Camera Control & Fusion 48MP' },
              { id: 'performance', label: 'A18 Pro & Apple Intelligence' },
              { id: 'battery', label: 'Battery & Fast Charge' },
              { id: 'box', label: 'Box Contents & Warranty' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSpecTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold shadow-xs transition-all whitespace-nowrap cursor-pointer ${
                  activeSpecTab === tab.id
                    ? 'bg-[#004ac6] text-white'
                    : 'bg-white text-[#0b1c30] hover:bg-[#e5eeff] border border-[#e2e8f0]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Specification Cards Bento Grid */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Display Specs Bento */}
            {(activeSpecTab === 'all' || activeSpecTab === 'display') && (
              <div className="p-6 rounded-2xl bg-white shadow-xs border border-[#e2e8f0] space-y-4">
                <div className="flex items-center gap-2.5 text-[#004ac6]">
                  <span className="material-symbols-outlined text-[22px]">smartphone</span>
                  <h3 className="text-[18px] font-semibold text-[#0b1c30]">Display &amp; Finish</h3>
                </div>
                <div className="space-y-2.5 text-[13px]">
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Screen Size</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.display.screenSize}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Resolution</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.display.resolution}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Refresh Rate</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.display.refreshRate}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Peak Brightness</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.display.peakBrightness}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Chassis Material</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.display.chassisMaterial}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Camera Specs Bento */}
            {(activeSpecTab === 'all' || activeSpecTab === 'camera') && (
              <div className="p-6 rounded-2xl bg-white shadow-xs border border-[#e2e8f0] space-y-4">
                <div className="flex items-center gap-2.5 text-[#004ac6]">
                  <span className="material-symbols-outlined text-[22px]">photo_camera</span>
                  <h3 className="text-[18px] font-semibold text-[#0b1c30]">Pro Camera System</h3>
                </div>
                <div className="space-y-2.5 text-[13px]">
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Primary Camera</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.camera.primary}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Ultra Wide</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.camera.ultraWide}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Telephoto</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.camera.telephoto}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Camera Control</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.camera.cameraControl}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Video Recording</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.camera.videoRecording}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Specs Bento */}
            {(activeSpecTab === 'all' || activeSpecTab === 'performance') && (
              <div className="p-6 rounded-2xl bg-white shadow-xs border border-[#e2e8f0] space-y-4">
                <div className="flex items-center gap-2.5 text-[#004ac6]">
                  <span className="material-symbols-outlined text-[22px]">memory</span>
                  <h3 className="text-[18px] font-semibold text-[#0b1c30]">Processor &amp; Intelligence</h3>
                </div>
                <div className="space-y-2.5 text-[13px]">
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Chipset</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.performance.chipset}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">CPU Cores</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.performance.cpuCores}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">GPU Cores</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.performance.gpuCores}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Neural Engine</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.performance.neuralEngine}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">RAM Capacity</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.performance.ram}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Battery & Charging */}
            {(activeSpecTab === 'all' || activeSpecTab === 'battery') && (
              <div className="p-6 rounded-2xl bg-white shadow-xs border border-[#e2e8f0] space-y-4">
                <div className="flex items-center gap-2.5 text-[#004ac6]">
                  <span className="material-symbols-outlined text-[22px]">bolt</span>
                  <h3 className="text-[18px] font-semibold text-[#0b1c30]">Battery &amp; Fast Charge</h3>
                </div>
                <div className="space-y-2.5 text-[13px]">
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Video Playback</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.battery.playback}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Port Interface</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.battery.port}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">MagSafe Wireless</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.battery.wireless}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Wired Fast Charging</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.battery.wired}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Box Contents & Warranty */}
            {(activeSpecTab === 'all' || activeSpecTab === 'box') && (
              <div className="p-6 rounded-2xl bg-white shadow-xs border border-[#e2e8f0] space-y-4">
                <div className="flex items-center gap-2.5 text-[#004ac6]">
                  <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                  <h3 className="text-[18px] font-semibold text-[#0b1c30]">Retail Box &amp; Policy</h3>
                </div>
                <div className="space-y-2.5 text-[13px]">
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">In The Box</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.box.inTheBox}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Warranty Term</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.box.warranty}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Replacement Window</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.box.replacement}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Physical Inspection</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.box.inspection}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Regional Compliance & Standards Card */}
            {(activeSpecTab === 'all') && (
              <div className="p-6 rounded-2xl bg-white shadow-xs border border-[#e2e8f0] space-y-4">
                <div className="flex items-center gap-2.5 text-[#006242]">
                  <span className="material-symbols-outlined text-[22px]">policy</span>
                  <h3 className="text-[18px] font-semibold text-[#0b1c30]">BTRC &amp; Legal Standards</h3>
                </div>
                <div className="space-y-2.5 text-[13px]">
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">IMEI Whitelisting</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.compliance.imeiWhitelisting}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Cellular 5G Bands</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.compliance.cellular5G}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">eSIM Operators</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.compliance.esimOperators}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-[#eff4ff] px-3.5 rounded-lg">
                    <span className="text-[#434655]">Invoice Type</span>
                    <span className="text-[#0b1c30] font-semibold">{product.specs.compliance.invoiceType}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Physical Store Pickup & Experience Location Card */}
      <section className="max-w-[1440px] w-full mx-auto px-6 lg:px-12 py-16" id="store-location">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Store Info Card (7 Cols) */}
          <div className="lg:col-span-7 p-8 rounded-2xl bg-white shadow-xs border border-[#e2e8f0] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[#004ac6]/10 text-[#004ac6] text-[11px] font-semibold">
                {settings.brandName} Outlet
                </span>
                <span className="flex items-center gap-1 text-[11px] text-[#006242] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#006242]"></span>
                Outlet hours
                </span>
              </div>
              <h3 className="text-[28px] sm:text-[32px] font-bold text-[#0b1c30] tracking-tight leading-tight">
                Pick up your {product.model} at Theme Omar Plaza
              </h3>
              <p className="text-[15px] text-[#434655] leading-relaxed">
                Prefer testing in person? Experience the {selectedColor} colorway, test the 120Hz display, and allow our technical specialists to unbox and transfer data from your previous phone at zero extra charge.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-[#eff4ff] space-y-1 border border-[#e2e8f0]">
                  <div className="flex items-center gap-2 text-[#004ac6] text-[13px] font-semibold">
                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                    <span>Experience Address</span>
                  </div>
                  <p className="text-[13px] text-[#0b1c30] font-medium">{settings.footerLocation}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#eff4ff] space-y-1 border border-[#e2e8f0]">
                  <div className="flex items-center gap-2 text-[#004ac6] text-[13px] font-semibold">
                    <span className="material-symbols-outlined text-[18px]">schedule</span>
                    <span>Visiting Hours</span>
                  </div>
                  <p className="text-[13px] text-[#0b1c30] font-medium whitespace-pre-line">{settings.storeHours}</p>
                </div>
              </div>
            </div>

            {/* Testing Policy Notice */}
            <div className="p-4 rounded-xl bg-[#dae2fd]/40 border border-[#c3c6d7]/40 flex items-start gap-3">
              <span className="material-symbols-outlined text-[22px] text-[#131b2e] shrink-0 mt-0.5">
                fact_check
              </span>
              <div className="space-y-1">
                <h4 className="text-[13px] font-semibold text-[#131b2e]">
                  Physical Testing &amp; Data Migration Policy
                </h4>
                <p className="text-[12px] text-[#5c647a] leading-relaxed">
                  We provide high-speed WiFi and data transfer workstations. You are entitled to run Apple Diagnostic checks, camera testing, and display uniform test right before final handoff.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#eff4ff] text-[13px] font-semibold text-[#0b1c30] hover:bg-[#e5eeff] transition-colors border border-[#e2e8f0]"
                href={`tel:${settings.contactNumber}`}
              >
                <span className="material-symbols-outlined text-[18px] text-[#004ac6]">call</span>
                <span>{settings.contactNumber}</span>
              </a>
              <a
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#004ac6] text-white text-[13px] font-semibold hover:bg-[#2563eb] transition-colors shadow-sm"
                href={`https://maps.google.com/?q=${encodeURIComponent(settings.footerLocation)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined text-[18px]">directions</span>
                <span>Get Directions via Google Maps</span>
              </a>
            </div>
          </div>

          {/* Map Section (5 Cols) */}
          <div className="lg:col-span-5 rounded-2xl overflow-hidden shadow-xs border border-[#e2e8f0] flex flex-col bg-white">
            <div
              className="bg-cover bg-center w-full h-80 min-h-[300px] flex-1 relative"
              style={{ backgroundImage: `url('${STORE_MAP_IMAGE}')` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1c30]/85 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full bg-[#ba1a1a]"></span>
                  <span className="text-[12px] font-bold tracking-wide uppercase">
                    {settings.brandName} Storefront
                  </span>
                </div>
                <p className="text-[18px] font-semibold">{settings.footerLocation}</p>
                <p className="text-[13px] opacity-90">Central Rajshahi Shopping District</p>
              </div>
            </div>
            <div className="p-5 flex items-center justify-between bg-[#eff4ff] border-t border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[24px] text-[#004ac6]">
                  local_parking
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-[#0b1c30]">
                    Underground Parking Available
                  </p>
                  <p className="text-[12px] text-[#434655]">
                    Free 1-hour parking voucher with device purchase
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[20px] text-[#006242]">verified</span>
            </div>
          </div>
        </div>
      </section>

      {/* Inquiry Modal */}
      <InquiryModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        product={product}
        selectedColor={selectedColor}
        selectedStorage={selectedStorage}
        selectedSim={selectedSim}
        currentPrice={currentPrice}
        onSubmitSuccess={(data) => {
          onToast(`Reservation logged for ${data.name}! We will contact you via WhatsApp shortly.`);
        }}
      />
    </div>
  );
};
