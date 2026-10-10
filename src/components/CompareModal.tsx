import React, { useMemo, useState } from 'react';
import { Product } from '../types';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  inventory: Product[];
  onAddToCompare: (product: Product) => void;
  onSelectProduct: (productId: string) => void;
  onRemoveFromCompare: (productId: string) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  products,
  inventory,
  onAddToCompare,
  onSelectProduct,
  onRemoveFromCompare,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const availableDevices = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    if (!query) return [];
    return inventory
      .filter((product) =>
        !products.some((compared) => compared.id === product.id) &&
        `${product.model} ${product.title} ${product.brand} ${product.series}`.toLocaleLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [inventory, products, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0b1c30]/50 backdrop-blur-xs flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-[#ffffff] rounded-2xl shadow-2xl overflow-hidden border border-[#e2e8f0] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-[#eff4ff] border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-[#004ac6]">balance</span>
            <div>
              <h2 className="text-[20px] font-bold text-[#0b1c30]">Flagship Specification Comparison</h2>
              <p className="text-[12px] text-[#434655]">
                Compare display, camera, chip, battery, and Rajshahi pricing side by side
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-[#e5eeff] flex items-center justify-center text-[#0b1c30] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content Table */}
        <div className="p-6 overflow-x-auto flex-1">
          {products.length < 3 && (
            <div className="relative mb-6 max-w-xl">
              <label htmlFor="compare-device-search" className="mb-2 block text-[13px] font-semibold text-[#0b1c30]">
                + Add Device to Compare
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[#565e74]">search</span>
                <input
                  id="compare-device-search"
                  type="search"
                  role="combobox"
                  aria-expanded={isSearchOpen && availableDevices.length > 0}
                  aria-controls="compare-device-suggestions"
                  aria-autocomplete="list"
                  autoComplete="off"
                  value={searchTerm}
                  onFocus={() => setIsSearchOpen(true)}
                  onBlur={() => window.setTimeout(() => setIsSearchOpen(false), 120)}
                  onChange={(event) => { setSearchTerm(event.target.value); setIsSearchOpen(true); }}
                  placeholder="Search inventory by model, brand, or series"
                  className="h-11 w-full rounded-lg border border-[#d4d9e5] bg-white pl-10 pr-3 text-[13px] text-[#0b1c30] outline-none focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/15"
                />
              </div>
              {isSearchOpen && searchTerm.trim() && (
                <div id="compare-device-suggestions" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-[#d4d9e5] bg-white p-1 shadow-xl animate-in fade-in slide-in-from-top-1">
                  {availableDevices.map((device) => (
                    <button
                      key={device.id}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        onAddToCompare(device);
                        setSearchTerm('');
                        setIsSearchOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-[#eff4ff]"
                    >
                      <img
                        src={device.imageUrl || device.gallery.find((image) => image.isPrimary)?.src || device.gallery[0]?.src || ''}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded bg-[#f8f9ff] object-contain p-1"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-[#0b1c30]">{device.model}</span>
                        <span className="block truncate text-[11px] text-[#565e74]">{device.brand} · {device.series} · ৳{device.basePrice.toLocaleString('en-IN')}</span>
                      </span>
                      <span className="material-symbols-outlined text-[18px] text-[#004ac6]">add_circle</span>
                    </button>
                  ))}
                  {availableDevices.length === 0 && (
                    <p className="px-3 py-3 text-[12px] text-[#565e74]">No other matching devices found in inventory.</p>
                  )}
                </div>
              )}
              <p className="mt-1.5 text-[11px] text-[#565e74]">{products.length} of 3 comparison slots used.</p>
            </div>
          )}
          {products.length === 0 ? (
            <div className="text-center py-12 text-[#434655]">
              <p className="text-[16px] font-semibold text-[#0b1c30]">No phones added to comparison</p>
              <p className="text-[13px] text-[#434655] mt-1">
                Click the compare icon on any device card to compare up to 3 models.
              </p>
            </div>
          ) : (
            <div className="min-w-[600px]">
              {/* Product Headers */}
              <div
                className="grid gap-4 pb-6 border-b border-[#e2e8f0]"
                style={{ gridTemplateColumns: `160px repeat(${products.length}, minmax(0, 1fr))` }}
              >
                <div></div>
                {products.map((p) => (
                  <div key={p.id} className="flex flex-col items-center text-center p-3 rounded-xl bg-[#eff4ff] relative">
                    <button
                      onClick={() => onRemoveFromCompare(p.id)}
                      aria-label={`Remove ${p.model} from comparison`}
                      className="absolute top-2 right-2 text-[#434655] hover:text-[#ba1a1a]"
                      title="Remove"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                    <img
                      src={p.imageUrl || p.gallery.find((image) => image.isPrimary)?.src || p.gallery[0]?.src || ''}
                      alt={p.title}
                      className="w-20 h-20 object-contain p-1"
                    />
                    <h4 className="font-bold text-[14px] text-[#0b1c30] mt-2 leading-tight">
                      {p.model}
                    </h4>
                    <span className="text-[11px] text-[#004ac6] font-semibold mt-0.5">
                      {p.condition}
                    </span>
                    <span className="text-[16px] font-bold text-[#0b1c30] mt-1">
                      ৳{p.basePrice.toLocaleString('en-IN')}
                    </span>
                    <button
                      onClick={() => {
                        onSelectProduct(p.id);
                        onClose();
                      }}
                      className="mt-2.5 px-3 py-1.5 rounded-lg bg-[#004ac6] hover:bg-[#2563eb] text-white text-[11px] font-semibold transition-colors"
                    >
                      View Specs & Buy
                    </button>
                  </div>
                ))}
              </div>

              {/* Rows */}
              <div className="space-y-4 pt-6 text-[13px]">
                {/* Display */}
                <div>
                  <h5 className="font-bold text-[11px] uppercase tracking-wider text-[#004ac6] mb-2">
                    Display & Screen
                  </h5>
                  <div
                    className="grid gap-4 py-2 border-b border-[#eff4ff]"
                    style={{ gridTemplateColumns: `160px repeat(${products.length}, minmax(0, 1fr))` }}
                  >
                    <span className="font-medium text-[#434655]">Display Type</span>
                    {products.map((p) => (
                      <span key={p.id} className="text-[#0b1c30] font-semibold">
                        {p.specs.display.screenSize}
                      </span>
                    ))}
                  </div>
                  <div
                    className="grid gap-4 py-2 border-b border-[#eff4ff]"
                    style={{ gridTemplateColumns: `160px repeat(${products.length}, minmax(0, 1fr))` }}
                  >
                    <span className="font-medium text-[#434655]">Refresh Rate</span>
                    {products.map((p) => (
                      <span key={p.id} className="text-[#0b1c30]">
                        {p.specs.display.refreshRate}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Performance */}
                <div>
                  <h5 className="font-bold text-[11px] uppercase tracking-wider text-[#004ac6] mb-2">
                    Performance & Silicon
                  </h5>
                  <div
                    className="grid gap-4 py-2 border-b border-[#eff4ff]"
                    style={{ gridTemplateColumns: `160px repeat(${products.length}, minmax(0, 1fr))` }}
                  >
                    <span className="font-medium text-[#434655]">Chipset</span>
                    {products.map((p) => (
                      <span key={p.id} className="text-[#0b1c30] font-semibold">
                        {p.specs.performance.chipset}
                      </span>
                    ))}
                  </div>
                  <div
                    className="grid gap-4 py-2 border-b border-[#eff4ff]"
                    style={{ gridTemplateColumns: `160px repeat(${products.length}, minmax(0, 1fr))` }}
                  >
                    <span className="font-medium text-[#434655]">RAM</span>
                    {products.map((p) => (
                      <span key={p.id} className="text-[#0b1c30]">
                        {p.specs.performance.ram}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Camera */}
                <div>
                  <h5 className="font-bold text-[11px] uppercase tracking-wider text-[#004ac6] mb-2">
                    Camera System
                  </h5>
                  <div
                    className="grid gap-4 py-2 border-b border-[#eff4ff]"
                    style={{ gridTemplateColumns: `160px repeat(${products.length}, minmax(0, 1fr))` }}
                  >
                    <span className="font-medium text-[#434655]">Main Camera</span>
                    {products.map((p) => (
                      <span key={p.id} className="text-[#0b1c30]">
                        {p.specs.camera.primary}
                      </span>
                    ))}
                  </div>
                  <div
                    className="grid gap-4 py-2 border-b border-[#eff4ff]"
                    style={{ gridTemplateColumns: `160px repeat(${products.length}, minmax(0, 1fr))` }}
                  >
                    <span className="font-medium text-[#434655]">Telephoto</span>
                    {products.map((p) => (
                      <span key={p.id} className="text-[#0b1c30]">
                        {p.specs.camera.telephoto}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Battery & Stock */}
                <div>
                  <h5 className="font-bold text-[11px] uppercase tracking-wider text-[#004ac6] mb-2">
                    Battery & Local Availability
                  </h5>
                  <div
                    className="grid gap-4 py-2 border-b border-[#eff4ff]"
                    style={{ gridTemplateColumns: `160px repeat(${products.length}, minmax(0, 1fr))` }}
                  >
                    <span className="font-medium text-[#434655]">Battery Endurance</span>
                    {products.map((p) => (
                      <span key={p.id} className="text-[#0b1c30]">
                        {p.specs.battery.playback}
                      </span>
                    ))}
                  </div>
                  <div
                    className="grid gap-4 py-2"
                    style={{ gridTemplateColumns: `160px repeat(${products.length}, minmax(0, 1fr))` }}
                  >
                    <span className="font-medium text-[#434655]">Rajshahi Stock</span>
                    {products.map((p) => (
                      <span key={p.id} className="text-[#007d55] font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#007d55]"></span>
                        {p.stock} Units in Theme Omar
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
