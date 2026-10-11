import React, { useEffect, useState, useMemo } from 'react';
import { Product } from '../types';
import { useSiteSettings } from '../components/SiteSettingsContext';
import { getProductCategories, getProductCategory } from '../data/productCategories';

interface CatalogPageProps {
  products: Product[];
  brandFilter?: 'Apple' | 'Samsung' | 'all';
  categoryFilter?: string;
  onCategoryChange?: (category: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSelectProduct: (productId: string) => void;
  onAddToCompare: (product: Product) => void;
  compareList: Product[];
  onNavigateStore: () => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  products,
  brandFilter = 'all',
  categoryFilter = '',
  onCategoryChange,
  searchQuery = '',
  onSearchChange,
  onSelectProduct,
  onAddToCompare,
  compareList,
  onNavigateStore,
}) => {
  const settings = useSiteSettings();
  const maxAvailablePrice = Math.max(240000, ...products.map((product) => product.basePrice));
  // Filters state
  const [inStockOnly, setInStockOnly] = useState(false);
  const [preOrder, setPreOrder] = useState(false);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(maxAvailablePrice);
  const [selectedBrand, setSelectedBrand] = useState<string>(brandFilter);
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter || 'all');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [selectedStorage, setSelectedStorage] = useState<string>('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedBatteryTier, setSelectedBatteryTier] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('Latest Arrivals');
  const facetProducts = products;
  const availableSeries = Array.from(new Set(facetProducts.map((product) => product.series).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right));
  const availableCategories = getProductCategories(facetProducts);
  const availableBrands = Array.from(new Set(facetProducts.map((product) => product.brand).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right));
  const availableConditions = Array.from(new Set(facetProducts.map((product) => product.condition)))
    .sort((left, right) => left.localeCompare(right));
  const availableStorage = Array.from(new Set(facetProducts.flatMap((product) => [
    ...product.storages.map((storage) => storage.capacity),
    ...(product.variants || []).map((variant) => variant.storage),
  ]).map((storage) => storage.replace(/\s/g, ''))))
    .sort((left, right) => parseInt(left, 10) - parseInt(right, 10));
  const availableRegions = Array.from(new Set(facetProducts.map((product) => {
    const region = product.regionCountryCode.toLocaleLowerCase();
    if (region.includes('usa')) return 'USA';
    if (region.includes('japan') || region.includes('j/a')) return 'Japan';
    if (region.includes('hk') || region.includes('za/a')) return 'HK';
    return 'Other';
  }))).sort((left, right) => left.localeCompare(right));

  useEffect(() => {
    setMaxPrice((current) => Math.max(current, maxAvailablePrice));
    setMinPrice((current) => Math.min(current, maxAvailablePrice));
  }, [maxAvailablePrice]);

  useEffect(() => {
    setSelectedCategory(categoryFilter || 'all');
  }, [categoryFilter]);

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

  const selectCatalogView = (view: string) => {
    setSelectedBrand(view === 'iPhone' ? 'Apple' : ['Samsung', 'Android Flagships'].includes(view) ? 'Samsung' : 'all');
    setSelectedCategory(['all', 'iPhone', 'Samsung', 'Android Flagships'].includes(view) ? 'all' : view);
    setSelectedSeries([]);
    onCategoryChange?.(['all', 'iPhone', 'Samsung', 'Android Flagships'].includes(view) ? '' : view);
  };

  const handleResetFilters = () => {
    setInStockOnly(false);
    setPreOrder(false);
    setMinPrice(0);
    setMaxPrice(maxAvailablePrice);
    setSelectedBrand(brandFilter);
    setSelectedCategory('all');
    onCategoryChange?.('');
    setSelectedConditions([]);
    setSelectedSeries([]);
    setSelectedStorage('');
    setSelectedRegions([]);
    setSelectedBatteryTier([]);
    setSortBy('Latest Arrivals');
    onSearchChange?.('');
  };

  // Filter computation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedBrand !== 'all' && p.brand !== selectedBrand) return false;
      if (selectedCategory === 'Pre-Owned' && !p.condition.includes('Pre-Owned')) return false;
      if (selectedCategory !== 'all' && selectedCategory !== 'Pre-Owned' &&
        p.series !== selectedCategory && getProductCategory(p) !== selectedCategory) return false;

      const price = Number.isFinite(p.basePrice) ? p.basePrice : 0;
      if (price < minPrice || price > maxPrice) return false;
      if (inStockOnly && (!p.inStock || p.stock <= 0)) return false;
      if (preOrder && !p.preOrderOnly) return false;

      if (selectedConditions.length && !selectedConditions.includes(p.condition)) return false;
      if (selectedSeries.length && !selectedSeries.includes(p.series)) return false;

      if (selectedStorage) {
        const normalizedStorage = selectedStorage.replace(/\s/g, '').toLocaleLowerCase();
        const storageOptions = [
          ...p.storages.map((storage) => storage.capacity),
          ...(p.variants || []).map((variant) => variant.storage),
        ];
        if (!storageOptions.some((storage) => storage.replace(/\s/g, '').toLocaleLowerCase() === normalizedStorage)) return false;
      }

      if (selectedRegions.length && !selectedRegions.some((region) => {
        const regionText = `${p.regionCountryCode} ${p.regionVariantBadge} ${p.simVariants.map((variant) => variant.name).join(' ')}`.toLocaleLowerCase();
        if (region === 'Other') return !['usa', 'japan', 'j/a', 'hk', 'za/a'].some((term) => regionText.includes(term));
        return regionText.includes(region.toLocaleLowerCase());
      })) return false;

      if (selectedBatteryTier.length) {
        const healthValues = [
          p.batteryHealth ?? (p.condition === 'Brand New' ? 100 : undefined),
          ...(p.variants || []).map((variant) => variant.batteryHealth),
        ].filter((health): health is number => typeof health === 'number');
        if (!healthValues.some((health) => selectedBatteryTier.some((tier) =>
          tier === '90% - 100%' ? health >= 90 && health <= 100 : health >= 80 && health < 90
        ))) return false;
      }

      const query = searchQuery.trim().toLocaleLowerCase();
      if (query) {
        const searchable = [
          p.title, p.model, p.brand, p.series, p.description, p.detailedDescription,
          p.sku, p.modelIdentifier, p.regionCountryCode, p.regionVariantBadge,
          ...p.colors.map((color) => color.name),
          ...p.storages.map((storage) => storage.capacity),
          ...(p.variants || []).flatMap((variant) => [variant.ram, variant.storage, variant.color]),
        ].filter(Boolean).join(' ').toLocaleLowerCase();
        if (!searchable.includes(query)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'Price: Low to High') return a.basePrice - b.basePrice;
      if (sortBy === 'Price: High to Low') return b.basePrice - a.basePrice;
      if (sortBy === 'Battery Health: Highest') return (b.batteryHealth || 100) - (a.batteryHealth || 100);
      return 0; // Latest
    });
  }, [products, brandFilter, categoryFilter, searchQuery, selectedBrand, selectedCategory, minPrice, maxPrice, inStockOnly, preOrder, selectedConditions, selectedSeries, selectedStorage, selectedRegions, selectedBatteryTier, sortBy]);

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
                {selectedBrand === 'Samsung'
                  ? 'Android Flagships'
                  : selectedBrand === 'Apple'
                    ? 'iPhones'
                    : 'All Products'}
              </span>
              <span className="material-symbols-outlined text-[16px] text-[#c3c6d7]">
                chevron_right
              </span>
              <span className="text-[#0b1c30] font-semibold">All Models</span>
            </nav>
            <h1 className="text-[32px] sm:text-[36px] font-bold text-[#0b1c30] tracking-tight">
              {selectedBrand === 'Samsung'
                ? 'Authentic Android Flagships'
                : selectedBrand === 'Apple'
                  ? 'Authentic iPhone Flagships'
                  : 'All Products'}
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
        <nav aria-label="Product categories" className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {(['all', 'iPhone', 'Android', 'Samsung', 'Android Flagships', 'Accessories',
            ...availableCategories.filter((category) =>
              !['iPhone', 'Android', 'Samsung', 'Android Flagships', 'Accessories'].includes(category)
            )]).map((view) => {
            const isActive = view === 'all'
              ? selectedBrand === 'all' && selectedCategory === 'all'
              : view === 'iPhone'
                ? selectedBrand === 'Apple' && selectedCategory === 'all'
                : view === 'Samsung' || view === 'Android Flagships'
                  ? selectedBrand === 'Samsung' && selectedCategory === 'all'
                  : selectedCategory === view;
            const label = view === 'all' ? 'All Products' : view;
            return (
              <button
                key={view}
                type="button"
                aria-pressed={isActive}
                onClick={() => selectCatalogView(view)}
                className={`rounded-full px-5 py-2.5 text-[13px] font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#004ac6] text-white'
                    : 'border border-[#e2e8f0] bg-white text-[#434655] hover:bg-[#e5eeff] hover:text-[#004ac6]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>
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
                      {products.filter((product) => product.inStock && product.stock > 0).length}
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
                      {products.filter((product) => product.preOrderOnly).length}
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
                    ৳{minPrice.toLocaleString('en-IN')} - ৳{maxPrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-medium text-[#434655]">
                    Minimum
                    <input
                      type="number"
                      min="0"
                      max={maxPrice}
                      value={minPrice}
                      onChange={(event) => setMinPrice(Math.min(maxPrice, Math.max(0, Number(event.target.value) || 0)))}
                      className="mt-1 h-9 w-full rounded-lg border border-[#e2e8f0] bg-[#eff4ff] px-2 text-[13px] text-[#0b1c30]"
                    />
                  </label>
                  <label className="text-[11px] font-medium text-[#434655]">
                    Maximum
                    <input
                      type="number"
                      min={minPrice}
                      max={maxAvailablePrice}
                      value={maxPrice}
                      onChange={(event) => setMaxPrice(Math.max(minPrice, Math.min(maxAvailablePrice, Number(event.target.value) || 0)))}
                      className="mt-1 h-9 w-full rounded-lg border border-[#e2e8f0] bg-[#eff4ff] px-2 text-[13px] text-[#0b1c30]"
                    />
                  </label>
                </div>
                <input
                  type="range"
                  min={minPrice}
                  max={maxAvailablePrice}
                  step="1000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Math.max(minPrice, Number(e.target.value)))}
                  className="w-full accent-[#004ac6] cursor-pointer h-2 bg-[#dce9ff] rounded-lg appearance-none"
                />
                <div className="flex items-center justify-between text-[11px] text-[#434655] font-medium">
                  <span>৳{minPrice.toLocaleString('en-IN')}</span>
                  <span>৳{Math.round((minPrice + maxAvailablePrice) / 2).toLocaleString('en-IN')}</span>
                  <span>৳{maxAvailablePrice.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Condition */}
              <div className="space-y-3 pt-4 border-t border-[#eff4ff]">
                <span className="text-[12px] text-[#0b1c30] uppercase tracking-wider font-bold">
                  Condition
                </span>
                <div className="space-y-2">
                  {availableConditions.map((condition) => (
                    <label key={condition} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedConditions.includes(condition)}
                        onChange={() => toggleCondition(condition)}
                        className="w-4 h-4 rounded text-[#004ac6] accent-[#004ac6] cursor-pointer"
                      />
                      <span className="text-[13px] text-[#0b1c30] group-hover:text-[#004ac6] transition-colors">{condition}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Series Filter */}
              <div className="space-y-3 pt-4 border-t border-[#eff4ff]">
                <span className="text-[12px] text-[#0b1c30] uppercase tracking-wider font-bold">
                  Brand &amp; Category
                </span>
                <select
                  value={selectedBrand}
                  onChange={(event) => {
                    setSelectedBrand(event.target.value);
                    setSelectedCategory('all');
                    onCategoryChange?.('');
                    setSelectedConditions([]);
                    setSelectedSeries([]);
                    setSelectedStorage('');
                    setSelectedRegions([]);
                    setSelectedBatteryTier([]);
                  }}
                  aria-label="Filter by brand"
                  className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-[#eff4ff] px-3 text-[13px] text-[#0b1c30]"
                >
                  {brandFilter === 'all' && <option value="all">All brands</option>}
                  {availableBrands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                </select>
                <select
                  value={selectedCategory}
                  onChange={(event) => {
                    const category = event.target.value;
                    setSelectedCategory(category);
                    onCategoryChange?.(category === 'all' ? '' : category);
                  }}
                  aria-label="Filter by category"
                  className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-[#eff4ff] px-3 text-[13px] text-[#0b1c30]"
                >
                  <option value="all">All categories</option>
                  {availableSeries.map((series) => <option key={series} value={series}>{series}</option>)}
                  {availableCategories.filter((category) => !availableSeries.includes(category)).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                  {availableConditions.some((condition) => condition.includes('Pre-Owned')) && (
                    <option value="Pre-Owned">Pre-Owned</option>
                  )}
                </select>
                <div className="space-y-2">
                  {availableSeries.map((series) => (
                    <label key={series} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedSeries.includes(series)}
                        onChange={() => toggleSeries(series)}
                        className="w-4 h-4 rounded text-[#004ac6] accent-[#004ac6] cursor-pointer"
                      />
                      <span className="text-[13px] text-[#0b1c30] group-hover:text-[#004ac6] transition-colors">{series}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Storage Filter */}
              <div className="space-y-3 pt-4 border-t border-[#eff4ff]">
                <span className="text-[12px] text-[#0b1c30] uppercase tracking-wider font-bold">
                  Storage Capacity
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    key="all-storage"
                    onClick={() => setSelectedStorage('')}
                    className={`px-3 py-2 rounded-lg text-[13px] font-semibold text-center transition-all cursor-pointer ${
                      !selectedStorage ? 'bg-[#004ac6] text-white shadow-xs' : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff]'
                    }`}
                  >
                    All
                  </button>
                  {availableStorage.map((cap) => (
                  <button
                    key={cap}
                    onClick={() => setSelectedStorage((current) =>
                      current.replace(/\s/g, '').toLocaleLowerCase() === cap.toLocaleLowerCase() ? '' : cap
                    )}
                      className={`px-3 py-2 rounded-lg text-[13px] font-semibold text-center transition-all cursor-pointer ${
                        selectedStorage.replace(/\s/g, '').toLocaleLowerCase() === cap.toLocaleLowerCase()
                          ? 'bg-[#004ac6] text-white shadow-xs'
                          : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff]'
                      }`}
                    >
                      {cap.replace(/gb$/i, ' GB').replace(/tb$/i, ' TB')}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 pt-4 border-t border-[#eff4ff]">
                  <span className="text-[12px] text-[#0b1c30] uppercase tracking-wider font-bold">Battery Health</span>
                  {['90% - 100%', '80% - 89%'].map((tier) => (
                    <label key={tier} className="flex items-center gap-3 cursor-pointer text-[13px] text-[#0b1c30]">
                      <input
                        type="checkbox"
                        checked={selectedBatteryTier.includes(tier)}
                        onChange={() => setSelectedBatteryTier((current) => current.includes(tier)
                          ? current.filter((value) => value !== tier)
                          : [...current, tier])}
                        className="h-4 w-4 accent-[#004ac6]"
                      />
                      {tier}
                    </label>
                  ))}
                </div>
              </div>

              {/* Region & SIM Variant */}
              <div className="space-y-3 pt-4 border-t border-[#eff4ff]">
                <span className="text-[12px] text-[#0b1c30] uppercase tracking-wider font-bold">
                  Region &amp; SIM Variant
                </span>
                <div className="space-y-2">
                  {availableRegions.map((region) => (
                    <label key={region} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedRegions.includes(region)}
                        onChange={() => toggleRegion(region)}
                        className="w-4 h-4 rounded text-[#004ac6] accent-[#004ac6] cursor-pointer"
                      />
                      <span className="text-[13px] text-[#0b1c30] group-hover:text-[#004ac6] transition-colors">{region}</span>
                    </label>
                  ))}
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
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'Device' : 'Devices'}
                  </span>
                </div>
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#eff4ff] px-3 py-2 sm:max-w-sm">
                  <span className="material-symbols-outlined text-[18px] text-[#565e74]">search</span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => onSearchChange?.(event.target.value)}
                    placeholder="Search products, brands, storage..."
                    aria-label="Search catalog"
                    className="w-full min-w-0 bg-transparent text-[13px] text-[#0b1c30] outline-none"
                  />
                </label>
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

              {searchQuery.trim() && (
                <p className="border-t border-[#eff4ff] pt-3 text-[12px] text-[#434655]">
                  Search results for <strong className="text-[#0b1c30]">&ldquo;{searchQuery.trim()}&rdquo;</strong>
                </p>
              )}
            </div>

            {/* Product Cards Grid (6 High Fidelity Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                      width={600}
                      height={600}
                      loading="lazy"
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
                      <h2
                        onClick={() => onSelectProduct(phone.id)}
                        className="text-[18px] font-bold text-[#0b1c30] group-hover:text-[#004ac6] transition-colors cursor-pointer"
                      >
                        {phone.model}
                      </h2>
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
            {filteredProducts.length === 0 && (
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-10 text-center">
                <h2 className="text-[20px] font-bold text-[#0b1c30]">
                  {selectedCategory === 'Accessories' ? 'No accessories listed yet' : 'No matching products'}
                </h2>
                <p className="mt-2 text-[14px] text-[#565e74]">
                  {selectedCategory === 'Accessories'
                    ? 'Check back soon for available accessories, or browse our current smartphone stock.'
                    : 'Try changing your search or clearing one or more filters.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleResetFilters();
                    onSearchChange?.('');
                  }}
                  className="mt-5 rounded-lg bg-[#004ac6] px-5 py-2.5 text-[13px] font-semibold text-white"
                >
                  Clear filters and search
                </button>
              </div>
            )}

            <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-[13px] text-[#434655]">
                Showing <strong className="text-[#0b1c30]">{filteredProducts.length}</strong> of{' '}
                <strong className="text-[#0b1c30]">{products.filter((product) =>
                  selectedBrand === 'all' || product.brand === selectedBrand
                ).length}</strong> authentic devices
              </span>
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
