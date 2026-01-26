
import React from 'react';
import { BudgetCategory, MahrType, Currency, CategorySection } from './types';

export const CURRENCIES: Currency[] = [
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

export const SECTION_LABELS: Record<CategorySection, { title: string; icon: string }> = {
  events: { title: 'The Events', icon: '🎊' },
  personal: { title: 'Personal & Attire', icon: '💍' },
  logistics: { title: 'Media & Logistics', icon: '📦' },
};

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  // === THE EVENTS ===
  { key: 'nikkah', name: 'Nikkah Ceremony', icon: '🕌', color: 'bg-emerald-100 text-emerald-700', basePercentage: 0.05, section: 'events', defaultPayer: 'joint' },
  { key: 'civil-registry', name: 'Civil Registry', icon: '📜', color: 'bg-slate-100 text-slate-700', basePercentage: 0.01, section: 'events', defaultPayer: 'joint' },
  { key: 'walima-venue', name: 'Walima Venue', icon: '🏛️', color: 'bg-teal-100 text-teal-700', basePercentage: 0.15, section: 'events', defaultPayer: 'groom' },
  { key: 'catering', name: 'Catering & Food', icon: '🍽️', color: 'bg-amber-100 text-amber-700', basePercentage: 0.25, section: 'events', defaultPayer: 'joint' },
  { key: 'pre-wedding', name: 'Pre-Wedding Events (Mehndi, Dholki)', icon: '✨', color: 'bg-yellow-100 text-yellow-700', basePercentage: 0.06, section: 'events', defaultPayer: 'bride' },
  { key: 'entertainment', name: 'Entertainment & AV', icon: '🎤', color: 'bg-orange-100 text-orange-700', basePercentage: 0.03, section: 'events', defaultPayer: 'joint' },
  { key: 'decor', name: 'Decor & Stage', icon: '💐', color: 'bg-pink-100 text-pink-700', basePercentage: 0.06, section: 'events', defaultPayer: 'joint' },
  
  // === PERSONAL & ATTIRE ===
  { key: 'mahr', name: "Mahr (Groom's Obligation)", icon: '💎', color: 'bg-cyan-100 text-cyan-700', basePercentage: 0, section: 'personal', defaultPayer: 'groom' },
  { key: 'gold-jewellery', name: 'Gold & Jewellery', icon: '👑', color: 'bg-yellow-100 text-yellow-700', basePercentage: 0.10, section: 'personal', defaultPayer: 'bride' },
  { key: 'attire', name: 'Attire (Bride & Groom)', icon: '👗', color: 'bg-rose-100 text-rose-700', basePercentage: 0.08, section: 'personal', defaultPayer: 'joint' },
  { key: 'beauty', name: 'Hair & Makeup', icon: '💄', color: 'bg-fuchsia-100 text-fuchsia-700', basePercentage: 0.04, section: 'personal', defaultPayer: 'bride' },
  
  // === MEDIA & LOGISTICS ===
  { key: 'photography', name: 'Photography & Video', icon: '📸', color: 'bg-purple-100 text-purple-700', basePercentage: 0.10, section: 'logistics', defaultPayer: 'joint' },
  { key: 'transport', name: 'Transport', icon: '🚗', color: 'bg-blue-100 text-blue-700', basePercentage: 0.02, section: 'logistics', defaultPayer: 'joint' },
  { key: 'invitations', name: 'Invitations', icon: '💌', color: 'bg-indigo-100 text-indigo-700', basePercentage: 0.01, section: 'logistics', defaultPayer: 'joint' },
  { key: 'favours', name: 'Guest Favours', icon: '🎁', color: 'bg-violet-100 text-violet-700', basePercentage: 0.02, section: 'logistics', defaultPayer: 'joint' },
  { key: 'emergency', name: 'Emergency Fund', icon: '🛡️', color: 'bg-red-100 text-red-700', basePercentage: 0.02, section: 'logistics', defaultPayer: 'joint' },
];

export const MAHR_TYPES: MahrType[] = [
  { 
    id: 'minimum', 
    name: 'Minimum Mahr', 
    arabicName: 'المهر الأدنى', 
    grams: 30.618, 
    description: 'Absolute minimum mahr according to Hanafi Fiqh (10 Dirhams)', 
    color: 'from-blue-500 to-cyan-500', 
    bgColor: 'bg-blue-50', 
    textColor: 'text-blue-700', 
    details: 'According to the Hanafi madhab, the minimum mahr is 10 dirhams, which equals 30.618 grams of silver. The mahr must not be below this amount for a valid contract in this school of thought.' 
  },
  { 
    id: 'azwaj', 
    name: 'Mahr al-Azwaj', 
    arabicName: 'مهر أزواج النبي', 
    grams: 1530.9, 
    description: 'Highly Recommended: The Sunnah of the Prophet ﷺ', 
    color: 'from-emerald-600 to-teal-600', 
    bgColor: 'bg-emerald-50', 
    textColor: 'text-emerald-700', 
    details: 'This is the MOST PREFERABLE mahr amount. The Prophet ﷺ gave 500 dirhams (1530.9g silver) to his wives. This is established in Sahih Muslim and is recommended for those who can afford it to follow the most authentic Sunnah.' 
  },
  { 
    id: 'fatimi', 
    name: 'Mahr Fatimi', 
    arabicName: 'مهر فاطمة', 
    grams: 1749.6, 
    description: 'The mahr given by Ali (RA) to Fatima (RA)', 
    color: 'from-indigo-500 to-purple-600', 
    bgColor: 'bg-indigo-50', 
    textColor: 'text-indigo-700', 
    details: 'While widely cited, there are varied scholarly opinions on the exact gram weight of Mahr Fatimi (estimates range from 1224g to 1749.6g). Mahr al-Azwaj is often considered more certain in authentic Hadith literature.' 
  }
];

export const SILVER_NISAB_DIVISOR = 612.36;
