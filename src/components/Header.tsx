import React, { useState } from 'react';
import { CartItem } from '../types';
import { useSiteSettings } from './SiteSettingsContext';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartItems: CartItem[];
  onOpenCart: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  cartItems,
  onOpenCart,
  onSearch,
  searchQuery,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const { logoUrl, brandName, tagline, contactNumber, whatsAppNumber } = useSiteSettings();

  return (
    <header className="fixed top-0 w-full z-50 bg-[#ffffff]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#e2e8f0]/60">
      <div className="h-20 max-w-[1440px] mx-auto px-6 lg:px-12 flex items-center justify-between gap-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-6 shrink-0">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 text-left focus:outline-none group"
          >
            <img
              width={64}
              height={64}
              alt={`${brandName} logo`}
              className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
              src={logoUrl}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/favicon.svg';
              }}
            />
            <div className="flex flex-col">
              <span className="font-semibold text-[20px] text-[#0b1c30] tracking-tight leading-none">
                {brandName}
              </span>
              <span className="text-[11px] font-semibold text-[#434655] tracking-wider uppercase mt-0.5">
                {tagline}
              </span>
            </div>
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="hidden xl:flex flex-1 max-w-md relative">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#434655] text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search flagship models, storage, RAM..."
              className="w-full h-11 pl-11 pr-4 bg-[#eff4ff] rounded-lg text-[13px] text-[#0b1c30] placeholder-[#434655] focus:outline-none focus:bg-[#ffffff] focus:ring-2 focus:ring-[#2563eb] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#434655] hover:text-[#0b1c30] text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          <button
            onClick={() => setActiveTab('iphones')}
            className={`px-3 py-2 rounded-lg text-[13px] transition-colors font-medium ${
              activeTab === 'iphones'
                ? 'bg-[#e5eeff] text-[#004ac6] font-semibold shadow-xs'
                : 'text-[#434655] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
            }`}
          >
            All Products
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`px-3 py-2 rounded-lg text-[13px] transition-colors font-medium ${
              activeTab === 'android'
                ? 'bg-[#e5eeff] text-[#004ac6] font-semibold shadow-xs'
                : 'text-[#434655] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
            }`}
          >
            Android Flagships
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-3 py-2 rounded-lg text-[13px] transition-colors font-medium ${
              activeTab === 'compare'
                ? 'bg-[#e5eeff] text-[#004ac6] font-semibold shadow-xs'
                : 'text-[#434655] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
            }`}
          >
            Compare Models
          </button>
          <button
            onClick={() => setActiveTab('store-location')}
            className={`px-3 py-2 rounded-lg text-[13px] transition-colors font-medium ${
              activeTab === 'store-location'
                ? 'bg-[#e5eeff] text-[#004ac6] font-semibold shadow-xs'
                : 'text-[#434655] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
            }`}
          >
            Store Location
          </button>
        </nav>

        {/* Direct Action Hub */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Phone Link */}
          <a
            href={`https://wa.me/${whatsAppNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#eff4ff] hover:bg-[#e5eeff] transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#007d55] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006242]"></span>
            </span>
            <span className="text-[13px] text-[#0b1c30] font-semibold">{contactNumber}</span>
          </a>

          {/* Cart Drawer Trigger */}
          <button
            onClick={onOpenCart}
            aria-label="Shopping bag"
            className="relative p-2.5 rounded-lg text-[#434655] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
            {totalCartCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#004ac6] text-white text-[10px] font-bold flex items-center justify-center">
                {totalCartCount}
              </span>
            )}
          </button>

          {/* Admin Portal Button */}
          <button
            onClick={() => setActiveTab('portal')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              activeTab === 'portal'
                ? 'bg-[#004ac6] text-white'
                : 'bg-[#eff4ff] hover:bg-[#e5eeff] text-[#434655] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
            <span>Portal</span>
          </button>

          {/* User Profile */}
          <button
            onClick={() => setActiveTab('portal')}
            title="Sosta Desk Profile"
            className="w-8 h-8 rounded-full bg-[#004ac6] flex items-center justify-center text-white hover:bg-[#2563eb] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 lg:hidden text-[#434655] hover:text-[#0b1c30] rounded-lg"
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-[#e2e8f0] px-6 py-4 flex flex-col gap-2 shadow-lg">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search flagships..."
            className="w-full h-10 px-3.5 mb-2 bg-[#eff4ff] rounded-lg text-sm text-[#0b1c30]"
          />
          <button
            onClick={() => {
              setActiveTab('home');
              setMobileMenuOpen(false);
            }}
            className="text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#eff4ff]"
          >
            Home Overview
          </button>
          <button
            onClick={() => {
              setActiveTab('iphones');
              setMobileMenuOpen(false);
            }}
            className="text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#eff4ff]"
          >
            All Products Catalog
          </button>
          <button
            onClick={() => {
              setActiveTab('android');
              setMobileMenuOpen(false);
            }}
            className="text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#eff4ff]"
          >
            Android Flagships
          </button>
          <button
            onClick={() => {
              setActiveTab('compare');
              setMobileMenuOpen(false);
            }}
            className="text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#eff4ff]"
          >
            Compare Models
          </button>
          <button
            onClick={() => {
              setActiveTab('store-location');
              setMobileMenuOpen(false);
            }}
            className="text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#eff4ff]"
          >
            Store Location & Hours
          </button>
          <button
            onClick={() => {
              setActiveTab('portal');
              setMobileMenuOpen(false);
            }}
            className="text-left px-3 py-2 rounded-lg text-sm font-medium bg-[#eff4ff] text-[#004ac6] flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
            Staff & Inventory Portal
          </button>
        </div>
      )}
    </header>
  );
};
