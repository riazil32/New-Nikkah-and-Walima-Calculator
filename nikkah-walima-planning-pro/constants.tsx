
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

// Calculation methods for prayer times
export const CALCULATION_METHODS = [
  { id: 1, name: 'University of Islamic Sciences, Karachi', shortName: 'Karachi' },
  { id: 2, name: 'Islamic Society of North America (ISNA)', shortName: 'ISNA' },
  { id: 3, name: 'Muslim World League', shortName: 'MWL' },
  { id: 4, name: 'Umm Al-Qura University, Makkah', shortName: 'Makkah' },
  { id: 5, name: 'Egyptian General Authority of Survey', shortName: 'Egypt' },
];

// Asr juristic schools
export const ASR_SCHOOLS = [
  { id: 0, name: 'Standard (Shafi\'i, Maliki, Hanbali)', shortName: 'Standard' },
  { id: 1, name: 'Hanafi', shortName: 'Hanafi' },
];

// Country groupings for auto-detection
const NORTH_AMERICA = ['United States', 'Canada'];
const ARABIAN_PENINSULA = ['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Oman', 'Yemen', 'Bahrain'];
const SOUTH_ASIA = ['Pakistan', 'India', 'Bangladesh', 'Afghanistan'];
const NORTH_AFRICA = ['Egypt', 'Sudan', 'Libya', 'Algeria', 'Tunisia'];
const HANAFI_REGIONS = ['Pakistan', 'India', 'Bangladesh', 'Afghanistan', 'Turkey', 'Central Asia'];

/**
 * Get recommended calculation method based on country
 * Returns method ID for Aladhan API
 */
export const getAutoCalculationMethod = (country: string): number => {
  if (NORTH_AMERICA.includes(country)) return 2; // ISNA
  if (ARABIAN_PENINSULA.includes(country)) return 4; // Umm Al-Qura/Makkah
  if (SOUTH_ASIA.includes(country)) return 1; // Karachi
  if (NORTH_AFRICA.includes(country)) return 5; // Egyptian
  return 3; // Muslim World League (global fallback)
};

/**
 * Get recommended Asr school based on country
 * Returns 0 for Standard (Shafi/Maliki/Hanbali), 1 for Hanafi
 */
export const getAutoAsrSchool = (country: string): number => {
  if (HANAFI_REGIONS.some(region => country.includes(region) || region.includes(country))) {
    return 1; // Hanafi
  }
  return 0; // Standard
};

