
import React, { useState, useMemo, useEffect } from 'react';
import { Users, Calculator, Sparkles, ChevronDown } from './Icons';
import { BUDGET_CATEGORIES, CURRENCIES, SECTION_LABELS } from '../constants';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { BudgetCategory, Payer, CategorySection } from '../types';

// Type for category data (percentage + payer)
type CategoryData = {
  percentage: number;
  payer: Payer;
};
type CategoryDataMap = { [key: string]: CategoryData };

// Type for custom categories
type CustomCategory = BudgetCategory;

// Initialize default data from constants
const getDefaultCategoryData = (): CategoryDataMap => {
  return BUDGET_CATEGORIES.reduce((acc, cat) => ({
    ...acc,
    [cat.key]: {
      percentage: Math.round(cat.basePercentage * 100),
      payer: cat.defaultPayer
    }
  }), {});
};

export const BudgetPlanner: React.FC = () => {
  // Persisted state
  const [totalBudget, setTotalBudget] = useLocalStorage<string>('budget-totalBudget', '20000');
  const [guestCount, setGuestCount] = useLocalStorage<string>('budget-guestCount', '150');
  const [currencyCode, setCurrencyCode] = useLocalStorage<string>('budget-currency', 'GBP');
  const [categoryData, setCategoryData] = useLocalStorage<CategoryDataMap>(
    'budget-categoryData-v2',
    getDefaultCategoryData()
  );
  const [customCategories, setCustomCategories] = useLocalStorage<CustomCategory[]>(
    'budget-customCategories',
    []
  );
  
  // Derive currency object from stored code
  const selectedCurrency = useMemo(() => 
    CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0],
    [currencyCode]
  );
  
  // Session-only state (not persisted)
  const [showResults, setShowResults] = useState<boolean>(false);
  const [aiTip, setAiTip] = useState<string>("");
  const [aiError, setAiError] = useState<string>("");
  const [isConsulting, setIsConsulting] = useState(false);
  
  // Track which input is being edited and its current value
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  
  // Custom category form state
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // One-time tooltip for payer badge (mobile only)
  // Stays visible until user taps the badge to learn the feature
  const [hasSeenPayerTip, setHasSeenPayerTip] = useLocalStorage<boolean>('budget-hasSeenPayerTip', false);
  const showPayerTip = !hasSeenPayerTip;
  
  const dismissPayerTip = () => {
    setHasSeenPayerTip(true);
  };

  const budget = parseFloat(totalBudget) || 0;
  const guests = parseInt(guestCount) || 0;

  // Combine default and custom categories
  const allCategories = useMemo(() => {
    return [...BUDGET_CATEGORIES, ...customCategories];
  }, [customCategories]);

  // Calculate total percentage
  const totalPercentage = useMemo(() => {
    return Object.values(categoryData).reduce((sum, data) => sum + (data?.percentage || 0), 0);
  }, [categoryData]);

  const isOverBudget = totalPercentage > 100;
  const totalAllocated = (budget * totalPercentage) / 100;

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

  const hasValidInput = budget > 0 && guests > 0 && !budgetError && !guestError && !isOverBudget;

  const handleCalculate = () => {
    if (hasValidInput) {
      setShowResults(true);
      setAiTip("");
      setAiError("");
    }
  };

  const getAiConsultation = async () => {
    setIsConsulting(true);
    setAiError("");
    try {
      const response = await fetch('/api/gemini-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget, guests }),
      });
      const data = await response.json();
      if (data.tip) {
        setAiTip(data.tip);
      } else if (data.error) {
        setAiError(data.error);
      }
    } catch (error) {
      setAiError("Unable to connect to AI service. Please try again later.");
    } finally {
      setIsConsulting(false);
    }
  };

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
    setCategoryData(getDefaultCategoryData());
    setCustomCategories([]);
  };

  // Add custom category
  const handleAddCustomCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const key = `custom-${Date.now()}`;
    const newCategory: CustomCategory = {
      key,
      name: newCategoryName.trim(),
      icon: '📌',
      color: 'bg-gray-100 text-gray-700',
      basePercentage: 0,
      section: 'logistics',
      defaultPayer: 'joint',
      isCustom: true
    };
    
    setCustomCategories(prev => [...prev, newCategory]);
    setCategoryData(prev => ({
      ...prev,
      [key]: { percentage: 0, payer: 'joint' }
    }));
    setNewCategoryName('');
    setIsAddingCustom(false);
  };

  // Delete custom category
  const handleDeleteCustomCategory = (key: string) => {
    setCustomCategories(prev => prev.filter(c => c.key !== key));
    setCategoryData(prev => {
      const newData = { ...prev };
      delete newData[key];
      return newData;
    });
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

  // Calculate totals by payer
  const payerTotals = useMemo(() => {
    const totals = { joint: 0, groom: 0, bride: 0 };
    Object.entries(categoryData).forEach(([key, data]) => {
      if (data?.percentage > 0) {
        const amount = Math.round((budget * data.percentage) / 100);
        totals[data.payer] += amount;
      }
    });
    return totals;
  }, [categoryData, budget]);

  // Group categories by section
  const categoriesBySection = useMemo(() => {
    const sections: Record<CategorySection, BudgetCategory[]> = {
      events: [],
      personal: [],
      logistics: []
    };
    
    allCategories.forEach(cat => {
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
    const base = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all';
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

  // Render a category card
  const renderCategoryCard = (cat: BudgetCategory, isFirst: boolean = false) => {
    const data = categoryData[cat.key] || { percentage: 0, payer: 'joint' };
    const percentage = data.percentage;
    const payer = data.payer;
    const amount = Math.round((budget * percentage) / 100);
    const isEditing = editingCategory === cat.key;
    const isCustom = cat.isCustom;
    const showTooltip = isFirst && showPayerTip;
    
    return (
      <div key={cat.key} className={`rounded-2xl p-4 relative group transition-colors ${getCardStyles(payer)}`}>
        {/* Delete button for custom categories - top right */}
        {isCustom && (
          <button
            onClick={() => handleDeleteCustomCategory(cat.key)}
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
            title="Delete custom category"
          >
            ×
          </button>
        )}
        
        {/* Row 1: Icon + Name + Custom badge */}
        <div className={`flex items-center gap-2 mb-2 ${isCustom ? 'pr-8' : ''}`}>
          <span className="text-xl flex-shrink-0">{cat.icon}</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{cat.name}</span>
          {isCustom && (
            <span className="text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded uppercase font-bold flex-shrink-0">Custom</span>
          )}
        </div>
        
        {/* Row 2: Payer badges - left aligned */}
        <div className="mb-3 relative">
          {/* Mobile: Single tappable badge */}
          <button
            onClick={() => {
              cyclePayer(cat.key);
              if (showPayerTip) dismissPayerTip();
            }}
            className={`md:hidden flex items-center gap-0.5 ${getPayerStyles(payer, true)}`}
          >
            {getPayerLabel(payer)}
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
          
          {/* One-time tooltip for first card on mobile - stays until user taps badge */}
          {showTooltip && (
            <div 
              className="md:hidden absolute left-0 top-full mt-2 z-50"
            >
              <div className="bg-white text-slate-800 text-xs font-semibold px-3 py-2.5 rounded-xl shadow-xl border border-slate-200 max-w-[200px] animate-pulse-subtle">
                <div className="flex items-center gap-2">
                  <span className="text-base">👆</span>
                  <span>Tap to change who pays</span>
                </div>
                {/* Arrow pointing up at badge */}
                <div className="absolute -top-2 left-5 w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45" />
              </div>
            </div>
          )}
          
          {/* Desktop: All three badges */}
          <div className="hidden md:flex gap-1">
            {(['joint', 'groom', 'bride'] as Payer[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePayerChange(cat.key, p)}
                className={`${getPayerStyles(p, payer === p)} cursor-pointer hover:opacity-80`}
              >
                {getPayerLabel(p)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Row 3: Controls */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 md:gap-1">
            <button
              onClick={() => handlePercentageChange(cat.key, Math.floor(percentage) - 1)}
              className="w-10 h-10 md:w-7 md:h-7 flex items-center justify-center bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 active:bg-slate-400 text-slate-600 dark:text-slate-200 rounded-lg md:rounded-md text-lg md:text-sm font-bold transition-colors disabled:opacity-40"
              disabled={percentage <= 0}
            >
              −
            </button>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 w-14 md:w-12 text-center">
              {Number.isInteger(percentage) ? percentage : percentage.toFixed(1)}%
            </span>
            <button
              onClick={() => handlePercentageChange(cat.key, Math.floor(percentage) + 1)}
              className="w-10 h-10 md:w-7 md:h-7 flex items-center justify-center bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 active:bg-slate-400 text-slate-600 dark:text-slate-200 rounded-lg md:rounded-md text-lg md:text-sm font-bold transition-colors disabled:opacity-40"
              disabled={percentage >= 100}
            >
              +
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{selectedCurrency.symbol}</span>
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
              className="w-24 pl-5 pr-2 py-1.5 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-right font-semibold text-slate-700 dark:text-white text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>
        {/* Slider hidden on mobile to prevent accidental touches */}
        <input
          type="range"
          min="0"
          max="100"
          value={percentage}
          onChange={(e) => handlePercentageChange(cat.key, parseInt(e.target.value))}
          className="hidden md:block w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />
      </div>
    );
  };

  // Render a section
  const renderSection = (section: CategorySection, isFirstSection: boolean = false) => {
    const categories = categoriesBySection[section];
    const sectionInfo = SECTION_LABELS[section];
    
    if (categories.length === 0) return null;
    
    return (
      <div key={section} className="mb-6">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200 dark:border-slate-600">
          <span className="text-lg">{sectionInfo.icon}</span>
          <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            {sectionInfo.title}
          </h4>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            ({categories.length} items)
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, index) => renderCategoryCard(cat, isFirstSection && index === 0))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-white mb-2">Wedding Budget Architect</h2>
        <p className="text-slate-600 dark:text-slate-400 italic">"The most blessed wedding is the one with the least expenses."</p>
      </div>

      {/* Budget & Guest Input */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-6 md:p-10 mb-8 border border-slate-100 dark:border-slate-700">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Currency</label>
            <select
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-700 border-2 border-transparent focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-600 rounded-2xl transition-all outline-none font-semibold text-slate-800 dark:text-white"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Total Budget</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">{selectedCurrency.symbol}</span>
              <input 
                type="number" 
                min="0"
                value={totalBudget} 
                onChange={(e) => setTotalBudget(e.target.value)} 
                placeholder="25,000" 
                className={`w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-700 border-2 focus:bg-white dark:focus:bg-slate-600 rounded-2xl transition-all outline-none text-xl font-semibold text-slate-800 dark:text-white ${
                  budgetError ? 'border-red-300 focus:border-red-400' : 'border-transparent focus:border-emerald-400'
                }`}
              />
            </div>
            {budgetError && <p className="text-red-500 dark:text-red-400 text-xs mt-2 font-medium">{budgetError}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Expected Guests</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
              <input 
                type="number" 
                min="1"
                max="10000"
                value={guestCount} 
                onChange={(e) => setGuestCount(e.target.value)} 
                placeholder="200" 
                className={`w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-700 border-2 focus:bg-white dark:focus:bg-slate-600 rounded-2xl transition-all outline-none text-xl font-semibold text-slate-800 dark:text-white ${
                  guestError ? 'border-red-300 focus:border-red-400' : 'border-transparent focus:border-emerald-400'
                }`}
              />
            </div>
            {guestError && <p className="text-red-500 dark:text-red-400 text-xs mt-2 font-medium">{guestError}</p>}
          </div>
        </div>

        {/* Over Budget Warning - Sticky below header, mobile only */}
        {isOverBudget && (
          <div className="md:hidden sticky top-[80px] z-40 -mx-6 mb-6">
            <div className="bg-gradient-to-r from-red-500 via-rose-500 to-red-600 text-white py-3 px-5 shadow-lg border-b-4 border-red-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <span className="text-xl">⚠️</span>
                  </div>
                  <div>
                    <p className="font-bold text-base">Over Budget!</p>
                    <p className="text-xs text-red-100">Reduce allocations to continue</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black">
                    {Number.isInteger(totalPercentage) ? totalPercentage : totalPercentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-red-100">
                    +{selectedCurrency.symbol}{Math.round(totalAllocated - budget).toLocaleString()} over
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Sections */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Budget Allocation</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsAddingCustom(true)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                + Add Custom
              </button>
              <button 
                onClick={handleResetDefaults}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Add Custom Category Form */}
          {isAddingCustom && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-800">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3">Add Custom Category</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name..."
                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:border-blue-400"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCategory()}
                />
                <button
                  onClick={handleAddCustomCategory}
                  disabled={!newCategoryName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => { setIsAddingCustom(false); setNewCategoryName(''); }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Render sections */}
          {renderSection('events', true)}
          {renderSection('personal')}
          {renderSection('logistics')}
        </div>

        {/* Total Summary */}
        <div className={`rounded-2xl p-4 md:p-6 mb-6 transition-all ${
          isOverBudget 
            ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 border-2 border-red-300 dark:border-red-700 md:shadow-lg md:shadow-red-100 dark:md:shadow-red-900/30' 
            : 'bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-200 dark:border-emerald-700'
        }`}>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <p className={`text-sm font-semibold ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  Total Allocated
                </p>
                <p className={`text-2xl md:text-3xl font-bold ${isOverBudget ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {Number.isInteger(totalPercentage) ? totalPercentage : totalPercentage.toFixed(1)}% ({selectedCurrency.symbol}{Math.round(totalAllocated).toLocaleString()})
                </p>
              </div>
              {isOverBudget && (
                <div className="text-right">
                  <div className="hidden md:flex items-center gap-2 justify-end mb-1">
                    <span className="text-xl">⚠️</span>
                    <p className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">Over Budget</p>
                  </div>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400 md:hidden">Over budget by</p>
                  <p className="text-lg md:text-2xl font-black text-red-700 dark:text-red-300">
                    +{selectedCurrency.symbol}{Math.round(totalAllocated - budget).toLocaleString()}
                  </p>
                </div>
              )}
              {!isOverBudget && totalPercentage < 100 && (
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Remaining</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    {Number.isInteger(100 - totalPercentage) ? (100 - totalPercentage) : (100 - totalPercentage).toFixed(1)}% ({selectedCurrency.symbol}{Math.round(budget - totalAllocated).toLocaleString()})
                  </p>
                </div>
              )}
            </div>
            
            {/* Payer Breakdown */}
            {totalAllocated > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">By payer:</span>
                {payerTotals.joint > 0 && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300">
                    Joint: {selectedCurrency.symbol}{payerTotals.joint.toLocaleString()}
                  </span>
                )}
                {payerTotals.groom > 0 && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                    Groom: {selectedCurrency.symbol}{payerTotals.groom.toLocaleString()}
                  </span>
                )}
                {payerTotals.bride > 0 && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
                    Bride: {selectedCurrency.symbol}{payerTotals.bride.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleCalculate}
          disabled={!hasValidInput}
          className={`w-full py-5 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-[0.98] ${
            hasValidInput 
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 dark:shadow-emerald-900/30' 
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          {isOverBudget ? 'Reduce allocation to continue' : 'Generate Budget Breakdown'}
        </button>
      </div>

      {/* Results Section */}
      {showResults && budget > 0 && !isOverBudget && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* AI Consultant */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl border border-white/10">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-bold">AI Barakah Consultant</h3>
              </div>
              
              {aiTip ? (
                <div className="animate-in fade-in zoom-in duration-500">
                  <p className="text-slate-200 leading-relaxed italic text-lg">"{aiTip}"</p>
                </div>
              ) : aiError ? (
                <div className="animate-in fade-in duration-300">
                  <p className="text-red-300 text-sm mb-3">{aiError}</p>
                  <button 
                    onClick={getAiConsultation}
                    disabled={isConsulting}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <p className="text-slate-400 text-sm">Get personalized, Sunnah-focused advice for your plan.</p>
                  <button 
                    onClick={getAiConsultation}
                    disabled={isConsulting}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isConsulting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Thinking...</> : 'Get AI Tip'}
                  </button>
                </div>
              )}
            </div>
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md border border-slate-100 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total Budget</p>
              <h4 className="text-3xl font-bold text-slate-800 dark:text-white">{selectedCurrency.symbol}{budget.toLocaleString()}</h4>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md border border-slate-100 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Guest Count</p>
              <h4 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{guests} guests</h4>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md border border-slate-100 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Cost Per Head</p>
              <h4 className="text-3xl font-bold text-teal-600 dark:text-teal-400">{selectedCurrency.symbol}{(budget / guests).toFixed(2)}</h4>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Budget Breakdown</h3>
              <button 
                onClick={() => window.print()}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" /> Print Plan
              </button>
            </div>
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allCategories.filter(cat => (categoryData[cat.key]?.percentage || 0) > 0).map(cat => {
                  const percentage = categoryData[cat.key]?.percentage || 0;
                  const amount = Math.round((budget * percentage) / 100);

                  return (
                    <div key={cat.key} className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 group hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{cat.icon}</span>
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">{cat.name}</h4>
                            <p className="text-xs text-slate-400">
                              {Number.isInteger(percentage) ? percentage : percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <span className="text-lg font-black text-slate-800 dark:text-white">{selectedCurrency.symbol}{amount.toLocaleString()}</span>
                      </div>
                      
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full mb-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000" 
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">Tip:</span> {getRecommendation(cat.key, amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
