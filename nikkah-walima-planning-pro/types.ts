
export type TabType = 'budget' | 'mahr' | 'contract' | 'timeline' | 'duas' | 'guests';

export type MahrPaymentType = 'prompt' | 'deferred';

export type Payer = 'joint' | 'groom' | 'bride';

export type CategorySection = 'events' | 'personal' | 'logistics';

export interface BudgetCategory {
  key: string;
  name: string;
  icon: string;
  color: string;
  basePercentage: number;
  section: CategorySection;
  defaultPayer: Payer;
  isCustom?: boolean;
}

// Expense tracking for each category
export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface CategoryExpense {
  percentage: number;
  payer: Payer;
  // Expense tracking fields
  estimatedCost?: number; // User's manual estimate (optional override)
  actualCost?: number; // What was actually spent
  amountPaid?: number; // How much has been paid so far
  paymentStatus: PaymentStatus;
  vendor?: string; // Vendor/supplier name
  notes?: string; // Any notes
  dueDate?: string; // Payment due date
}

// Budget templates for quick setup
export interface BudgetTemplate {
  id: string;
  name: string;
  amount: number;
  description: string;
  icon: string;
}

export interface MahrType {
  id: string;
  name: string;
  arabicName: string;
  grams: number;
  description: string;
  color: string;
  bgColor: string;
  textColor: string;
  details: string;
}

export interface EnabledCategoriesState {
  [key: string]: boolean;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export interface ContractData {
  // Header Info
  dateGregorian: string;
  dateHijri: string;
  location: string;
  
  // Groom Details
  groomName: string;
  groomFatherName: string;
  
  // Bride Details
  brideName: string;
  brideFatherName: string;
  
  // Mahr Details
  mahrAmount: string;
  mahrType: MahrPaymentType;
  
  // Witnesses
  witness1Name: string;
  witness2Name: string;
  waliName: string;
  officiantName: string;
}

// Timeline Types
export interface PrayerTime {
  name: string;
  time: string; // HH:MM format
  type: 'fixed';
}

export interface WeddingEvent {
  id: string;
  name: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  description?: string;
  icon?: string; // Emoji icon for visual identification
  type: 'custom';
}

// Per-event cached prayer times data
export interface CachedPrayerData {
  prayerTimes: PrayerTime[];
  sunrise: string; // For Fajr deadline
  hijriDate: string;
  fetchedAt: string; // ISO timestamp
  // Calculated Fiqh times
  islamicMidnight: string; // Midpoint between Maghrib and next Fajr
  asrMakruhStart: string; // 20 mins before Maghrib (when sun turns yellow)
}

// Single event timeline configuration (used per-event)
export interface EventTimelineConfig {
  date: string; // YYYY-MM-DD
  city: string;
  country: string;
  method: number; // Calculation method (1-5)
  school: number; // 0 = Standard (Shafi/Maliki/Hanbali), 1 = Hanafi
  events: WeddingEvent[];
  // Per-event cached prayer times
  cachedPrayerData?: CachedPrayerData;
}

// Multi-event timeline data structure
export interface MultiEventTimelineData {
  // Active event being viewed
  activeEventId: string;
  // Shared location settings (default for new events)
  defaultCity: string;
  defaultCountry: string;
  defaultMethod: number;
  defaultSchool: number;
  // Per-event timelines
  eventTimelines: {
    [eventId: string]: EventTimelineConfig;
  };
}

// Legacy single timeline (backward compatibility)
export interface TimelineData {
  date: string;
  city: string;
  country: string;
  method: number;
  school: number;
  events: WeddingEvent[];
}

export type TimelineItem = PrayerTime | WeddingEvent;

// Timeline template for quick setup
export interface TimelineTemplate {
  id: string;
  name: string;
  description: string;
  startHour: number; // e.g., 14 for 2 PM
  events: Omit<WeddingEvent, 'id'>[];
}

// Prayer conflict info with deadline
export interface PrayerConflictInfo {
  prayer: PrayerTime;
  deadline: string; // Time by which prayer must be completed
  deadlineName: string; // e.g., "Asr" or "Sunrise"
  // Severity levels:
  // - 'info': Just informational, prayer can easily be delayed
  // - 'warning': Entering less ideal time, but still valid
  // - 'makruh': Approaching Makruh (disliked) time - e.g., late Asr when sun yellows
  // - 'critical': Very close to hard deadline - e.g., near Sunrise for Fajr
  // - 'high': Cannot delay at all - e.g., Jummah (must attend congregation)
  severity: 'info' | 'warning' | 'makruh' | 'critical' | 'high';
  // Additional context for the warning message
  warningMessage?: string;
}

// Guest Manager Types
export type GuestSide = 'groom' | 'bride' | 'joint';
export type GuestGender = 'male' | 'female';
export type GuestType = 'adult' | 'child';
export type GuestRole = 'guest' | 'vip' | 'bridesmaid' | 'groomsman' | 'colleague' | 'wali' | 'witness';
export type RsvpStatus = 'pending' | 'confirmed' | 'declined';
export type WeddingEventType = 'nikkah' | 'walima' | 'mehndi' | 'dholki' | 'civil' | string;

export interface Guest {
  id: string;
  name: string;
  side: GuestSide;
  gender: GuestGender;
  type: GuestType;
  role: GuestRole;
  rsvpStatus: RsvpStatus;
  groupId?: string;
  invitedTo: string[];
  seating: { [eventId: string]: string | null };
  tableNumber?: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

// Family/Household grouping
export interface GuestGroup {
  id: string;
  name: string;
  memberIds: string[];
  tableNumber?: string;
  createdAt: string;
}

// The wedding events that can be planned
export interface WeddingEventConfig {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  isCustom?: boolean;
}

// Guest Manager settings and state
export interface GuestManagerData {
  guests: Guest[];
  groups: GuestGroup[]; // Family/household groups
  events: WeddingEventConfig[];
  segregationMode: boolean; // Whether to enforce gender-based seating
}
