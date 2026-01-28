
export type TabType = 'budget' | 'mahr' | 'contract';

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
