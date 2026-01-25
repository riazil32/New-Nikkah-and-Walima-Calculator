
import React from 'react';
import { BudgetCategory, MahrType } from './types';

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  { key: 'venue', name: 'Venue & Nikkah Hall', icon: '🕌', color: 'bg-emerald-100 text-emerald-700', basePercentage: 0.25 },
  { key: 'catering', name: 'Catering & Walima', icon: '🍽️', color: 'bg-teal-100 text-teal-700', basePercentage: 0.30 },
  { key: 'mehndi', name: 'Mehndi & Pre-Wedding', icon: '✨', color: 'bg-amber-100 text-amber-700', basePercentage: 0.08 },
  { key: 'photography', name: 'Photography & Cinema', icon: '📸', color: 'bg-purple-100 text-purple-700', basePercentage: 0.10 },
  { key: 'decor', name: 'Floral & Stage Decor', icon: '💐', color: 'bg-pink-100 text-pink-700', basePercentage: 0.10 },
  { key: 'attire', name: 'Attire & Jewellery', icon: '👗', color: 'bg-rose-100 text-rose-700', basePercentage: 0.08 },
  { key: 'gifts', name: 'Gifts & Favours', icon: '🎁', color: 'bg-indigo-100 text-indigo-700', basePercentage: 0.05 },
  { key: 'other', name: 'Logistics & Extras', icon: '🚗', color: 'bg-blue-100 text-blue-700', basePercentage: 0.04 }
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
