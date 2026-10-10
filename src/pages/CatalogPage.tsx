import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { useSiteSettings } from '../components/SiteSettingsContext';

interface CatalogPageProps {
  products: Product[];
  brandFilter?: 'Apple' | 'Samsung' | 'all';
  onSelectProduct: (productId: string) => void;
  onAddToCompare: (product: Product) => void;
  compareList: Product[];
  onNavigateStore: () => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  products,
  brandFilter = 'all',
  onSelectProduct,
  onAddToCompare,
  compareList,
  onNavigateStore,
}) => {
  const settings = useSiteSettings();
  // Filters state
  const [inStockOnly, setInStockOnly] = useState(true);
  const [preOrder, setPreOrder] = useState(false);
  const [maxPrice, setMaxPrice] = useState(185000);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([
    'Brand New',
    'Pre-Owned (Like New 99%)',
  ]);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([
    'iPhone 16 Series',
    'iPhone 15 Series',
  ]);
  const [selectedStorage, setSelectedStorage] = useState<string>('256 GB');
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['USA']);
  const [selectedBatteryTier, setSelectedBatteryTier] = useState<string[]>(['90% - 100%']);
  const [sortBy, setSortBy] = useState('Latest Arrivals');
  const [currentPage, setCurrentPage] = useState(1);

  // Toggle helpers
  const toggleCondition = (cond: string) => {
    setSelectedConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
  };

  const toggleSeries = (ser: string) => {
    setSelectedSeries((prev) =>
      prev.includes(ser) ? prev.filter((s) => s !== ser) : [...prev, ser]
    );
  };

  const toggleRegion = (reg: string) => {
    setSelectedRegions((prev) =>
      prev.includes(reg) ? prev.filter((r) => r !== reg) : [...prev, reg]
    );
  };

  const handleResetFilters = () => {
    setInStockOnly(true);
    setPreOrder(false);
    setMaxPrice(220000);
    setSelectedConditions(['Brand New', 'Pre-Owned (Like New 99%)']);
    setSelectedSeries(['iPhone 16 Series', 'iPhone 15 Series', 'iPhone 14 Series']);
    setSelectedStorage('256 GB');
    setSelectedRegions(['USA']);
    setSelectedBatteryTier(['90% - 100%']);
    setSortBy('Latest Arrivals');
  };

  // Filter computation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (brandFilter === 'Apple' && p.brand !== 'Apple') return false;
      if (brandFilter === 'Samsung' && p.brand !== 'Samsung') return false;

      // Price filter
      if (p.basePrice > maxPrice) return false;

      // Condition filter
      if (selectedConditions.length > 0) {
        const matchesCondition = selectedConditions.some((c) => p.condition.includes(c));
        if (!matchesCondition) return false;
      }

      // Series filter
      if (selectedSeries.length > 0) {
        if (!selectedSeries.includes(p.series)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'Price: Low to High') return a.basePrice - b.basePrice;
      if (sortBy === 'Price: High to Low') return b.basePrice - a.basePrice;
      if (sortBy === 'Battery Health: Highest') return (b.batteryHealth || 100) - (a.batteryHealth || 100);
      return 0; // Latest
    });
  }, [products, brandFilter, maxPrice, selectedConditions, selectedSeries, sortBy]);

  return (
    <div className="flex flex-col w-full">
      {/* Top Breadcrumb & Title Banner */}
      <div className="w-full bg-[#eff4ff] py-8 shadow-xs border-b border-[#e2e8f0]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <nav className="flex items-center gap-2 text-[13px] text-[#434655]">
              <span className="hover:text-[#004ac6] cursor-pointer">Home</span>
              <span className="material-symbols-outlined text-[16px] text-[#c3c6d7]">
                chevron_right
              </span>
              <span className="hover:text-[#004ac6] cursor-pointer">
                {brandFilter === 'Samsung' ? 'Android Flagships' : 'iPhones'}
              </span>
              <span className="material-symbols-outlined text-[16px] text-[#c3c6d7]">
                chevron_right
              </span>
              <span className="text-[#0b1c30] font-semibold">All Models</span>
            </nav>
            <h1 className="text-[32px] sm:text-[36px] font-bold text-[#0b1c30] tracking-tight">
              {brandFilter === 'Samsung'
                ? 'Authentic Android Flagships'
                : 'Authentic iPhone Flagships'}
            </h1>
            <p className="text-[15px] text-[#434655] max-w-2xl">
              Browse verified brand new and certified pre-owned flagships in Rajshahi with complete warranty. Physical unit inspect-before-pay at Theme Omar Plaza.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white shadow-xs border border-[#e2e8f0]">
              <span className="material-symbols-outlined text-[#006242] text-[20px]">
                verified_user
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#0b1c30] font-bold uppercase tracking-wide">
                  Physical Check
                </span>
                <span className="text-[11px] text-[#434655]">Theme Omar Plaza, 3rd Fl</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white shadow-xs border border-[#e2e8f0]">
              <span className="material-symbols-outlined text-[#004ac6] text-[20px]">bolt</span>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#0b1c30] font-bold uppercase tracking-wide">
                  Rajshahi Express
                </span>
                <span className="text-[11px] text-[#434655]">Under 2h Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Catalog View Grid */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Dynamic Sidebar Filters */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#e2e8f0] space-y-6">
              <div className="flex items-center justify-between pb-4 bg-[#eff4ff] -mx-6 -mt-6 p-6 rounded-t-2xl border-b border-[#e2e8f0]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#004ac6] text-[22px]">tune</span>
                  <span className="text-[18px] font-bold text-[#0b1c30]">Filters</span>
                </div>
                <button
                  onClick={handleResetFilters}
                  className="text-[13px] text-[#004ac6] hover:text-[#2563eb] font-semibold cursor-pointer"
                >
                  Reset All
                </button>
              </div>

              {/* Stock Presence Toggle */}
              <div className="space-y-3">
                <span className="text-[12px] text-[#0b1c30] uppercase tracking-wider font-bold">
                  Store Availability
                </span>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-[#004ac6] accent-[#004ac6] cursor-pointer"
                  />
                  <span className="text-[13px] text-[#0b1c30] group-hover:text-[#004ac6] transition-colors flex items-center justify-between flex-1">
                    <span>In Stock at Rajshahi Store</span>
                    <span className="text-[11px] text-[#006242] bg-[#bdffdb]/40 px-2 py-0.5 rounded-full font-bold">
                      18
                    </span>
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={preOrder}
                    onChange={(e) => setPreOrder(e.target.checked)}
                    className="w-4 h-4 rounded text-[#004ac6] accent-[#004ac6] cursor-pointer"
                  />
                  <span className="text-[13px] text-[#0b1c30] group-hover:text-[#004ac6] transition-colors flex items-center justify-between flex-1">
                    <span>Pre-Order (3-5 Days)</span>
                    <span className="text-[11px] text-[#434655] bg-[#eff4ff] px-2 py-0.5 rounded-full">
                      6
                    </span>
                  </span>
                </label>
              </div>

              {/* Price Range Slider */}
              <div className="space-y-3 pt-4 border-t border-[#eff4ff]">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#0b1c30] uppercase tracking-wider font-bold">
                    Price Budget (BDT)
                  </span>
                  <span className="text-[12px] text-[#004ac6] font-bold">
                    ৳45,000 - ৳{maxPrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <input
                  type="range"
                  min="45000"
                  max="240000"
                  step="2500"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-[#004ac6] cursor-pointer h-2 bg-[#dce9ff] rounded-lg appearance-none"
                />
                <div className="flex items-center justify-between text-[11px] text-[#434655] font-medium">
                  <span>৳45K</span>
                  <span>৳130K</span>
                  <span>৳240K</span>
                </div>
              </div>

              {/* Condition */}
              <div className="space-y-3 pt-4 border-t border-[#eff4ff]">
                <span className="text-[12px] text-[#0b1c30] uppercase tracking-wider font-bold">
                  Condition
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedConditions.includes('Brand New')}
                      onChange={() => toggleCondition('Brand New')}
                      className="w-4 h-4 rounded text-[#004ac6] accent-[#004ac6] cursor-pointer"
                    />
                    <span className="text-[13px] text-[#0b1c30] group-hover:text-[#004ac6] transition-colors flex items-center justify-between flex-1">
                      <span>Brand New (Sealed Pack)</span>
                      <span className="text-[#434655] text-[12px] font-mono">11</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedConditions.includes('Pre-Owned (Like New 99%)')}
                      onChange={() => toggleCondition('Pre-Owned (Like New 99%)')}
                      className="w-4 h-4 rounded text-[#004ac6] accent-[#004ac6] cursor-pointer"
                    />
                    <span className="text-[13px] text-[#0b1c30] group-hover:text-[#004ac6] transition-colors flex items-center justify-between flex-1">
                      <span>Pre-Owned (Like New 99%)</span>
                      <span className="text-[#434655] text-[12px] font-mono">7</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group opacity-60">
                    <input
                      type="checkbox"
                      checked={selectedConditions.includes('Official Refurbished')}
                      onChange={() => toggleCondition('Official Refurbished')}
                      className="w-4 h-4 rounded text-[#004ac6] accent-[#004ac6] cursor-pointer"
                    />
                    <span className="text-[13px] text-[#0b1c30] flex items-center justify-between flex-1">
                      <span>Official Refurbished</span>
                      <span className="text-[#434655] text-[12px] font-mono">0</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Series Filter */}
              <div className="space-y-3 pt-4 border-t border-[#eff4ff]">
                <span className="text-[12px] text-[#0b1c30] uppercase tracking-wider font-bold">
                  Flagship Series
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedSeries.includes('iPhone 16 Series')}
                      onChange={() => toggleSeries('iPhone 16 Series')}
                      className="w-4 h-4 rounded text-[#004ac6] accent-[#004ac6] cursor-pointer"
                    />
                    <span className="text-[13px] text-[#0b1c30] group-hover:text-[#004ac6] transition-colors flex justify-between flex-1">
                      <span>iPhone 16 Series</span>
                      <span className="text-[#434655] font-mono text-[12px]">6</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedSeries.includes('iPhone 15 Series')}
                      onChange={() => toggleSeries('iPhone 15 Series')}
                      className="w-4 h-4 rounded text-[#004ac6] accent-[#004ac6] cursor-pointer"
                    />
                    <span className="text-[13px] text-[#0b1c30] group-hover:text-[#004ac6] transition-colors flex justify-between flex-1">
                      <span>iPhone 15 Series</span>
                      <span className="text-[#434655] font-mono text-[12px]">5</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedSeries.includes('iPhone 14 Series')}
                      onChange={() => toggleSeries('iPhone 14 Series')}
                      className="w-4 h-4 rounded text-[#004ac6] accent-[#004ac6] cursor-pointer"
                    />
                    <span className="text-[13px] text-[#0b1c30] group-hover:text-[#004ac6] transition-colors flex justify-between flex-1">
                      <span>iPhone 14 Series</span>
                      <span className="text-[#434655] font-mono text-[12px]">4</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedSeries.includes('Samsung S Series')}
                      onChange={() => toggleSeries('Samsung S Series')}
                      className="w-4 h-4 rounded text-[#004ac6] accent-[#004ac6] cursor-pointer"
                    />
                    <span className="text-[13px] text-[#0b1c30] group-hover:text-[#004ac6] transition-colors flex justify-between flex-1">
                      <span>Samsung Galaxy S Series</span>
                      <span className="text-[#434655] font-mono text-[12px]">2</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Storage Filter */}
              <div className="space-y-3 pt-4 border-t border-[#eff4ff]">
                <span className="text-[12px] text-[#0b1c30] uppercase tracking-wider font-bold">
                  Storage Capacity
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {['128 GB', '256 GB', '512 GB', '1 TB'].map((cap) => (
                    <button
                      key={cap}
                      onClick={() => setSelectedStorage(cap)}
                      className={`px-3 py-2 rounded-lg text-[13px] font-semibold text-center transition-all cursor-pointer ${
                        selectedStorage === cap
                          ? 'bg-[#004ac6] text-white shadow-xs'
                          : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff]'
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                </div>
              </div>

              {/* Region & SIM Variant */}
              <div className="space-y-3 pt-4 border-t border-[#eff4ff]">
                <span className="text-[12px] text-[#0b1c30] uppercase tracking-wider font-bold">
                  Region &amp; SIM Variant
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedRegions.includes('USA')}
                      onChange={() => toggleRegion('USA')}
                      className="w-4 h-4 rounded text-[#004ac6] accent-[#004ac6] cursor-pointer"
                    />
                    <span className="text-[13px] text-[#0b1c30] group-hover:text-[#004ac6] transition-colors flex items-center justify-between flex-1">
                      <span>USA (Dual eSIM LL/A)</span>
                      <span className="text-[#434655] font-mono text-[12px]">9</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedRegions.includes('Japan')}
                      onChange={() => toggleRegion('Japan')}
                      className="w-4 h-4 rounded text-[#004ac6] accent-[#004ac6] cursor-pointer"
                    />
                    <span className="text-[13px] text-[#0b1c30] group-hover:text-[#004ac6] transition-colors flex items-center justify-between flex-1">
                      <span>Japan (1 SIM + 1 eSIM J/A)</span>
                      <span className="text-[#434655] font-mono text-[12px]">4</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedRegions.includes('HK')}
                      onChange={() => toggleRegion('HK')}
                      className="w-4 h-4 rounded text-[#004ac6] accent-[#004ac6] cursor-pointer"
                    />
                    <span className="text-[13px] text-[#0b1c30] group-hover:text-[#004ac6] transition-colors flex items-center justify-between flex-1">
                      <span>HK / China (Dual Nano ZA/A)</span>
                      <span className="text-[#434655] font-mono text-[12px]">3</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Sidebar Warranty Callout */}
            <div className="bg-[#e5eeff] p-5 rounded-2xl space-y-3 border border-[#c3c6d7]/40">
              <div className="flex items-center gap-2 text-[#0b1c30] text-[16px] font-bold">
                <span className="material-symbols-outlined text-[#006242] text-[22px]">
                  verified
                </span>
                <span>{settings.brandName} Promise</span>
              </div>
              <p className="text-[13px] text-[#434655] leading-relaxed">
                Every device undergoes a 32-point physical diagnostic test including TrueTone, 3uTools verified scores, and battery cycle counts before being displayed at Rajshahi.
              </p>
              <div className="pt-1 flex items-center gap-2 text-[#004ac6] text-[13px] font-semibold">
                <span className="material-symbols-outlined text-[18px]">security</span>
                <span>7 Days Replacement • 1 Year Warranty</span>
              </div>
            </div>
          </aside>

          {/* Main Catalog Content */}
          <section className="lg:col-span-9 space-y-6">
            {/* Filter Bar & Active Filter Chips */}
            <div className="bg-white p-4 lg:p-6 rounded-2xl shadow-xs border border-[#e2e8f0] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-[20px] font-bold text-[#0b1c30]">Available Stock</span>
                  <span className="px-3 py-1 rounded-full bg-[#e5eeff] text-[#004ac6] text-[13px] font-bold">
                    {filteredProducts.length} Devices in Stock
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-[#434655] hidden md:inline">Sort by:</span>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="appearance-none bg-[#eff4ff] text-[#0b1c30] text-[13px] py-2 pl-3.5 pr-8 rounded-lg focus:outline-none focus:bg-[#e5eeff] cursor-pointer border border-[#e2e8f0]"
                    >
                      <option>Latest Arrivals</option>
                      <option>Price: Low to High</option>
                      <option>Price: High to Low</option>
                      <option>Battery Health: Highest</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[#434655] pointer-events-none text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Pills Filter Strip */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#eff4ff]">
                <span className="text-[11px] text-[#434655] uppercase tracking-wider mr-1 font-semibold">
                  Active:
                </span>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e5eeff] text-[#0b1c30] rounded-full text-[12px] font-medium">
                  <span>Brand New + Used 99%</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e5eeff] text-[#0b1c30] rounded-full text-[12px] font-medium">
                  <span>{selectedStorage}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e5eeff] text-[#0b1c30] rounded-full text-[12px] font-medium">
                  <span>In-Store Rajshahi</span>
                </div>
                <button
                  onClick={handleResetFilters}
                  className="text-[12px] text-[#004ac6] hover:underline ml-2 font-semibold cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Product Cards Grid (6 High Fidelity Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((phone) => (
                <div
                  key={phone.id}
                  className="bg-white rounded-2xl border border-[#e2e8f0] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group overflow-hidden"
                >
                  {/* Card Stage Image */}
                  <div
                    onClick={() => onSelectProduct(phone.id)}
                    className="relative bg-[#eff4ff] p-6 flex items-center justify-center aspect-square overflow-hidden cursor-pointer"
                  >
                    <span
                      className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        phone.condition.includes('Brand New')
                          ? 'bg-[#007d55] text-white'
                          : 'bg-[#565e74] text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {phone.condition.includes('Brand New') ? 'new_releases' : 'autorenew'}
                      </span>{' '}
                      {phone.condition}
                    </span>
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-white shadow-xs text-[11px] text-[#0b1c30] font-mono font-bold">
                      {phone.regionVariantBadge}
                    </span>
                    <img
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      alt={phone.title}
                      src={phone.imageUrl || phone.gallery.find((image) => image.isPrimary)?.src || phone.gallery[0]?.src || ''}
                    />
                  </div>

                  {/* Card Info */}
                  <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[#434655] text-[11px]">
                        <span className="font-mono uppercase font-semibold text-[#004ac6]">
                          {phone.colors[0]?.name}
                        </span>
                        <span className="bg-[#e5eeff] px-2 py-0.5 rounded font-mono font-bold text-[#0b1c30]">
                          {phone.storages[0]?.capacity}
                        </span>
                      </div>
                      <h3
                        onClick={() => onSelectProduct(phone.id)}
                        className="text-[18px] font-bold text-[#0b1c30] group-hover:text-[#004ac6] transition-colors cursor-pointer"
                      >
                        {phone.model}
                      </h3>
                      {(phone.weightSpecifications || phone.detailedDescription || phone.description) && (
                        <p className="text-[12px] text-[#434655] line-clamp-2">
                          {[phone.weightSpecifications, phone.detailedDescription || phone.description]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[12px] text-[#434655]">
                        {(phone.batteryHealth ?? (phone.condition === 'Brand New' ? 100 : undefined)) !== undefined ? (
                          <>
                            <span className="material-symbols-outlined text-[#006242] text-[18px]">
                              battery_charging_full
                            </span>
                            <span className="font-bold text-[#006242]">
                              {phone.batteryHealth ?? 100}% Battery Health
                            </span>
                            <span>• {phone.regionCountryCode}</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[#006242] text-[18px]">
                              verified
                            </span>
                            <span>{phone.condition === 'Brand New' ? 'Sealed Box • 100% Battery • Active' : `${phone.condition} • Battery health not recorded`}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-[#eff4ff]">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-[20px] text-[#0b1c30] font-bold">
                            ৳{phone.basePrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[13px] text-[#434655] line-through ml-2">
                            ৳{phone.originalPrice.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#006242] font-bold bg-[#eff4ff] px-2 py-0.5 rounded">
                          Ready in Store
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#006242] text-white text-[13px] font-semibold hover:bg-[#007d55] transition-colors shadow-xs"
                          href={`https://wa.me/${settings.whatsAppNumber}?text=Hello%20${encodeURIComponent(settings.brandName)},%20is%20${encodeURIComponent(
                            phone.model
                          )}%20${phone.storages[0]?.capacity}%20${phone.colors[0]?.name}%20available?`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="material-symbols-outlined text-[18px]">chat</span>
                          <span>WhatsApp Order</span>
                        </a>
                        <button
                          onClick={() => onAddToCompare(phone)}
                          className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                            compareList.some((c) => c.id === phone.id)
                              ? 'bg-[#004ac6] text-white border-[#004ac6]'
                              : 'bg-[#eff4ff] hover:bg-[#e5eeff] text-[#434655] hover:text-[#004ac6] border-[#e2e8f0]'
                          }`}
                          title={
                            compareList.some((c) => c.id === phone.id)
                              ? 'In Comparison list'
                              : 'Add to Compare'
                          }
                        >
                          <span className="material-symbols-outlined text-[20px]">balance</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Section */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-[13px] text-[#434655]">
                Showing <strong className="text-[#0b1c30]">1 - {filteredProducts.length}</strong> of{' '}
                <strong className="text-[#0b1c30]">18</strong> authentic flagships
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  className={`w-10 h-10 rounded-xl text-[13px] font-bold shadow-xs transition-colors cursor-pointer ${
                    currentPage === 1
                      ? 'bg-[#004ac6] text-white'
                      : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff]'
                  }`}
                >
                  1
                </button>
                <button
                  onClick={() => setCurrentPage(2)}
                  className={`w-10 h-10 rounded-xl text-[13px] font-medium transition-colors cursor-pointer ${
                    currentPage === 2
                      ? 'bg-[#004ac6] text-white'
                      : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff]'
                  }`}
                >
                  2
                </button>
                <button
                  onClick={() => setCurrentPage(3)}
                  className={`w-10 h-10 rounded-xl text-[13px] font-medium transition-colors cursor-pointer ${
                    currentPage === 3
                      ? 'bg-[#004ac6] text-white'
                      : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff]'
                  }`}
                >
                  3
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
                  className="flex items-center gap-1 px-4 h-10 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[13px] font-medium transition-colors ml-2 cursor-pointer"
                >
                  <span>Next</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Full-Width Bottom WhatsApp Consultation Banner */}
      <div className="w-full bg-gradient-to-r from-[#e5eeff] to-[#dce9ff] py-12 px-6 lg:px-12 my-6">
        <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-8 bg-white p-8 lg:p-10 rounded-3xl shadow-sm border border-[#e2e8f0]">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#007d55] flex items-center justify-center shrink-0 shadow-sm text-white">
              <span className="material-symbols-outlined text-[36px]">forum</span>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-[#006242] font-bold tracking-wider uppercase">
                Direct Rajshahi Concierge
              </span>
              <h2 className="text-[24px] font-bold text-[#0b1c30] tracking-tight">
                Can&apos;t find your specific model or color?
              </h2>
              <p className="text-[14px] text-[#434655] max-w-xl">
                Message our Rajshahi sales desk on WhatsApp directly. We procure sealed-pack units within 48 hours with verified factory imei records.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0 w-full lg:w-auto">
            <a
              className="px-6 py-4 rounded-xl bg-[#006242] hover:bg-[#007d55] text-white text-[13px] font-semibold flex items-center justify-center gap-2.5 shadow-sm transition-all"
              href={`https://wa.me/${settings.whatsAppNumber}?text=${encodeURIComponent(`Salam ${settings.brandName}, I am looking for a specific flagship model in Rajshahi`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="material-symbols-outlined text-[20px]">chat</span>
              <span>Message Rajshahi Desk</span>
            </a>
            <button
              onClick={onNavigateStore}
              className="px-6 py-4 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[13px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">store</span>
              <span>Visit Omar Plaza Shop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
