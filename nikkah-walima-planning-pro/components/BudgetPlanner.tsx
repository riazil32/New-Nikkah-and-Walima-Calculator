
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Users, Calculator, ChevronDown, Edit, Check, X, Trash, RefreshCw, AlertTriangle, CheckCircle } from './Icons';
import { CustomSelect } from './CustomSelect';
import { BUDGET_CATEGORIES, CURRENCIES, SECTION_LABELS, MAHR_TYPES } from '../constants';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { BudgetCategory, Payer, CategorySection, CategoryExpense, PaymentStatus, BudgetTemplate, MahrPaymentType } from '../types';

// Budget templates in GBP (base currency) - will be converted for other currencies
const BUDGET_TEMPLATES_GBP = [
  { id: '5k', baseAmount: 5000, description: 'Intimate', icon: '💍' },
  { id: '10k', baseAmount: 10000, description: 'Modest', icon: '🎊' },
  { id: '20k', baseAmount: 20000, description: 'Traditional', icon: '✨' },
  { id: '30k', baseAmount: 30000, description: 'Grand', icon: '👑' },
  { id: '50k', baseAmount: 50000, description: 'Luxury', icon: '💎' },
];

// Approximate exchange rates from GBP (updated periodically)
const EXCHANGE_RATES_FROM_GBP: Record<string, number> = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.17,
  AED: 4.66,
  SAR: 4.76,
  PKR: 354,
  INR: 106,
  MYR: 5.98,
  CAD: 1.72,
  AUD: 1.94,
};

// Smart rounding based on currency magnitude to get "nice" numbers
const smartRound = (amount: number, currencyCode: string): number => {
  // For high-value currencies (PKR, INR), round to larger increments
  if (['PKR', 'INR'].includes(currencyCode)) {
    if (amount >= 10000000) return Math.round(amount / 5000000) * 5000000; // Round to 5M
    if (amount >= 1000000) return Math.round(amount / 500000) * 500000;   // Round to 500k
    return Math.round(amount / 100000) * 100000;                          // Round to 100k
  }
  
  // For mid-value currencies (AED, SAR), round to 25k or 50k increments
  if (['AED', 'SAR'].includes(currencyCode)) {
    if (amount >= 100000) return Math.round(amount / 50000) * 50000;      // Round to 50k
    return Math.round(amount / 25000) * 25000;                            // Round to 25k
  }
  
  // For standard currencies (GBP, USD, EUR, etc.), round to 5k increments
  if (amount >= 10000) return Math.round(amount / 5000) * 5000;           // Round to 5k
  return Math.round(amount / 1000) * 1000;                                // Round to 1k
};

// Get budget templates converted to the selected currency with smart rounding
const getBudgetTemplates = (currencyCode: string, symbol: string): BudgetTemplate[] => {
  const rate = EXCHANGE_RATES_FROM_GBP[currencyCode] || 1;
  return BUDGET_TEMPLATES_GBP.map(t => {
    const rawAmount = t.baseAmount * rate;
    const convertedAmount = smartRound(rawAmount, currencyCode);
    return {
      id: t.id,
      name: `${symbol}${convertedAmount.toLocaleString()}`,
      amount: convertedAmount,
      description: t.description,
      icon: t.icon
    };
  });
};

// Type for category data with expense tracking
type CategoryDataMap = { [key: string]: CategoryExpense };

// Type for custom categories
type CustomCategory = BudgetCategory;

// Initialize default data from constants with expense tracking
const getDefaultCategoryData = (): CategoryDataMap => {
  return BUDGET_CATEGORIES.reduce((acc, cat) => ({
    ...acc,
    [cat.key]: {
      percentage: Math.round(cat.basePercentage * 100),
      payer: cat.defaultPayer,
      paymentStatus: 'pending' as PaymentStatus,
      amountPaid: 0,
      actualCost: undefined,
      estimatedCost: undefined,
      vendor: '',
      notes: ''
    }
  }), {});
};

// Migrate old category data to new format with expense tracking
const migrateCategoryData = (data: CategoryDataMap): CategoryDataMap => {
  const migrated: CategoryDataMap = {};
  for (const [key, value] of Object.entries(data)) {
    const v = value as Partial<CategoryExpense> & { percentage?: number; payer?: Payer };
    migrated[key] = {
      percentage: v.percentage || 0,
      payer: v.payer || 'joint',
      paymentStatus: v.paymentStatus || 'pending',
      amountPaid: v.amountPaid || 0,
      actualCost: v.actualCost,
      estimatedCost: v.estimatedCost,
      vendor: v.vendor || '',
      notes: v.notes || ''
    };
  }
  return migrated;
};

interface BudgetPlannerProps {
  onNavigateToMahr?: () => void;
}

