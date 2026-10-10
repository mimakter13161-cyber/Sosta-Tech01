import React from 'react';
import { useSiteSettings } from './SiteSettingsContext';
import { STORE_PHONE } from '../data/mockData';

interface FooterProps {
  onNavigate: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const settings = useSiteSettings();

  return (
    <footer className="w-full bg-[#ffffff] shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-t border-[#e2e8f0]/60">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Col 1: Brand & Promise */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img
                width={56}
                height={56}
                alt={`${settings.brandName} logo`}
                className="h-7 w-auto object-contain"
                src={settings.logoUrl}
              />
              <span className="font-semibold text-[20px] text-[#0b1c30]">{settings.brandName}</span>
            </div>
            <p className="text-[13px] text-[#434655] leading-relaxed">
              {settings.footerDescription}
            </p>
            <div className="flex items-center gap-2 text-[#006242] text-[13px] font-medium">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>{settings.footerTrustText}</span>
            </div>
          </div>

          {/* Col 2: Physical Experience Store */}
          <div className="space-y-3">
            <span className="text-[13px] uppercase tracking-wider text-[#0b1c30] font-bold">
              Physical Experience Store
            </span>
            <div className="space-y-2 text-[13px] text-[#434655]">
              <address className="flex items-start gap-2.5 not-italic">
                <span className="material-symbols-outlined text-[18px] text-[#004ac6] shrink-0 mt-0.5">
                  location_on
                </span>
                <span>5th Floor, Theme Omar Plaza, New Market, Rajshahi</span>
              </address>
              <a
                className="flex items-center gap-2.5 hover:text-[#004ac6] transition-colors"
                href={`tel:${STORE_PHONE}`}
              >
                <span className="material-symbols-outlined text-[18px] text-[#434655] shrink-0">call</span>
                <span>Call: {STORE_PHONE}</span>
              </a>
              <p className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#434655] shrink-0">
                  schedule
                </span>
                <span className="whitespace-pre-line">{settings.storeHours}</span>
              </p>
            </div>
          </div>

          {/* Col 3: Peace of Mind Warranty */}
          <div className="space-y-3">
            <span className="text-[13px] uppercase tracking-wider text-[#0b1c30] font-bold">
              Peace of Mind Warranty
            </span>
            <div className="space-y-2 text-[13px] text-[#434655]">
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#006242]">
                  published_with_changes
                </span>
                <span>7 Days Replacement Guarantee</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#006242]">
                  verified_user
                </span>
                <span>1 Year Official Service Warranty</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#004ac6]">
                  local_shipping
                </span>
                <span>Rajshahi Cash-on-Delivery with Inspection</span>
              </p>
            </div>
          </div>

          {/* Col 4: Direct Support & Channels */}
          <div className="space-y-3">
            <span className="text-[13px] uppercase tracking-wider text-[#0b1c30] font-bold">
              Direct Support & Channels
            </span>
            <div className="space-y-2 text-[13px] text-[#434655]">
              <a
                className="flex items-center gap-2 hover:text-[#004ac6] transition-colors"
                href={settings.facebookPageUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined text-[18px]">public</span>
                <span>{settings.facebookPageUrl.replace(/^https?:\/\//, '')}</span>
              </a>
              <a
                className="flex items-center gap-2 hover:text-[#004ac6] transition-colors"
                href="https://www.youtube.com/@SostaTechBD"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined text-[18px]">smart_display</span>
                <span>YouTube: youtube.com/@SostaTechBD</span>
              </a>
              <a
                className="flex items-center gap-2 hover:text-[#004ac6] transition-colors"
                href="https://www.instagram.com/popular/sostatech/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                <span>Instagram: instagram.com/popular/sostatech</span>
              </a>
              <a
                className="flex items-center gap-2 hover:text-[#006242] transition-colors"
                href={`https://wa.me/${settings.whatsAppNumber}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined text-[18px] text-[#006242]">chat</span>
                <span>WhatsApp: {settings.contactNumber}</span>
              </a>
              <div className="pt-2 flex items-center gap-2">
                <span className="text-[20px] font-bold text-[#0b1c30]">৳ BDT</span>
                <span className="text-[11px] text-[#434655]">Instant bKash, Nagad & Bank Card Accepted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[13px] text-[#434655] border-t border-[#eff4ff]">
          <p>{settings.footerCopyright}</p>
          <div className="flex items-center gap-6 font-medium">
            <button
              onClick={() => onNavigate('store-location')}
              className="hover:text-[#0b1c30] transition-colors"
            >
              Warranty Policy
            </button>
            <button
              onClick={() => onNavigate('store-location')}
              className="hover:text-[#0b1c30] transition-colors"
            >
              Store Locator
            </button>
            <button
              onClick={() => onNavigate('portal')}
              className="hover:text-[#0b1c30] text-[#004ac6] font-semibold transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">lock</span>
              Staff Portal
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