// Countries list for prayer times lookup (sorted alphabetically)
export const COUNTRIES = [
  { value: 'Afghanistan', label: 'Afghanistan' },
  { value: 'Albania', label: 'Albania' },
  { value: 'Algeria', label: 'Algeria' },
  { value: 'Andorra', label: 'Andorra' },
  { value: 'Angola', label: 'Angola' },
  { value: 'Antigua and Barbuda', label: 'Antigua and Barbuda' },
  { value: 'Argentina', label: 'Argentina' },
  { value: 'Armenia', label: 'Armenia' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Austria', label: 'Austria' },
  { value: 'Azerbaijan', label: 'Azerbaijan' },
  { value: 'Bahamas', label: 'Bahamas' },
  { value: 'Bahrain', label: 'Bahrain' },
  { value: 'Bangladesh', label: 'Bangladesh' },
  { value: 'Barbados', label: 'Barbados' },
  { value: 'Belarus', label: 'Belarus' },
  { value: 'Belgium', label: 'Belgium' },
  { value: 'Belize', label: 'Belize' },
  { value: 'Benin', label: 'Benin' },
  { value: 'Bhutan', label: 'Bhutan' },
  { value: 'Bolivia', label: 'Bolivia' },
  { value: 'Bosnia and Herzegovina', label: 'Bosnia and Herzegovina' },
  { value: 'Botswana', label: 'Botswana' },
  { value: 'Brazil', label: 'Brazil' },
  { value: 'Brunei', label: 'Brunei' },
  { value: 'Bulgaria', label: 'Bulgaria' },
  { value: 'Burkina Faso', label: 'Burkina Faso' },
  { value: 'Burundi', label: 'Burundi' },
  { value: 'Cabo Verde', label: 'Cabo Verde' },
  { value: 'Cambodia', label: 'Cambodia' },
  { value: 'Cameroon', label: 'Cameroon' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Central African Republic', label: 'Central African Republic' },
  { value: 'Chad', label: 'Chad' },
  { value: 'Chile', label: 'Chile' },
  { value: 'China', label: 'China' },
  { value: 'Colombia', label: 'Colombia' },
  { value: 'Comoros', label: 'Comoros' },
  { value: 'Congo (Democratic Republic of the)', label: 'Congo (Democratic Republic of the)' },
  { value: 'Congo (Republic of the)', label: 'Congo (Republic of the)' },
  { value: 'Costa Rica', label: 'Costa Rica' },
  { value: 'Côte d\'Ivoire', label: 'Côte d\'Ivoire' },
  { value: 'Croatia', label: 'Croatia' },
  { value: 'Cuba', label: 'Cuba' },
  { value: 'Cyprus', label: 'Cyprus' },
  { value: 'Czech Republic', label: 'Czech Republic' },
  { value: 'Denmark', label: 'Denmark' },
  { value: 'Djibouti', label: 'Djibouti' },
  { value: 'Dominica', label: 'Dominica' },
  { value: 'Dominican Republic', label: 'Dominican Republic' },
  { value: 'East Timor', label: 'East Timor' },
  { value: 'Ecuador', label: 'Ecuador' },
  { value: 'Egypt', label: 'Egypt' },
  { value: 'El Salvador', label: 'El Salvador' },
  { value: 'Equatorial Guinea', label: 'Equatorial Guinea' },
  { value: 'Eritrea', label: 'Eritrea' },
  { value: 'Estonia', label: 'Estonia' },
  { value: 'Eswatini', label: 'Eswatini' },
  { value: 'Ethiopia', label: 'Ethiopia' },
  { value: 'Fiji', label: 'Fiji' },
  { value: 'Finland', label: 'Finland' },
  { value: 'France', label: 'France' },
  { value: 'Gabon', label: 'Gabon' },
  { value: 'Gambia', label: 'Gambia' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Germany', label: 'Germany' },
  { value: 'Ghana', label: 'Ghana' },
  { value: 'Greece', label: 'Greece' },
  { value: 'Grenada', label: 'Grenada' },
  { value: 'Guatemala', label: 'Guatemala' },
  { value: 'Guinea', label: 'Guinea' },
  { value: 'Guinea-Bissau', label: 'Guinea-Bissau' },
  { value: 'Guyana', label: 'Guyana' },
  { value: 'Haiti', label: 'Haiti' },
  { value: 'Honduras', label: 'Honduras' },
  { value: 'Hungary', label: 'Hungary' },
  { value: 'Iceland', label: 'Iceland' },
  { value: 'India', label: 'India' },
  { value: 'Indonesia', label: 'Indonesia' },
  { value: 'Iran', label: 'Iran' },
  { value: 'Iraq', label: 'Iraq' },
  { value: 'Ireland', label: 'Ireland' },
  { value: 'Israel', label: 'Israel' },
  { value: 'Italy', label: 'Italy' },
  { value: 'Jamaica', label: 'Jamaica' },
  { value: 'Japan', label: 'Japan' },
  { value: 'Jordan', label: 'Jordan' },
  { value: 'Kazakhstan', label: 'Kazakhstan' },
  { value: 'Kenya', label: 'Kenya' },
  { value: 'Kiribati', label: 'Kiribati' },
  { value: 'Korea, North', label: 'Korea, North' },
  { value: 'Korea, South', label: 'Korea, South' },
  { value: 'Kosovo', label: 'Kosovo' },
  { value: 'Kuwait', label: 'Kuwait' },
  { value: 'Kyrgyzstan', label: 'Kyrgyzstan' },
  { value: 'Laos', label: 'Laos' },
  { value: 'Latvia', label: 'Latvia' },
  { value: 'Lebanon', label: 'Lebanon' },
  { value: 'Lesotho', label: 'Lesotho' },
  { value: 'Liberia', label: 'Liberia' },
  { value: 'Libya', label: 'Libya' },
  { value: 'Liechtenstein', label: 'Liechtenstein' },
  { value: 'Lithuania', label: 'Lithuania' },
  { value: 'Luxembourg', label: 'Luxembourg' },
  { value: 'Madagascar', label: 'Madagascar' },
  { value: 'Malawi', label: 'Malawi' },
  { value: 'Malaysia', label: 'Malaysia' },
  { value: 'Maldives', label: 'Maldives' },
  { value: 'Mali', label: 'Mali' },
  { value: 'Malta', label: 'Malta' },
  { value: 'Marshall Islands', label: 'Marshall Islands' },
  { value: 'Mauritania', label: 'Mauritania' },
  { value: 'Mauritius', label: 'Mauritius' },
  { value: 'Mexico', label: 'Mexico' },
  { value: 'Micronesia', label: 'Micronesia' },
  { value: 'Moldova', label: 'Moldova' },
  { value: 'Monaco', label: 'Monaco' },
  { value: 'Mongolia', label: 'Mongolia' },
  { value: 'Montenegro', label: 'Montenegro' },
  { value: 'Morocco', label: 'Morocco' },
  { value: 'Mozambique', label: 'Mozambique' },
  { value: 'Myanmar', label: 'Myanmar' },
  { value: 'Namibia', label: 'Namibia' },
  { value: 'Nauru', label: 'Nauru' },
  { value: 'Nepal', label: 'Nepal' },
  { value: 'Netherlands', label: 'Netherlands' },
  { value: 'New Zealand', label: 'New Zealand' },
  { value: 'Nicaragua', label: 'Nicaragua' },
  { value: 'Niger', label: 'Niger' },
  { value: 'Nigeria', label: 'Nigeria' },
  { value: 'North Macedonia', label: 'North Macedonia' },
  { value: 'Norway', label: 'Norway' },
  { value: 'Oman', label: 'Oman' },
  { value: 'Pakistan', label: 'Pakistan' },
  { value: 'Palau', label: 'Palau' },
  { value: 'Palestine', label: 'Palestine' },
  { value: 'Panama', label: 'Panama' },
  { value: 'Papua New Guinea', label: 'Papua New Guinea' },
  { value: 'Paraguay', label: 'Paraguay' },
  { value: 'Peru', label: 'Peru' },
  { value: 'Philippines', label: 'Philippines' },
  { value: 'Poland', label: 'Poland' },
  { value: 'Portugal', label: 'Portugal' },
  { value: 'Qatar', label: 'Qatar' },
  { value: 'Romania', label: 'Romania' },
  { value: 'Russia', label: 'Russia' },
  { value: 'Rwanda', label: 'Rwanda' },
  { value: 'Saint Kitts and Nevis', label: 'Saint Kitts and Nevis' },
  { value: 'Saint Lucia', label: 'Saint Lucia' },
  { value: 'Saint Vincent and the Grenadines', label: 'Saint Vincent and the Grenadines' },
  { value: 'Samoa', label: 'Samoa' },
  { value: 'San Marino', label: 'San Marino' },
  { value: 'Sao Tome and Principe', label: 'Sao Tome and Principe' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia' },
  { value: 'Senegal', label: 'Senegal' },
  { value: 'Serbia', label: 'Serbia' },
  { value: 'Seychelles', label: 'Seychelles' },
  { value: 'Sierra Leone', label: 'Sierra Leone' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'Slovakia', label: 'Slovakia' },
  { value: 'Slovenia', label: 'Slovenia' },
  { value: 'Solomon Islands', label: 'Solomon Islands' },
  { value: 'Somalia', label: 'Somalia' },
  { value: 'South Africa', label: 'South Africa' },
  { value: 'South Sudan', label: 'South Sudan' },
  { value: 'Spain', label: 'Spain' },
  { value: 'Sri Lanka', label: 'Sri Lanka' },
  { value: 'Sudan', label: 'Sudan' },
  { value: 'Suriname', label: 'Suriname' },
  { value: 'Sweden', label: 'Sweden' },
  { value: 'Switzerland', label: 'Switzerland' },
  { value: 'Syria', label: 'Syria' },
  { value: 'Taiwan', label: 'Taiwan' },
  { value: 'Tajikistan', label: 'Tajikistan' },
  { value: 'Tanzania', label: 'Tanzania' },
  { value: 'Thailand', label: 'Thailand' },
  { value: 'Togo', label: 'Togo' },
  { value: 'Tonga', label: 'Tonga' },
  { value: 'Trinidad and Tobago', label: 'Trinidad and Tobago' },
  { value: 'Tunisia', label: 'Tunisia' },
  { value: 'Turkey', label: 'Turkey' },
  { value: 'Turkmenistan', label: 'Turkmenistan' },
  { value: 'Tuvalu', label: 'Tuvalu' },
  { value: 'Uganda', label: 'Uganda' },
  { value: 'Ukraine', label: 'Ukraine' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'United States', label: 'United States' },
  { value: 'Uruguay', label: 'Uruguay' },
  { value: 'Uzbekistan', label: 'Uzbekistan' },
  { value: 'Vanuatu', label: 'Vanuatu' },
  { value: 'Vatican City', label: 'Vatican City' },
  { value: 'Venezuela', label: 'Venezuela' },
  { value: 'Vietnam', label: 'Vietnam' },
  { value: 'Yemen', label: 'Yemen' },
  { value: 'Zambia', label: 'Zambia' },
  { value: 'Zimbabwe', label: 'Zimbabwe' },
];