export const BudgetPlanner: React.FC<BudgetPlannerProps> = ({ onNavigateToMahr }) => {
  // Persisted state
  const [totalBudget, setTotalBudget] = useLocalStorage<string>('budget-totalBudget', '20000');
  const [guestCount, setGuestCount] = useLocalStorage<string>('budget-guestCount', '150');
  const [currencyCode, setCurrencyCode] = useLocalStorage<string>('budget-currency', 'GBP');
  const [rawCategoryData, setRawCategoryData] = useLocalStorage<CategoryDataMap>(
    'budget-categoryData-v3', // Bumped version for expense tracking
    getDefaultCategoryData()
  );
  const [customCategories, setCustomCategories] = useLocalStorage<CustomCategory[]>(
    'budget-customCategories',
    []
  );
  
  // Migrate and use category data
  const categoryData = useMemo(() => migrateCategoryData(rawCategoryData), [rawCategoryData]);
  const setCategoryData = setRawCategoryData;
  
  // Derive currency object from stored code
  const selectedCurrency = useMemo(() => 
    CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0],
    [currencyCode]
  );
  
  // Track which input is being edited and its current value
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  
  // Track which category card is expanded (for accordion behavior)
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Toggle a card and scroll it into view (compensates for accordion collapse above)
  const toggleCard = useCallback((cardKey: string) => {
    setExpandedCard(prev => {
      const newValue = prev === cardKey ? null : cardKey;
      if (newValue) {
        // After DOM updates, scroll the newly expanded card into view
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-card-key="${newValue}"]`);
          if (el) {
            // Small delay to let the collapse/expand animations settle
            setTimeout(() => {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
          }
        });
      }
      return newValue;
    });
  }, []);
  
  // Custom category form state - tracks which section we're adding to (null = not adding)
  const [addingToSection, setAddingToSection] = useState<CategorySection | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Custom category management (delete confirmation, edit mode)
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null); // key of category being deleted
  const [editingCustomCategory, setEditingCustomCategory] = useState<string | null>(null); // key of custom category being renamed
  const [editCategoryName, setEditCategoryName] = useState('');
  
  // Template toggle state (collapsed by default on mobile)
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Section collapse state (collapsed by default for simpler view)
  const [expandedSections, setExpandedSections] = useState<Record<CategorySection, boolean>>({
    events: false,
    personal: false,
    logistics: false
  });
  
  // Track which cards have Payment Tracking expanded (by category key)
  // Smart default: expanded if has data, collapsed if empty
  const [expandedPaymentTracking, setExpandedPaymentTracking] = useState<Record<string, boolean>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // One-time tooltip for payer badge (mobile only)
  // Stays visible until user taps the badge to learn the feature
  const [hasSeenPayerTip, setHasSeenPayerTip] = useLocalStorage<boolean>('budget-hasSeenPayerTip', false);
  const showPayerTip = !hasSeenPayerTip;
  
  const dismissPayerTip = () => {
    setHasSeenPayerTip(true);
  };

  // Silver price for Mahr calculations
  // Store base price in GBP and the currency it was last fetched for
  const [silverPriceGBP, setSilverPriceGBP] = useLocalStorage<number>('mahr-silverPriceGBP', 0.85);
  const [isFetchingSilver, setIsFetchingSilver] = useState(false);
  const [silverLastUpdated, setSilverLastUpdated] = useState<string | null>(null);
  const [silverFetchError, setSilverFetchError] = useState<string | null>(null);
  
  // Track which Mahr preset was selected (to detect price changes)
  const [selectedMahrPreset, setSelectedMahrPreset] = useLocalStorage<string | null>('mahr-selectedPreset', null);
  // Track the currency when preset was selected (to distinguish currency change vs price change)
  const [selectedMahrCurrency, setSelectedMahrCurrency] = useLocalStorage<string | null>('mahr-selectedCurrency', null);
  // Mahr payment type: prompt (due at Nikkah) or deferred (due later)
  const [mahrPaymentType, setMahrPaymentType] = useLocalStorage<MahrPaymentType>('mahr-paymentType', 'prompt');

  // Convert silver price from GBP to selected currency using exchange rates
  const silverPricePerGram = useMemo(() => {
    const rate = EXCHANGE_RATES_FROM_GBP[selectedCurrency.code] || 1;
    return silverPriceGBP * rate;
  }, [silverPriceGBP, selectedCurrency.code]);

  // Fetch live silver price (with fallback for dev mode)
  const fetchSilverPrice = async () => {
    setIsFetchingSilver(true);
    setSilverFetchError(null);
    try {
      const response = await fetch(`/api/silver-price?currency=GBP`);
      
      // Check if response is JSON (API available) vs HTML (404 in dev mode)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // API not available (likely dev mode) - use a reasonable default
        // Current approximate silver price: ~£0.85/gram (as of 2024)
        setSilverPriceGBP(0.85);
        setSilverLastUpdated(new Date().toLocaleTimeString() + ' (estimated)');
        setSilverFetchError('API unavailable - using estimated price');
        return;
      }
      
      const data = await response.json();
      if (data.price) {
        setSilverPriceGBP(data.price);
        setSilverLastUpdated(new Date().toLocaleTimeString());
      } else if (data.error) {
        setSilverFetchError(data.error);
      }
    } catch (error) {
      console.error("Error fetching silver price:", error);
      // Fallback to estimated price
      setSilverPriceGBP(0.85);
      setSilverLastUpdated(new Date().toLocaleTimeString() + ' (estimated)');
      setSilverFetchError('Could not fetch live price - using estimate');
    } finally {
      setIsFetchingSilver(false);
    }
  };

  // Calculate Mahr amounts based on silver price
  const mahrAmounts = useMemo(() => {
    return MAHR_TYPES.map(type => ({
      ...type,
      value: Math.round(type.grams * silverPricePerGram)
    }));
  }, [silverPricePerGram]);

  const budget = parseFloat(totalBudget) || 0;
  const guests = parseInt(guestCount) || 0;

  // Auto-update Mahr when currency changes (if a preset is selected)
  // This silently converts the value - no warning needed since it's the same amount in different currency
  useEffect(() => {
    if (selectedMahrPreset && selectedMahrCurrency && selectedMahrCurrency !== selectedCurrency.code) {
      // Currency changed - auto-update to converted value
      const presetGrams = MAHR_TYPES.find(m => m.id === selectedMahrPreset)?.grams;
      if (presetGrams) {
        const newValue = Math.round(presetGrams * silverPricePerGram);
        const newPercentage = budget > 0 ? Math.round((newValue / budget) * 100) : 0;
        setCategoryData((prev: CategoryDataMap) => ({
          ...prev,
          'mahr': {
            ...prev['mahr'],
            percentage: newPercentage,
            actualCost: newValue
          }
        }));
        // Update the tracked currency
        setSelectedMahrCurrency(selectedCurrency.code);
      }
    }
  }, [selectedCurrency.code, selectedMahrPreset, selectedMahrCurrency, silverPricePerGram, budget]);

  // Combine default and custom categories
  const allCategories = useMemo(() => {
    return [...BUDGET_CATEGORIES, ...customCategories];
  }, [customCategories]);

  // Calculate total percentage (excluding Mahr - it's a religious obligation, not a party expense)
  const totalPercentage = useMemo(() => {
    return Object.entries(categoryData).reduce<number>((sum, [key, data]) => {
      // Exclude Mahr from budget limit calculation
      if (key === 'mahr') return sum;
      const d = data as CategoryExpense;
      return sum + (d?.percentage || 0);
    }, 0);
  }, [categoryData]);

  // Calculate Mahr separately - use actualCost directly, not percentage-based calculation
  const mahrData = categoryData['mahr'] as CategoryExpense | undefined;
  const mahrActualCost = mahrData?.actualCost || 0; // The actual Mahr amount entered/selected

  const isOverBudget = totalPercentage > 100;
  const totalAllocated = (budget * totalPercentage) / 100;
  
  // Grand total including Mahr (for "Total Cash Required")
  // Deferred Mahr is excluded from immediate cash requirements
  const mahrPromptAmount = mahrPaymentType === 'prompt' ? mahrActualCost : 0;
  const grandTotalRequired = Math.round(totalAllocated + mahrPromptAmount);

  // Validation
  const budgetError = useMemo(() => {
    if (totalBudget && budget <= 0) return 'Please enter a valid budget amount';
    if (budget < 0) return 'Budget cannot be negative';
    return null;
  }, [totalBudget, budget]);

  const guestError = useMemo(() => {
    if (guestCount && guests <= 0) return 'Please enter a valid guest count';
    if (guests < 0) return 'Guest count cannot be negative';
    if (guests > 10000) return 'Guest count seems unusually high';
    return null;
  }, [guestCount, guests]);

  // Update percentage for a category
  const handlePercentageChange = (key: string, newPercentage: number) => {
    setCategoryData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        percentage: Math.max(0, Math.min(100, newPercentage)),
        payer: prev[key]?.payer || 'joint'
      }
    }));
  };

  // Update percentage from amount input (with decimal precision)
  const handleAmountChange = (key: string, amount: number) => {
    if (budget > 0) {
      const newPercentage = Math.round((amount / budget) * 10000) / 100;
      handlePercentageChange(key, newPercentage);
    }
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    setShowResetConfirm(true);
  };

  const confirmResetDefaults = () => {
    setCategoryData(getDefaultCategoryData());
    setCustomCategories([]);
    setSelectedMahrPreset(null);
    setSelectedMahrCurrency(null);
    setMahrPaymentType('prompt');
    setShowResetConfirm(false);
  };

  // Add custom category to a specific section
  const handleAddCustomCategory = (section: CategorySection) => {
    if (!newCategoryName.trim()) return;
    
    const key = `custom-${Date.now()}`;
    const newCategory: CustomCategory = {
      key,
      name: newCategoryName.trim(),
      icon: '📌',
      color: 'bg-gray-100 text-gray-700',
      basePercentage: 0,
      section: section, // Use the provided section
      defaultPayer: 'joint',
      isCustom: true
    };
    
    setCustomCategories(prev => [...prev, newCategory]);
    setCategoryData(prev => ({
      ...prev,
      [key]: { 
        percentage: 0, 
        payer: 'joint',
        paymentStatus: 'pending' as PaymentStatus,
        amountPaid: 0,
        vendor: '',
        notes: ''
      }
    }));
    setNewCategoryName('');
    setAddingToSection(null);
  };

  // Delete custom category (with confirmation)
  const handleDeleteCustomCategory = (key: string) => {
    setCustomCategories(prev => prev.filter(c => c.key !== key));
    setCategoryData(prev => {
      const newData = { ...prev };
      delete newData[key];
      return newData;
    });
    setDeletingCategory(null);
  };
  
  // Rename custom category
  const handleRenameCustomCategory = (key: string) => {
    if (!editCategoryName.trim()) return;
    setCustomCategories(prev => prev.map(c => 
      c.key === key ? { ...c, name: editCategoryName.trim() } : c
    ));
    setEditingCustomCategory(null);
    setEditCategoryName('');
  };

  // Change payer for a category
  const handlePayerChange = (key: string, newPayer: Payer) => {
    setCategoryData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        percentage: prev[key]?.percentage || 0,
        payer: newPayer
      }
    }));
  };

  // Cycle through payers (for mobile tap)
  const cyclePayer = (key: string) => {
    const currentPayer = categoryData[key]?.payer || 'joint';
    const cycle: Payer[] = ['joint', 'groom', 'bride'];
    const currentIndex = cycle.indexOf(currentPayer);
    const nextPayer = cycle[(currentIndex + 1) % 3];
    handlePayerChange(key, nextPayer);
  };

  // Calculate totals by payer (excluding Mahr - it's tracked separately)
  const payerTotals = useMemo(() => {
    const totals: Record<Payer, number> = { joint: 0, groom: 0, bride: 0 };
    Object.entries(categoryData).forEach(([key, data]) => {
      // Exclude Mahr from payer breakdown - it's a separate religious obligation
      if (key === 'mahr') return;
      const d = data as CategoryExpense;
      if (d?.percentage > 0) {
        const amount = Math.round((budget * d.percentage) / 100);
        totals[d.payer] += amount;
      }
    });
    return totals;
  }, [categoryData, budget]);
  
  // Calculate expense tracking totals
  const expenseTotals = useMemo(() => {
    let totalEstimated = 0;
    let totalActual = 0;
    let totalPaid = 0;
    let totalPending = 0;
    
    Object.entries(categoryData).forEach(([_key, data]) => {
      const d = data as CategoryExpense;
      const budgetedAmount = Math.round((budget * (d?.percentage || 0)) / 100);
      const estimated = d?.estimatedCost ?? budgetedAmount;
      const actual = d?.actualCost ?? 0;
      const paid = d?.amountPaid || 0;
      
      totalEstimated += estimated;
      totalActual += actual;
      totalPaid += paid;
      // Pending = unpaid bills (only count if there's an actual bill entered)
      if (actual > 0) {
        totalPending += Math.max(0, actual - paid);
      }
    });
    
    return { totalEstimated, totalActual, totalPaid, totalPending };
  }, [categoryData, budget]);
  
  // Calculate section totals for collapsed summary
  const getSectionTotals = (section: CategorySection) => {
    const categories = categoriesBySection[section];
    let totalPercentage = 0;
    let totalAmount = 0;
    let totalPaid = 0;
    let totalBills = 0;
    let hasIssues = false;
    
    categories.forEach(cat => {
      const data = categoryData[cat.key] as CategoryExpense;
      const percentage = data?.percentage || 0;
      const amount = Math.round((budget * percentage) / 100);
      const paid = data?.amountPaid || 0;
      const bill = data?.actualCost || 0;
      
      totalPercentage += percentage;
      totalAmount += amount;
      totalPaid += paid;
      totalBills += bill;
      
      // Check for issues
      if (bill > amount || paid > bill) hasIssues = true;
    });
    
    return { totalPercentage, totalAmount, totalPaid, totalBills, hasIssues };
  };
  
  // Update expense tracking fields
  const updateExpenseField = (key: string, field: keyof CategoryExpense, value: any) => {
    setCategoryData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };
  
  // Update payment status based on amounts
  const calculatePaymentStatus = (actual: number, paid: number): PaymentStatus => {
    if (paid >= actual && actual > 0) return 'paid';
    if (paid > 0) return 'partial';
    return 'pending';
  };
  
  // Update actual cost and auto-calculate status
  const handleActualCostChange = (key: string, value: number) => {
    const paid = categoryData[key]?.amountPaid || 0;
    setCategoryData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        actualCost: value,
        paymentStatus: calculatePaymentStatus(value, paid)
      }
    }));
  };
  
  // Update amount paid and auto-calculate status
  const handleAmountPaidChange = (key: string, value: number) => {
    const actual = categoryData[key]?.actualCost || 0;
    setCategoryData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        amountPaid: value,
        paymentStatus: calculatePaymentStatus(actual, value)
      }
    }));
  };

  // Get the Mahr category separately (it's rendered as a standalone section)
  const mahrCategory = useMemo(() => 
    allCategories.find(cat => cat.key === 'mahr'),
    [allCategories]
  );

  // Group categories by section (excluding Mahr - it has its own section)
  const categoriesBySection = useMemo(() => {
    const sections: Record<CategorySection, BudgetCategory[]> = {
      events: [],
      personal: [],
      logistics: []
    };
    
    allCategories.forEach(cat => {
      // Skip Mahr - it's rendered separately at the top
      if (cat.key === 'mahr') return;
      sections[cat.section].push(cat);
    });
    
    return sections;
  }, [allCategories]);

  const getRecommendation = (category: string, amount: number) => {
    const recommendations: Record<string, string> = {
      'nikkah': amount > 2000 ? 'Premium mosque or hotel ceremony room' : amount > 1000 ? 'Well-appointed mosque hall' : 'Local masjid or simple venue',
      'civil-registry': amount > 500 ? 'Expedited service with premium certificate' : 'Standard registry office booking',
      'walima-venue': amount > 8000 ? 'Luxury hotel ballroom or banquet hall' : amount > 4000 ? 'Quality banquet hall' : 'Community centre or masjid hall',
      'catering': amount > 10000 ? 'Premium multi-course halal fine dining' : amount > 5000 ? 'High-quality halal buffet' : 'Traditional family-style catering',
      'pre-wedding': amount > 2000 ? 'Full mehndi & dholki party package' : amount > 1000 ? 'Intimate gathering with mehndi artist' : 'Home-based celebrations with family',
      'entertainment': amount > 1500 ? 'Professional DJ & AV system' : amount > 700 ? 'Quality sound system rental' : 'Basic mic and speaker setup',
      'decor': amount > 3000 ? 'Custom stage design with fresh flowers' : amount > 1500 ? 'Themed decor with quality centrepieces' : 'Elegant minimalist decor',
      'mahr': 'Enter the Mahr amount agreed with your spouse (can sync from Mahr Calculator in Phase 2)',
      'gold-jewellery': amount > 5000 ? 'Premium gold set with stones' : amount > 2000 ? 'Quality gold jewellery set' : 'Simple gold pieces',
      'attire': amount > 3000 ? 'Designer bridal & groom wear' : amount > 1500 ? 'Premium boutique outfits' : 'Quality traditional wear',
      'beauty': amount > 1000 ? 'Premium bridal makeup artist with trials' : amount > 500 ? 'Professional makeup services' : 'Standard beauty services',
      'photography': amount > 4000 ? 'Full cinematic video + photography package' : amount > 2000 ? 'Professional all-day coverage' : 'Essential photography package',
      'transport': amount > 1500 ? 'Luxury car hire with chauffeur' : amount > 700 ? 'Quality wedding car' : 'Standard transport arrangements',
      'invitations': amount > 800 ? 'Custom designed luxury invitations' : amount > 400 ? 'Quality printed invitations' : 'Digital or simple printed invites',
      'favours': amount > 1500 ? 'Premium curated gift boxes' : amount > 700 ? 'Quality sweet boxes' : 'Simple traditional favours',
      'emergency': 'Reserve fund for unexpected costs - keep this untouched if possible!'
    };
    return recommendations[category] || 'Allocate budget as needed for this category';
  };

  // Payer badge styles - refined palette
  // Joint = violet (sits well with teal & rose), Groom = teal, Bride = rose
  const getPayerStyles = (payer: Payer, isActive: boolean) => {
    const base = 'px-2 py-0.5 rounded text-[11px] font-bold uppercase transition-all';
    if (!isActive) {
      return `${base} bg-slate-100 dark:bg-slate-600/50 text-slate-400 dark:text-slate-500`;
    }
    switch (payer) {
      case 'groom':
        // Teal - more formal/masculine
        return `${base} bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-600`;
      case 'bride':
        // Rose - softer, more bridal
        return `${base} bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-600`;
      default:
        // Violet - sits well with teal & rose, feels premium
        return `${base} bg-violet-100 dark:bg-violet-900/60 text-violet-600 dark:text-violet-300 border border-violet-300 dark:border-violet-600`;
    }
  };

  // Card styles - neutral background with left border accent
  const getCardStyles = (payer: Payer) => {
    const base = 'bg-slate-50 dark:bg-slate-700/50 border-l-4';
    switch (payer) {
      case 'groom':
        return `${base} border-l-teal-500 dark:border-l-teal-400`;
      case 'bride':
        return `${base} border-l-rose-500 dark:border-l-rose-400`;
      default:
        // Violet - premium feel, complements teal & rose
        return `${base} border-l-violet-500 dark:border-l-violet-400`;
    }
  };

  const getPayerLabel = (payer: Payer) => {
    switch (payer) {
      case 'groom': return 'Groom';
      case 'bride': return 'Bride';
      default: return 'Joint';
    }
  };

  // Render a category card (Accordion style - collapsed by default)
  const renderCategoryCard = (cat: BudgetCategory, isFirst: boolean = false) => {
    const data = categoryData[cat.key] || { percentage: 0, payer: 'joint', paymentStatus: 'pending' as PaymentStatus };
    const percentage = data.percentage;
    const payer = data.payer;
    const amount = Math.round((budget * percentage) / 100); // Allocated amount
    const totalBill = data.actualCost || 0; // The invoice/quoted price
    const amountPaid = data.amountPaid || 0;
    const isEditing = editingCategory === cat.key;
    const isCustom = cat.isCustom;
    const isExpanded = expandedCard === cat.key;
    const showTooltip = isFirst && showPayerTip && isExpanded;
    const isMahr = cat.key === 'mahr'; // Special handling for Mahr
    
    // Calculate warning states
    const isOverBudget = totalBill > 0 && totalBill > amount;
    const overBudgetAmount = isOverBudget ? totalBill - amount : 0;
    const isOverPaid = amountPaid > totalBill && totalBill > 0;
    const overPaidAmount = isOverPaid ? amountPaid - totalBill : 0;
    const pendingAmount = Math.max(0, totalBill - amountPaid);
    
    // Determine card border based on status (Mahr gets special cyan/teal styling)
    const getCardBorderStyle = () => {
      if (isOverBudget) return 'border-l-red-500 dark:border-l-red-400';
      if (isOverPaid) return 'border-l-orange-500 dark:border-l-orange-400';
      if (isMahr) return 'border-l-cyan-500 dark:border-l-cyan-400'; // Distinct color for Mahr
      switch (payer) {
        case 'groom': return 'border-l-teal-500 dark:border-l-teal-400';
        case 'bride': return 'border-l-rose-500 dark:border-l-rose-400';
        default: return 'border-l-violet-500 dark:border-l-violet-400';
      }
    };
    
    // Mahr gets a special background to distinguish it
    const cardBgClass = isMahr 
      ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-700' 
      : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600';
    
    return (
      <div key={cat.key} data-card-key={cat.key} className={`rounded-xl ${cardBgClass} border border-l-4 ${getCardBorderStyle()} relative group transition-all scroll-mt-[130px]`}>
        {/* COLLAPSED HEADER - Always visible, clickable to expand */}
        <button
          onClick={() => toggleCard(cat.key)}
          className="w-full px-3 py-2.5 text-left"
        >
          {/* Main content with icon column for alignment */}
          <div className="flex items-start gap-2">
            {/* Icon column - fixed width for alignment */}
            <span className="text-base flex-shrink-0 w-5 text-center">{cat.icon}</span>
            
            {/* Content column */}
            <div className="flex-1 min-w-0">
              {/* ROW 1: Title & Controls */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {/* Edit mode for custom categories - inline input */}
                  {isCustom && editingCustomCategory === cat.key ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameCustomCategory(cat.key);
                          if (e.key === 'Escape') { setEditingCustomCategory(null); setEditCategoryName(''); }
                        }}
                        className="flex-1 px-2 h-7 text-xs font-semibold bg-white dark:bg-slate-800 border-2 border-emerald-500 rounded-md focus:outline-none text-slate-700 dark:text-white"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRenameCustomCategory(cat.key); }}
                        disabled={!editCategoryName.trim()}
                        className="p-1 text-emerald-600 hover:text-emerald-500 disabled:opacity-50"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingCustomCategory(null); setEditCategoryName(''); }}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs whitespace-normal break-words">{cat.name}</span>
                      {isCustom && (
                        <span className="text-[11px] bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 px-1 py-0.5 rounded uppercase font-bold">Custom</span>
                      )}
                      {/* Mahr - Religious Obligation badge */}
                      {isMahr && (
                        <span className="text-[11px] bg-cyan-100 dark:bg-cyan-800/50 text-cyan-700 dark:text-cyan-300 px-1.5 py-0.5 rounded font-bold" title="Excluded from wedding budget - tracked separately">
                          ☪️ Obligation
                        </span>
                      )}
                      {/* Payer indicator (read-only) - visible in collapsed state (not for Mahr) */}
                      {!isExpanded && percentage > 0 && !isMahr && (
                        <span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5 ${
                          payer === 'groom' 
                            ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300' 
                            : payer === 'bride'
                              ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                              : 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            payer === 'groom' ? 'bg-teal-500' : payer === 'bride' ? 'bg-rose-500' : 'bg-violet-500'
                          }`} />
                          {getPayerLabel(payer)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Right: Custom actions (if custom) + Percentage + Expand icon */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Edit/Delete buttons for custom categories (only when not in edit mode) */}
                  {isCustom && editingCustomCategory !== cat.key && (
                    <>
                      {deletingCategory === cat.key ? (
                        // Delete confirmation inline
                        <div className="flex items-center gap-1 mr-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteCustomCategory(cat.key); }}
                            className="px-2 py-0.5 text-[11px] font-medium bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingCategory(null); }}
                            className="px-2 py-0.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingCustomCategory(cat.key); setEditCategoryName(cat.name); }}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-colors"
                            title="Rename"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingCategory(cat.key); }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {percentage > 0 && editingCustomCategory !== cat.key && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 ml-1">
                      {Number.isInteger(percentage) ? percentage : percentage.toFixed(1)}%
                    </span>
                  )}
                  {editingCustomCategory !== cat.key && (
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </div>
              
              {/* ROW 2 & 3: Data + Alerts (only when collapsed and has allocation) */}
              {!isExpanded && percentage > 0 && (
                <div className="mt-1">
                  {/* The Data row */}
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    {totalBill > 0 ? (
                      <span>
                        Bill: {selectedCurrency.symbol}{totalBill.toLocaleString()} • Paid: <span className={data.paymentStatus === 'paid' ? 'text-emerald-600 dark:text-emerald-400' : ''}>{selectedCurrency.symbol}{amountPaid.toLocaleString()}</span>
                      </span>
                    ) : (
                      <span>{selectedCurrency.symbol}{amount.toLocaleString()} allocated</span>
                    )}
                  </div>
                  
                  {/* The Alerts (Badge Row) */}
                  {(isOverBudget || isOverPaid || (pendingAmount > 0 && totalBill > 0)) && (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {/* Over Budget Badge - Red */}
                      {isOverBudget && (
                        <span className="text-[11px] bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold">
                          +{selectedCurrency.symbol}{overBudgetAmount.toLocaleString()} over budget
                        </span>
                      )}
                      {/* Pending Badge - Amber */}
                      {pendingAmount > 0 && totalBill > 0 && !isOverPaid && (
                        <span className="text-[11px] bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">
                          {selectedCurrency.symbol}{pendingAmount.toLocaleString()} pending
                        </span>
                      )}
                      {/* Overpaid Badge - Orange */}
                      {isOverPaid && (
                        <span className="text-[11px] bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded font-bold">
                          ⚠️ Overpaid by {selectedCurrency.symbol}{overPaidAmount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </button>
        
        {/* EXPANDED CONTENT */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
            {/* Combined Row: Who pays? + Budget Allocation */}
            <div className="flex md:flex-wrap items-start justify-between md:justify-start gap-3 md:gap-4">
              {/* Who pays? - Left side */}
              <div className="relative flex-shrink-0">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Who pays?</p>
                {/* Mobile: Single tappable badge - taller to match +/- buttons */}
                <button
                  onClick={() => {
                    cyclePayer(cat.key);
                    if (showPayerTip) dismissPayerTip();
                  }}
                  className={`md:hidden flex items-center gap-0.5 px-4 py-2 text-xs font-bold rounded-lg ${
                    payer === 'groom' 
                      ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300' 
                      : payer === 'bride'
                        ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                        : 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
                  }`}
                >
                  {getPayerLabel(payer)}
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>
                
                {/* Tooltip */}
                {showTooltip && (
                  <div className="md:hidden absolute left-0 top-full mt-2 z-50">
                    <div className="bg-white text-slate-800 text-xs font-semibold px-3 py-2.5 rounded-xl shadow-xl border border-slate-200 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="text-base">👆</span>
                        <span>Tap to change who pays</span>
                      </div>
                      <div className="absolute -top-2 left-5 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45" />
                    </div>
                  </div>
                )}
                
                {/* Desktop: All three badges - wraps if needed */}
                <div className="hidden md:flex flex-wrap gap-1">
                  {(['joint', 'groom', 'bride'] as Payer[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePayerChange(cat.key, p)}
                      className={`px-2.5 py-2 text-xs font-bold rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                        payer === p
                          ? p === 'groom' 
                            ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300' 
                            : p === 'bride'
                              ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                              : 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {getPayerLabel(p)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Budget Allocation - Right side (natural size on mobile, grows on desktop) */}
              <div className="md:flex-1 md:min-w-[230px]">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Budget Allocation</p>
                <div className="flex items-center gap-1.5">
                  {/* Percentage controls - 32x32 on both mobile and desktop */}
                  <button
                    onClick={() => handlePercentageChange(cat.key, Math.floor(percentage) - 1)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 active:bg-slate-400 text-slate-600 dark:text-slate-200 rounded-md text-sm font-bold transition-colors disabled:opacity-40 flex-shrink-0"
                    disabled={percentage <= 0}
                  >
                    −
                  </button>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 w-9 text-center flex-shrink-0">
                    {Number.isInteger(percentage) ? percentage : percentage.toFixed(1)}%
                  </span>
                  <button
                    onClick={() => handlePercentageChange(cat.key, Math.floor(percentage) + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 active:bg-slate-400 text-slate-600 dark:text-slate-200 rounded-md text-sm font-bold transition-colors disabled:opacity-40 flex-shrink-0"
                    disabled={percentage >= 100}
                  >
                    +
                  </button>
                  {/* Amount input - grows to fill, shrinks as needed */}
                  <div className="relative flex-1 min-w-0">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">{selectedCurrency.symbol}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={isEditing ? editingValue : amount.toLocaleString()}
                      onFocus={() => {
                        setEditingCategory(cat.key);
                        setEditingValue(amount.toString());
                      }}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/[^0-9]/g, '');
                        setEditingValue(rawValue);
                      }}
                      onBlur={() => {
                        const newAmount = parseInt(editingValue) || 0;
                        handleAmountChange(cat.key, newAmount);
                        setEditingCategory(null);
                        setEditingValue('');
                      }}
                      className="w-full pl-5 pr-2 h-8 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-right font-semibold text-slate-700 dark:text-white text-xs focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
                {/* Slider - under budget allocation */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percentage}
                  onChange={(e) => handlePercentageChange(cat.key, parseInt(e.target.value))}
                  className="w-full h-1.5 mt-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>
            </div>
            
            {/* Payment Tracking Section - Collapsible */}
            {percentage > 0 && (() => {
              // Smart default: expanded if has data, collapsed if empty
              const hasPaymentData = totalBill > 0 || amountPaid > 0 || data.vendor || data.notes;
              const isPaymentExpanded = expandedPaymentTracking[cat.key] ?? hasPaymentData;
              
              const togglePaymentTracking = (e: React.MouseEvent) => {
                e.stopPropagation();
                setExpandedPaymentTracking(prev => ({
                  ...prev,
                  [cat.key]: !isPaymentExpanded
                }));
              };
              
              return (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                  {/* Collapsible Header */}
                  <button
                    onClick={togglePaymentTracking}
                    className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      Payment Details
                      {hasPaymentData && !isPaymentExpanded && (
                        <span className="text-slate-400 dark:text-slate-500 font-normal">
                          • {selectedCurrency.symbol}{totalBill.toLocaleString()} / {selectedCurrency.symbol}{amountPaid.toLocaleString()} paid
                        </span>
                      )}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isPaymentExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Collapsible Content */}
                  {isPaymentExpanded && (
                    <div className="mt-2 space-y-2">
                      {/* Row 1: Total Bill + Amount Paid */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Total Bill */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Total Bill</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">{selectedCurrency.symbol}</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={totalBill || ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                handleActualCostChange(cat.key, parseInt(val) || 0);
                              }}
                              placeholder={amount.toString()}
                              className={`w-full pl-5 pr-2 h-8 bg-white dark:bg-slate-900/50 border rounded-lg text-xs font-medium text-slate-700 dark:text-white focus:outline-none focus:border-emerald-400 ${
                                isOverBudget ? 'border-red-300 dark:border-red-500' : 'border-slate-200 dark:border-slate-600'
                              }`}
                            />
                          </div>
                        </div>
                        {/* Amount Paid */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Amount Paid</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">{selectedCurrency.symbol}</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={amountPaid || ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                handleAmountPaidChange(cat.key, parseInt(val) || 0);
                              }}
                              placeholder="0"
                              className={`w-full pl-5 pr-2 h-8 bg-white dark:bg-slate-900/50 border rounded-lg text-xs font-medium text-slate-700 dark:text-white focus:outline-none focus:border-emerald-400 ${
                                isOverPaid ? 'border-orange-300 dark:border-orange-500' : 'border-slate-200 dark:border-slate-600'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Warnings - inline */}
                      {(isOverBudget || isOverPaid) && (
                        <div className="text-[11px] font-medium">
                          {isOverBudget && (
                            <p className="text-red-600 dark:text-red-400">
                              ⚠️ {selectedCurrency.symbol}{overBudgetAmount.toLocaleString()} over budget
                            </p>
                          )}
                          {isOverPaid && (
                            <p className="text-orange-600 dark:text-orange-400">
                              ⚠️ Overpaid by {selectedCurrency.symbol}{overPaidAmount.toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Row 2: Vendor + Notes */}
                      <div className="grid grid-cols-2 gap-2 items-start">
                        {/* Vendor */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Vendor</label>
                          <input
                            type="text"
                            value={data.vendor || ''}
                            onChange={(e) => updateExpenseField(cat.key, 'vendor', e.target.value)}
                            placeholder="Vendor name..."
                            className="w-full px-2 h-8 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-700 dark:text-white focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                        {/* Notes - Auto-expanding textarea */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Notes</label>
                          <textarea
                            ref={(el) => {
                              if (!el) return;
                              
                              // Set correct height
                              const adjustHeight = () => {
                                el.style.height = 'auto';
                                el.style.height = Math.max(34, el.scrollHeight) + 'px';
                              };
                              adjustHeight();
                              
                              // Add ResizeObserver if not already attached
                              if (!el.dataset.hasObserver) {
                                el.dataset.hasObserver = 'true';
                                const observer = new ResizeObserver(() => {
                                  // Only adjust if width changed (not height changes we caused)
                                  adjustHeight();
                                });
                                observer.observe(el.parentElement!);
                              }
                            }}
                            value={data.notes || ''}
                            onChange={(e) => {
                              updateExpenseField(cat.key, 'notes', e.target.value);
                              // Auto-resize
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            placeholder="Any notes..."
                            rows={1}
                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-700 dark:text-white focus:outline-none focus:border-emerald-400 resize-none overflow-hidden"
                            style={{ minHeight: '32px' }}
                          />
                        </div>
                      </div>
                      
                      {/* Payment Status Summary - compact */}
                      {totalBill > 0 && (
                        <div className="text-[11px] text-center pt-1.5 border-t border-slate-200 dark:border-slate-600">
                          {pendingAmount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              {selectedCurrency.symbol}{pendingAmount.toLocaleString()} remaining
                            </span>
                          ) : isOverPaid ? (
                            <span className="text-orange-600 dark:text-orange-400 font-medium">
                              ⚠️ Overpaid
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Paid</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  // Render the standalone Mahr section (Religious Obligations - shown at top)
  const renderMahrSection = () => {
    if (!mahrCategory) return null;
    
    const data = categoryData[mahrCategory.key] || { percentage: 0, payer: 'groom', paymentStatus: 'pending' as PaymentStatus };
    const percentage = data.percentage;
    const amount = Math.round((budget * percentage) / 100);
    const totalBill = data.actualCost || 0;
    const amountPaid = data.amountPaid || 0;
    const isExpanded = expandedCard === 'mahr';

    // Auto-fill Mahr from selected type (toggle - click again to deselect)
    const selectMahrType = (value: number, presetId: string) => {
      const isAlreadySelected = totalBill === value && selectedMahrPreset === presetId;
      
      if (isAlreadySelected) {
        // Deselect - clear the value and preset
        setCategoryData((prev: CategoryDataMap) => ({
          ...prev,
          'mahr': {
            ...prev['mahr'],
            percentage: 0,
            actualCost: 0
          }
        }));
        setSelectedMahrPreset(null);
        setSelectedMahrCurrency(null);
      } else {
        // Select - set the value and track which preset + currency
        const newPercentage = budget > 0 ? Math.round((value / budget) * 100) : 0;
        setCategoryData((prev: CategoryDataMap) => ({
          ...prev,
          'mahr': {
            ...prev['mahr'],
            percentage: newPercentage,
            actualCost: value
          }
        }));
        setSelectedMahrPreset(presetId);
        setSelectedMahrCurrency(selectedCurrency.code);
      }
    };
    
    // Check if selected preset's price has changed (only for actual price changes, not currency conversions)
    const selectedPresetData = selectedMahrPreset ? mahrAmounts.find(m => m.id === selectedMahrPreset) : null;
    // Only show warning if currency is the same as when selected (true price change from silver market)
    const isSameCurrency = selectedMahrCurrency === selectedCurrency.code;
    const priceHasChanged = selectedPresetData && totalBill > 0 && selectedPresetData.value !== totalBill && isSameCurrency;
    const priceDifference = selectedPresetData ? selectedPresetData.value - totalBill : 0;

    return (
      <div className="mb-4">
        {/* Mahr Card - Standalone at top */}
        <div data-card-key="mahr" className="rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-700 border-l-4 border-l-cyan-500 dark:border-l-cyan-400 scroll-mt-[130px]">
          {/* Collapsed Header */}
          <button
            onClick={() => toggleCard('mahr')}
            className="w-full px-3 py-2.5 text-left"
          >
            <div className="flex items-start gap-2">
              <span className="text-base flex-shrink-0 w-5 text-center">💎</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs">Mahr (Groom's Obligation)</span>
                  <span className="text-[11px] bg-cyan-100 dark:bg-cyan-800/50 text-cyan-700 dark:text-cyan-300 px-1.5 py-0.5 rounded font-bold">
                    ☪️ Excluded from Budget
                  </span>
                </div>
                
                {/* Summary when collapsed */}
                {!isExpanded && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {totalBill > 0 ? (
                      <>Amount: {selectedCurrency.symbol}{totalBill.toLocaleString()} • {mahrPaymentType === 'deferred' ? 'Deferred' : `Paid: ${selectedCurrency.symbol}${amountPaid.toLocaleString()}`}</>
                    ) : amount > 0 ? (
                      <>Allocated: {selectedCurrency.symbol}{amount.toLocaleString()}</>
                    ) : (
                      <>Tap to set Mahr amount</>
                    )}
                  </p>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          {/* Expanded Content */}
          {isExpanded && (
            <div className="px-3 pb-3 border-t border-cyan-200 dark:border-cyan-700">
              {/* Info Text */}
              <p className="my-2 text-[11px] italic text-slate-400 dark:text-slate-400">
                Mahr is a religious obligation from groom to bride — not a wedding expense. It's tracked separately from your wedding budget.
              </p>

              {/* Smart Select Chips - Sunnah Guidelines */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Select a Guideline
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); fetchSilverPrice(); }}
                    disabled={isFetchingSilver}
                    className="text-[11px] font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingSilver ? 'animate-spin' : ''}`} />
                    {isFetchingSilver ? 'Updating...' : 'Update Prices'}
                  </button>
                </div>
                
                {silverLastUpdated && (
                  <p className={`text-[11px] mb-2 -mt-1 ${silverFetchError ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {silverFetchError ? `⚠️ ${silverFetchError}` : `Last updated: ${silverLastUpdated}`}
                    {selectedCurrency.code !== 'GBP' && !silverFetchError && (
                      <span className="text-slate-400 dark:text-slate-500"> • Converted from GBP</span>
                    )}
                  </p>
                )}
                
                <div className="grid grid-cols-3 gap-2">
                  {mahrAmounts.map((mahr) => {
                    // Meaningful religious context descriptions
                    const descriptions: Record<string, string> = {
                      'minimum': '10 Dirhams (Hanafi)',
                      'azwaj': "Prophet's ﷺ wives",
                      'fatimi': 'Ali (RA) to Fatima (RA)'
                    };
                    
                    // Check if this option is currently selected (by preset ID, not value)
                    const isSelected = selectedMahrPreset === mahr.id;
                    
                    return (
                      <button
                        key={mahr.id}
                        onClick={(e) => { e.stopPropagation(); selectMahrType(mahr.value, mahr.id); }}
                        className={`relative p-2 rounded-lg border-2 text-center transition-all cursor-pointer
                          active:scale-95 hover:shadow-md ${
                          isSelected ? 'ring-2 ring-offset-2 dark:ring-offset-slate-800' : ''
                        } ${
                          mahr.id === 'minimum' 
                            ? `border-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 ${isSelected ? 'ring-cyan-500' : ''}` 
                            : mahr.id === 'azwaj'
                              ? `border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 ${isSelected ? 'ring-emerald-500' : ''}`
                              : `border-purple-400 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 ${isSelected ? 'ring-purple-500' : ''}`
                        }`}
                      >
                        {/* Selection indicator - Plus when unselected, Check when selected */}
                        <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                          isSelected 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300'
                        }`}>
                          {isSelected ? '✓' : '+'}
                        </span>
                        <p className={`text-[11px] font-bold uppercase tracking-wide ${
                          mahr.id === 'minimum' ? 'text-cyan-700 dark:text-cyan-300' 
                            : mahr.id === 'azwaj' ? 'text-emerald-700 dark:text-emerald-300' 
                            : 'text-purple-700 dark:text-purple-300'
                        }`}>
                          {mahr.id === 'azwaj' ? 'Sunnah' : mahr.id === 'minimum' ? 'Minimum' : 'Fatimi'}
                        </p>
                        <p className={`text-base font-black ${
                          mahr.id === 'minimum' ? 'text-cyan-800 dark:text-cyan-200' 
                            : mahr.id === 'azwaj' ? 'text-emerald-800 dark:text-emerald-200' 
                            : 'text-purple-800 dark:text-purple-200'
                        }`}>
                          {selectedCurrency.symbol}{mahr.value.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {mahr.grams.toFixed(0)}g Silver
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">
                          {descriptions[mahr.id]}
                        </p>
                      </button>
                    );
                  })}
                </div>
                
                {/* Price Change Warning */}
                {priceHasChanged && selectedPresetData && (
                  <div className={`mt-2.5 p-2.5 rounded-lg border ${priceDifference > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'}`}>
                    <p className={`text-[11px] font-medium leading-snug ${priceDifference > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                      ⚠️ Silver price has {priceDifference > 0 ? 'increased' : 'decreased'}! 
                      Your selected {selectedPresetData.name} Mahr is now worth {selectedCurrency.symbol}{selectedPresetData.value.toLocaleString()} 
                      ({priceDifference > 0 ? '+' : ''}{selectedCurrency.symbol}{priceDifference.toLocaleString()})
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); selectMahrType(selectedPresetData.value, selectedPresetData.id); }}
                      className={`mt-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md ${priceDifference > 0 ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                    >
                      Update to {selectedCurrency.symbol}{selectedPresetData.value.toLocaleString()}
                    </button>
                  </div>
                )}
                
                {/* Link to Mahr page */}
                <button
                  onClick={(e) => { e.stopPropagation(); onNavigateToMahr?.(); }}
                  className="mt-2 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 hover:underline transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  View full history & sources in Mahr Calculator <span>→</span>
                </button>
              </div>

              {/* Manual Input Section */}
              <div className="space-y-2 pt-2 border-t border-cyan-200 dark:border-cyan-700">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Mahr Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-xs font-medium">{selectedCurrency.symbol}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={totalBill || ''}
                      onChange={(e) => {
                        const filtered = e.target.value.replace(/[^0-9.]/g, '');
                        const val = parseFloat(filtered) || 0;
                        setCategoryData((prev: CategoryDataMap) => ({
                          ...prev,
                          'mahr': {
                            ...prev['mahr'],
                            actualCost: val,
                            percentage: budget > 0 ? Math.round((val / budget) * 100) : 0
                          }
                        }));
                        // Clear preset selection when user types custom amount
                        setSelectedMahrPreset(null);
                        setSelectedMahrCurrency(null);
                      }}
                      placeholder="Enter custom Mahr amount"
                      className="w-full pl-6 pr-2 h-8 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
                
                {/* Amount Paid */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Amount Paid
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-xs font-medium">{selectedCurrency.symbol}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amountPaid || ''}
                      onChange={(e) => {
                        const filtered = e.target.value.replace(/[^0-9.]/g, '');
                        const val = parseFloat(filtered) || 0;
                        setCategoryData((prev: CategoryDataMap) => ({
                          ...prev,
                          'mahr': { ...prev['mahr'], amountPaid: val }
                        }));
                      }}
                      placeholder="0"
                      className="w-full pl-6 pr-2 h-8 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Payment Type - Prompt vs Deferred */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Payment Type
                  </label>
                  <div className="flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMahrPaymentType('prompt'); }}
                      className={`flex-1 h-8 text-xs font-semibold transition-colors ${
                        mahrPaymentType === 'prompt'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      Prompt <span className="hidden sm:inline text-[11px] opacity-75">(Mu'ajjal)</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMahrPaymentType('deferred'); }}
                      className={`flex-1 h-8 text-xs font-semibold transition-colors border-l border-slate-300 dark:border-slate-600 ${
                        mahrPaymentType === 'deferred'
                          ? 'bg-slate-600 dark:bg-slate-500 text-white'
                          : 'bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      Deferred <span className="hidden sm:inline text-[11px] opacity-75">(Mu'wajjal)</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    {mahrPaymentType === 'prompt' 
                      ? 'Paid at time of Nikkah — included in Total Cash Required' 
                      : 'Payable later (upon request, divorce, or death) — excluded from immediate budget'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render a section (collapsible accordion)
  const renderSection = (section: CategorySection, isFirstSection: boolean = false) => {
    const categories = categoriesBySection[section];
    const sectionInfo = SECTION_LABELS[section];
    const isExpanded = expandedSections[section];
    const sectionTotals = getSectionTotals(section);
    
    if (categories.length === 0) return null;
    
    const toggleSection = () => {
      setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };
    
    return (
      <div key={section} className="mb-3">
        {/* Section Header - Clickable to expand/collapse */}
        <button
          onClick={toggleSection}
          className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-all border border-slate-200 dark:border-slate-600 ${
            isExpanded 
              ? 'bg-slate-100 dark:bg-slate-700 rounded-b-none border-b-0' 
              : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{sectionInfo.icon}</span>
            <div className="text-left">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                {sectionInfo.title}
                {/* Explicit warning icon if issues exist */}
                {sectionTotals.hasIssues && (
                  <span className="text-amber-500" title="Issues in this section">⚠️</span>
                )}
              </h4>
              {/* Collapsed summary */}
              {!isExpanded && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedCurrency.symbol}{sectionTotals.totalAmount.toLocaleString()} allocated
                  {sectionTotals.totalPaid > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400"> • {selectedCurrency.symbol}{sectionTotals.totalPaid.toLocaleString()} paid</span>
                  )}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Section percentage */}
            <span className={`text-xs font-bold ${sectionTotals.hasIssues ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {sectionTotals.totalPercentage.toFixed(0)}%
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>
        
        {/* Expanded content */}
        {isExpanded && (
          <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-b-xl p-2.5 pt-2 border border-t-0 border-slate-200 dark:border-slate-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-start">
              {categories.map((cat, index) => renderCategoryCard(cat, isFirstSection && index === 0))}
            </div>
            
            {/* Inline Add Item Form (shown when adding to this section) */}
            {addingToSection === section && (
              <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-600/50">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder={`Enter item name...`}
                    className="flex-1 px-2.5 h-8 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCustomCategory(section);
                      if (e.key === 'Escape') { setAddingToSection(null); setNewCategoryName(''); }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleAddCustomCategory(section)}
                    disabled={!newCategoryName.trim()}
                    className="px-3 h-8 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setAddingToSection(null); setNewCategoryName(''); }}
                    className="h-8 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-medium transition-colors flex-shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Footer Actions: Add Item + Collapse */}
            <div className="mt-3 flex flex-col gap-2">
              {/* Contextual Add Item Button (hidden when form is open) */}
              {addingToSection !== section && (
                <button
                  onClick={() => setAddingToSection(section)}
                  className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>+</span> Add item to {sectionInfo.title}
                </button>
              )}
              
              {/* Collapse Section Button */}
              <button
                onClick={toggleSection}
                className="w-full py-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center justify-center gap-1"
              >
                <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                <span>Collapse</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)) {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
    >
      <div className="text-center mb-6 relative">
        <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-white mb-2">Wedding Budget Architect</h2>
        <p className="text-slate-600 dark:text-slate-400 italic">"The most blessed wedding is the one with the least expenses."</p>
        
        {/* Print Button - Top Right */}
        <button
          onClick={() => window.print()}
          className="absolute right-0 top-0 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Print Budget Plan"
        >
          <Calculator className="w-4 h-4" />
          <span className="hidden sm:inline">Print</span>
        </button>
      </div>

      {/* Budget & Guest Input - Compact Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-3 md:p-4 mb-4 border border-slate-100 dark:border-slate-700">
        {/* Currency + Budget + Guests — single row on desktop, Currency full-width on mobile with Budget+Guests side by side */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 items-end mb-2">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Currency</label>
            <CustomSelect
              value={currencyCode}
              onChange={(val) => setCurrencyCode(val)}
              options={CURRENCIES.map(c => ({ value: c.code, label: `${c.symbol} ${c.code} - ${c.name}` }))}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Total Budget</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{selectedCurrency.symbol}</span>
              <input 
                type="number" 
                min="0"
                value={totalBudget} 
                onChange={(e) => setTotalBudget(e.target.value)} 
                placeholder="25,000" 
                className={`w-full pl-7 pr-2 h-8 bg-slate-50 dark:bg-slate-900/50 border focus:bg-white dark:focus:bg-slate-800 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white ${
                  budgetError ? 'border-red-300 focus:border-red-400' : 'border-slate-200 dark:border-slate-600 focus:border-emerald-400'
                }`}
              />
            </div>
            {budgetError && <p className="text-red-500 dark:text-red-400 text-[11px] mt-1 font-medium">{budgetError}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Guests</label>
            <div className="relative">
              <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input 
                type="number" 
                min="1"
                max="10000"
                value={guestCount} 
                onChange={(e) => setGuestCount(e.target.value)} 
                placeholder="200" 
                className={`w-full pl-7 pr-2 h-8 bg-slate-50 dark:bg-slate-900/50 border focus:bg-white dark:focus:bg-slate-800 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white ${
                  guestError ? 'border-red-300 focus:border-red-400' : 'border-slate-200 dark:border-slate-600 focus:border-emerald-400'
                }`}
              />
            </div>
            {guestError && <p className="text-red-500 dark:text-red-400 text-[11px] mt-1 font-medium">{guestError}</p>}
          </div>
        </div>

        {/* Row 3: Template Toggle */}
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="w-full text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 py-2 transition-colors flex items-center justify-center gap-1"
        >
          <span>✨</span>
          <span>{showTemplates ? 'Hide' : 'Apply'} Preset Templates</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Templates (hidden by default) */}
        {showTemplates && (
          <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-wrap justify-center gap-2">
              {getBudgetTemplates(currencyCode, selectedCurrency.symbol).map(template => (
                <button
                  key={template.id}
                  onClick={() => setTotalBudget(template.amount.toString())}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    parseInt(totalBudget) === template.amount
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 border border-slate-200 dark:border-slate-500'
                  }`}
                >
                  <span>{template.icon}</span>
                  <span>{template.name}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-2">
              Adjusted for {selectedCurrency.name}
            </p>
          </div>
        )}
      </div>

      {/* Over Budget Warning - Sticky below header */}
      {isOverBudget && (
        <div className="sticky top-[80px] z-40 mb-4 -mx-4 md:-mx-1">
          {/* Mobile banner - full width */}
          <div className="md:hidden bg-red-950/90 backdrop-blur-md border-y border-red-800/50 py-2.5 px-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="font-bold text-xs text-red-300">Over Budget!</p>
                  <p className="text-[11px] text-red-400/70">Reduce allocations to continue</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-black text-red-300 leading-tight">
                  {Number.isInteger(totalPercentage) ? totalPercentage : totalPercentage.toFixed(1)}%
                </p>
                <p className="text-[11px] text-red-400/70 leading-tight">
                  +{selectedCurrency.symbol}{Math.round(totalAllocated - budget).toLocaleString()} over
                </p>
              </div>
            </div>
          </div>
          {/* Desktop banner */}
          <div className="hidden md:block bg-red-950/90 backdrop-blur-md border border-red-800/50 rounded-xl py-2.5 px-5 shadow-sm">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="font-bold text-xs text-red-300">Over Budget!</p>
                <p className="text-[11px] text-red-400/70">Reduce allocations to continue</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-black text-red-300">
                  {Number.isInteger(totalPercentage) ? totalPercentage : totalPercentage.toFixed(1)}%
                </p>
                <p className="text-[11px] font-semibold bg-red-500/20 text-red-300 px-2.5 py-0.5 rounded-full">
                  +{selectedCurrency.symbol}{Math.round(totalAllocated - budget).toLocaleString()} over
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Sections */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Budget Allocation</h3>
          <button 
            onClick={handleResetDefaults}
            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
        
        {/* Render Mahr first (Religious Obligations) */}
        {renderMahrSection()}
        
        {/* Render other sections */}
        {renderSection('events', true)}
        {renderSection('personal')}
        {renderSection('logistics')}
      </div>

      {/* Budget Health Status - Compact "Status Badge" style */}
      <div className={`rounded-xl p-2.5 md:p-3 mb-3 transition-all ${
        isOverBudget 
          ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 border border-red-300 dark:border-red-700' 
          : 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700'
      }`}>
        <div className="flex flex-col gap-2">
          {/* Main status row - compact */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 flex items-center justify-center">
                {isOverBudget 
                  ? <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                  : <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                }
              </div>
              <div>
                <p className={`text-xs font-medium ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {isOverBudget ? 'Over Budget' : 'Budget Status'}
                </p>
                <p className={`text-lg font-bold leading-tight ${isOverBudget ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {Number.isInteger(totalPercentage) ? totalPercentage : totalPercentage.toFixed(1)}% Allocated
                </p>
              </div>
            </div>
            <div className="text-right">
              {isOverBudget ? (
                <>
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">Overspend</p>
                  <p className="text-lg font-bold leading-tight text-red-700 dark:text-red-300">
                    +{selectedCurrency.symbol}{Math.round(totalAllocated - budget).toLocaleString()}
                  </p>
                </>
              ) : totalPercentage < 100 ? (
                <>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Remaining</p>
                  <p className="text-lg font-bold leading-tight text-emerald-700 dark:text-emerald-300">
                    {selectedCurrency.symbol}{Math.round(budget - totalAllocated).toLocaleString()}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Remaining</p>
                  <p className="text-lg font-bold leading-tight text-emerald-700 dark:text-emerald-300">
                    {selectedCurrency.symbol}0
                  </p>
                </>
              )}
            </div>
          </div>
          
          {/* Payer Breakdown - inline */}
          {totalAllocated > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-600/50">
              <span className="py-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400 mr-1">By payer:</span>
              {payerTotals.joint > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[12px] font-bold bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300">
                  Joint: {selectedCurrency.symbol}{payerTotals.joint.toLocaleString()}
                </span>
              )}
              {payerTotals.groom > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[12px] font-bold bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                  Groom: {selectedCurrency.symbol}{payerTotals.groom.toLocaleString()}
                </span>
              )}
              {payerTotals.bride > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[12px] font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
                  Bride: {selectedCurrency.symbol}{payerTotals.bride.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Financial Summary - Always shown */}
      <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl mb-4 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-4 py-2.5">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2">
            Financial Summary
          </h3>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700" />
        <div className="p-3 space-y-2">
          <div className="flex justify-between items-start text-xs">
            <span className="text-slate-500 dark:text-slate-400">Wedding Expenses</span>
            <div className="text-right">
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {selectedCurrency.symbol}{Math.round(totalAllocated).toLocaleString()}
              </span>
              {/* Cost Per Guest - based on wedding expenses only, not Mahr */}
              {guests > 0 && totalAllocated > 0 && (
                <p className="text-[11.5px] py-0.5 text-slate-400 dark:text-slate-500">
                  ~{selectedCurrency.symbol}{Math.round(totalAllocated / guests).toLocaleString()}/guest
                </p>
              )}
            </div>
          </div>
          {/* Mahr row - only show if Mahr is set */}
          {mahrActualCost > 0 && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                <span>☪️</span> Mahr
                {mahrPaymentType === 'deferred' && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">(deferred)</span>
                )}
              </span>
              <span className={`font-medium ${mahrPaymentType === 'deferred' ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-cyan-600 dark:text-cyan-400'}`}>
                {mahrPaymentType === 'prompt' ? '+ ' : ''}{selectedCurrency.symbol}{mahrActualCost.toLocaleString()}
              </span>
            </div>
          )}
          {/* Hero row - Total Cash Required */}
          <div className="bg-slate-800 dark:bg-slate-900 rounded-xl p-3 mt-3 -mx-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-200 dark:text-slate-300">Total Cash Required</span>
              <span className="text-2xl md:text-3xl font-black text-white">
                {selectedCurrency.symbol}{grandTotalRequired.toLocaleString()}
              </span>
            </div>
          </div>
          {/* Guidance text */}
          {mahrActualCost > 0 && (
            <p className="text-[12px] text-slate-400 dark:text-slate-400 mt-3 italic text-center">
              {mahrPaymentType === 'deferred'
                ? 'Deferred Mahr is excluded from Total Cash Required — payable at a later date.'
                : 'Mahr is tracked separately as a religious obligation, not a wedding expense.'}
            </p>
          )}
        </div>
      </div>

      {/* Expense Tracking Summary */}
      {(expenseTotals.totalActual > 0 || expenseTotals.totalPaid > 0) && (() => {
        // Use grandTotalRequired (Wedding + Mahr) for consistent cash flow tracking
        const isOverBudgetTotal = expenseTotals.totalActual > grandTotalRequired;
        const overBudgetAmountTotal = isOverBudgetTotal ? expenseTotals.totalActual - grandTotalRequired : 0;
        const isOverPaidTotal = expenseTotals.totalPaid > expenseTotals.totalActual && expenseTotals.totalActual > 0;
        const paymentPercentage = expenseTotals.totalActual > 0 
          ? Math.round((expenseTotals.totalPaid / expenseTotals.totalActual) * 100) 
          : 0;
        const displayPercentage = Math.min(100, paymentPercentage);
        
        return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl mb-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between px-4 md:px-6 py-2.5">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2">
                Payment Tracking
              </h3>
              {isOverBudgetTotal && (
                <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Over Budget
                </span>
              )}
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700" />
            <div className="p-3 md:p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Budget</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                  {selectedCurrency.symbol}{grandTotalRequired.toLocaleString()}
                </p>
              </div>
              <div className={`rounded-lg p-2.5 ${isOverBudgetTotal ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                <p className={`text-[11px] font-bold uppercase tracking-wide ${isOverBudgetTotal ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>Total Bills</p>
                <p className={`text-sm font-bold mt-0.5 ${isOverBudgetTotal ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
                  {selectedCurrency.symbol}{expenseTotals.totalActual.toLocaleString()}
                </p>
                {isOverBudgetTotal && (
                  <p className="text-[11px] text-red-500 dark:text-red-400 mt-0.5">+{selectedCurrency.symbol}{overBudgetAmountTotal.toLocaleString()} over</p>
                )}
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5">
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Paid</p>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {selectedCurrency.symbol}{expenseTotals.totalPaid.toLocaleString()}
                </p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5">
                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Pending</p>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                  {selectedCurrency.symbol}{Math.max(0, expenseTotals.totalPending).toLocaleString()}
                </p>
              </div>
            </div>
            {/* Progress bar */}
            {expenseTotals.totalActual > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>Payment Progress</span>
                  <span className={isOverPaidTotal ? 'text-orange-500 dark:text-orange-400' : ''}>
                    {displayPercentage}%{isOverPaidTotal && ' (Overpaid)'}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${isOverPaidTotal ? 'bg-orange-500' : 'bg-emerald-500'}`}
                    style={{ width: `${displayPercentage}%` }}
                  />
                </div>
                {isOverPaidTotal && (
                  <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                    ⚠️ Paid {selectedCurrency.symbol}{(expenseTotals.totalPaid - expenseTotals.totalActual).toLocaleString()} more than total bills
                  </p>
                )}
              </div>
            )}
            </div>
          </div>
        );
      })()}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowResetConfirm(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Reset Allocations?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">This cannot be undone</p>
              </div>
            </div>
            <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                All budget percentages, payer assignments, and custom categories will be reset to their default values.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                Cancel
              </button>
              <button onClick={confirmResetDefaults}
                className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-colors">
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
