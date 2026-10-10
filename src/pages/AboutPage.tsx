import React from 'react';
import { useSiteSettings } from '../components/SiteSettingsContext';

export const AboutPage: React.FC = () => {
  const settings = useSiteSettings();
  return (
    <main className="min-h-[70vh] bg-[#f8f9ff] px-6 py-16 lg:px-12">
      <section className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="space-y-5">
          <p className="text-[11px] uppercase font-bold tracking-wider text-[#006242]">About {settings.brandName}</p>
          <h1 className="text-[36px] font-bold leading-tight text-[#0b1c30]">{settings.tagline}</h1>
          <p className="text-[16px] leading-relaxed text-[#565e74]">{settings.heroDescription}</p>
          <p className="text-[14px] leading-relaxed text-[#434655]">Visit our Rajshahi storefront to inspect products in person, compare models, and get help selecting the right device.</p>
        </div>
        <img width={960} height={720} src={settings.heroBanners[0] || settings.logoUrl} alt={`${settings.brandName} storefront`} className="w-full aspect-[4/3] rounded-xl border border-[#e2e8f0] bg-white object-cover" />
      </section>
    </main>
  );
};
