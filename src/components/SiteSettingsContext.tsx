import React, { createContext, useContext } from 'react';
import { DEFAULT_SITE_SETTINGS } from '../data/mockData';
import { SiteSettings } from '../types';

export const SiteSettingsContext = createContext<SiteSettings>(DEFAULT_SITE_SETTINGS);

export const useSiteSettings = () => useContext(SiteSettingsContext);

export const toWhatsAppNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return `88${digits}`;
  if (digits.startsWith('880')) return digits;
  if (digits.length === 10 && digits.startsWith('1')) return `880${digits}`;
  return digits;
};

export const SITE_SETTINGS_STORAGE_KEY = 'site_settings';
export const isLocalDevelopment = () =>
  import.meta.env.DEV && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const LEGACY_SITE_SETTINGS_STORAGE_KEY = 'sosta-site-settings-v1';
const LEGACY_LIVE_EDITS_STORAGE_KEY = 'sosta-live-edits-v1';

export const normalizeSiteSettings = (settings: Partial<SiteSettings>): SiteSettings => {
  const normalized = { ...DEFAULT_SITE_SETTINGS, ...settings };
  if (normalized.contactNumber === '+880 1712-345678') normalized.contactNumber = DEFAULT_SITE_SETTINGS.contactNumber;
  if (normalized.tagline === 'Rajshahi Flagship') normalized.tagline = DEFAULT_SITE_SETTINGS.tagline;
  if (normalized.footerLocation === 'Theme Omar Plaza, 3rd Floor, New Market, Rajshahi - 6000, Bangladesh') {
    normalized.footerLocation = DEFAULT_SITE_SETTINGS.footerLocation;
  }
  if (normalized.footerDescription === 'Premium smartphone experience in North Bengal. Certified authentic flagship smartphones with direct warranty and instant Rajshahi delivery.') {
    normalized.footerDescription = DEFAULT_SITE_SETTINGS.footerDescription;
  }
  if (normalized.footerTrustText === '100% Genuine Physical Stock') {
    normalized.footerTrustText = DEFAULT_SITE_SETTINGS.footerTrustText;
  }
  return {
    ...normalized,
    whatsAppNumber: toWhatsAppNumber(normalized.contactNumber),
  };
};

export const readSiteSettingsStorage = (): SiteSettings => {
  try {
    const primary = window.localStorage.getItem(SITE_SETTINGS_STORAGE_KEY);
    const legacy = primary ? null : window.localStorage.getItem(LEGACY_SITE_SETTINGS_STORAGE_KEY);
    const serialized = primary || legacy;
    const parsed: unknown = serialized ? JSON.parse(serialized) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return DEFAULT_SITE_SETTINGS;

    const settings = parsed as Partial<SiteSettings>;
    if (!settings.liveContent) {
      const savedLiveEdits = window.localStorage.getItem(LEGACY_LIVE_EDITS_STORAGE_KEY);
      if (savedLiveEdits) {
        const liveContent: unknown = JSON.parse(savedLiveEdits);
        if (liveContent && typeof liveContent === 'object' && !Array.isArray(liveContent)) {
          settings.liveContent = liveContent as SiteSettings['liveContent'];
        }
      }
    }
    return normalizeSiteSettings(settings);
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
};

export const writeSiteSettingsStorage = (settings: SiteSettings) => {
  const normalized = normalizeSiteSettings(settings);
  window.localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  window.localStorage.removeItem(LEGACY_SITE_SETTINGS_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_LIVE_EDITS_STORAGE_KEY);
};