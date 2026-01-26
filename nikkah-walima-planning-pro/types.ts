
export type TabType = 'budget' | 'mahr';

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
