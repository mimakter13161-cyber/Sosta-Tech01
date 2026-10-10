import React from 'react';
import { STORE_MAP_IMAGE } from '../data/mockData';
import { useSiteSettings } from '../components/SiteSettingsContext';

export const StoreLocationPage: React.FC = () => {
  const settings = useSiteSettings();

  return (
    <div className="flex flex-col w-full bg-[#f8f9ff]">
      {/* Header Banner */}
      <div className="w-full bg-[#eff4ff] py-12 border-b border-[#e2e8f0]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dce9ff] text-[#004ac6] text-[12px] font-bold">
            <span className="material-symbols-outlined text-[16px]">storefront</span>
            <span>NORTH BENGAL FLAGSHIP EXPERIENCE STORE</span>
          </div>
          <h1 className="text-[36px] sm:text-[44px] font-bold text-[#0b1c30] tracking-tight">
            Store Location &amp; Visiting Hours
          </h1>
          <p className="text-[16px] text-[#434655] max-w-2xl">
            {settings.footerDescription}
          </p>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-16 space-y-12">
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Details (7 Cols) */}
          <div className="lg:col-span-7 p-8 rounded-3xl bg-white shadow-xs border border-[#e2e8f0] flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#006242] animate-ping"></span>
                <span className="text-[13px] font-bold text-[#006242] uppercase tracking-wider">
                  Outlet hours
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="p-5 rounded-2xl bg-[#eff4ff] space-y-2 border border-[#e2e8f0]">
                  <div className="flex items-center gap-2 text-[#004ac6] font-bold text-[15px]">
                    <span className="material-symbols-outlined text-[20px]">location_on</span>
                    <span>Showroom Address</span>
                  </div>
                  <p className="text-[14px] text-[#0b1c30] font-medium leading-relaxed">
                    {settings.footerLocation}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#eff4ff] space-y-2 border border-[#e2e8f0]">
                  <div className="flex items-center gap-2 text-[#004ac6] font-bold text-[15px]">
                    <span className="material-symbols-outlined text-[20px]">schedule</span>
                    <span>Working Hours</span>
                  </div>
                  <p className="text-[14px] text-[#0b1c30] font-medium whitespace-pre-line">
                    {settings.storeHours}
                  </p>
                </div>
              </div>

              {/* In-Store Testing Amenities */}
              <div className="p-6 rounded-2xl bg-[#e5eeff] space-y-3 border border-[#c3c6d7]/40">
                <h3 className="text-[16px] font-bold text-[#0b1c30] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#004ac6]">verified</span>
                  <span>Complimentary In-Store Customer Facilities</span>
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] text-[#434655]">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#006242] text-[18px]">check_circle</span>
                    Gigabit Wi-Fi data migration workstation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#006242] text-[18px]">check_circle</span>
                    Apple Diagnostic &amp; 3uTools live check
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#006242] text-[18px]">check_circle</span>
                    Free premium glass screen protector setup
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#006242] text-[18px]">check_circle</span>
                    Card POS, bKash &amp; Nagad payment terminals
                  </li>
                </ul>
              </div>
            </div>

            {/* Direct CTA links */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-[#eff4ff]">
              <a
                href={`tel:${settings.contactNumber}`}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] font-semibold text-[13px] border border-[#e2e8f0]"
              >
                <span className="material-symbols-outlined text-[18px] text-[#004ac6]">call</span>
                <span>{settings.contactNumber}</span>
              </a>
              <a
                href={`https://wa.me/${settings.whatsAppNumber}?text=${encodeURIComponent(`Salam ${settings.brandName}, I am coming to Theme Omar Plaza showroom.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#007d55] hover:bg-[#006242] text-white font-semibold text-[13px]"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                <span>Message on WhatsApp</span>
              </a>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(settings.footerLocation)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#004ac6] hover:bg-[#2563eb] text-white font-semibold text-[13px]"
              >
                <span className="material-symbols-outlined text-[18px]">directions</span>
                <span>Directions on Google Maps</span>
              </a>
            </div>
          </div>

          {/* Right Map Stage (5 Cols) */}
          <div className="lg:col-span-5 rounded-3xl overflow-hidden shadow-xs border border-[#e2e8f0] flex flex-col bg-white">
            <div
              className="w-full h-96 bg-cover bg-center relative"
              style={{ backgroundImage: `url('${STORE_MAP_IMAGE}')` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1c30]/90 via-[#0b1c30]/20 to-transparent flex flex-col justify-end p-6 text-white">
                <span className="text-[12px] font-bold text-[#6ffbbe] uppercase tracking-wider">
                  Verified Storefront Pin
                </span>
                <p className="text-[20px] font-bold mt-1">{settings.brandName} Showroom</p>
                <p className="text-[13px] opacity-90">{settings.footerLocation}</p>
              </div>
            </div>
            <div className="p-6 bg-[#eff4ff] flex items-center justify-between border-t border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[28px] text-[#004ac6]">
                  local_parking
                </span>
                <div>
                  <h4 className="text-[14px] font-bold text-[#0b1c30]">Underground Basement Parking</h4>
                  <p className="text-[12px] text-[#434655]">
                    Free 1-hour parking coupon included with any device inspection or purchase.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
