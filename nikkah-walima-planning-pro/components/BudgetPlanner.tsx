
import React, { useState, useMemo } from 'react';
import { Users, Calculator, Sparkles } from './Icons';
import { BUDGET_CATEGORIES, CURRENCIES } from '../constants';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Type for category percentages
type CategoryPercentages = { [key: string]: number };

// Initialize default percentages from constants
const getDefaultPercentages = (): CategoryPercentages => {
  return BUDGET_CATEGORIES.reduce((acc, cat) => ({
    ...acc,
    [cat.key]: Math.round(cat.basePercentage * 100)
  }), {});
};

export const BudgetPlanner: React.FC = () => {
  // Persisted state
  const [totalBudget, setTotalBudget] = useLocalStorage<string>('budget-totalBudget', '20000');
  const [guestCount, setGuestCount] = useLocalStorage<string>('budget-guestCount', '150');
  const [currencyCode, setCurrencyCode] = useLocalStorage<string>('budget-currency', 'GBP');
  const [categoryPercentages, setCategoryPercentages] = useLocalStorage<CategoryPercentages>(
    'budget-categoryPercentages',
    getDefaultPercentages()
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

  const budget = parseFloat(totalBudget) || 0;
  const guests = parseInt(guestCount) || 0;

  // Calculate total percentage
  const totalPercentage = useMemo(() => {
    return Object.values(categoryPercentages).reduce((sum, val) => sum + val, 0);
  }, [categoryPercentages]);

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

  // Update percentage for a category (from slider - whole numbers)
  const handlePercentageChange = (key: string, newPercentage: number) => {
    setCategoryPercentages(prev => ({
      ...prev,
      [key]: Math.max(0, Math.min(100, newPercentage))
    }));
  };

  // Update percentage from amount input (with decimal precision)
  const handleAmountChange = (key: string, amount: number) => {
    if (budget > 0) {
      // Keep 2 decimal places for precision so user's exact amount is preserved
      const newPercentage = Math.round((amount / budget) * 10000) / 100;
      setCategoryPercentages(prev => ({
        ...prev,
        [key]: Math.max(0, Math.min(100, newPercentage))
      }));
    }
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    setCategoryPercentages(getDefaultPercentages());
  };

  const getRecommendation = (category: string, amount: number) => {
    const recommendations: Record<string, string> = {
      'nikkah': amount > 2000 ? 'Premium mosque or hotel ceremony room' : amount > 1000 ? 'Well-appointed mosque hall' : 'Local masjid or simple venue',
      'walima-venue': amount > 8000 ? 'Luxury hotel ballroom or banquet hall' : amount > 4000 ? 'Quality banquet hall' : 'Community centre or masjid hall',
      'catering': amount > 10000 ? 'Premium multi-course halal fine dining' : amount > 5000 ? 'High-quality halal buffet' : 'Traditional family-style catering',
      'mehndi': amount > 2000 ? 'Full mehndi party with professional artists' : amount > 1000 ? 'Intimate gathering with mehndi artist' : 'Home-based mehndi with family',
      'photography': amount > 4000 ? 'Full cinematic video + photography package' : amount > 2000 ? 'Professional all-day coverage' : 'Essential photography package',
      'decor': amount > 3000 ? 'Custom stage design with fresh flowers' : amount > 1500 ? 'Themed decor with quality centrepieces' : 'Elegant minimalist decor',
      'attire': amount > 3000 ? 'Designer bridal & groom wear' : amount > 1500 ? 'Premium boutique outfits' : 'Quality traditional wear',
      'beauty': amount > 1000 ? 'Premium bridal makeup artist with trials' : amount > 500 ? 'Professional makeup services' : 'Standard beauty services',
      'transport': amount > 1500 ? 'Luxury car hire with chauffeur' : amount > 700 ? 'Quality wedding car' : 'Standard transport arrangements',
      'invitations': amount > 800 ? 'Custom designed luxury invitations' : amount > 400 ? 'Quality printed invitations' : 'Digital or simple printed invites',
      'favours': amount > 1500 ? 'Premium curated gift boxes' : amount > 700 ? 'Quality sweet boxes' : 'Simple traditional favours',
      'other': amount > 1000 ? 'Comprehensive miscellaneous budget' : amount > 500 ? 'Standard contingency fund' : 'Basic extras coverage'
    };
    return recommendations[category] || 'Consult local vendors for best options';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif font-bold text-slate-800 mb-2">Wedding Budget Architect</h2>
        <p className="text-slate-600 italic">"The most blessed wedding is the one with the least expenses."</p>
      </div>

      {/* Budget & Guest Input */}
      <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 mb-8 border border-slate-100">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Currency</label>
            <select
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-400 focus:bg-white rounded-2xl transition-all outline-none font-semibold text-slate-800"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Total Budget</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">{selectedCurrency.symbol}</span>
              <input 
                type="number" 
                min="0"
                value={totalBudget} 
                onChange={(e) => setTotalBudget(e.target.value)} 
                placeholder="25,000" 
                className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-2 focus:bg-white rounded-2xl transition-all outline-none text-xl font-semibold text-slate-800 ${
                  budgetError ? 'border-red-300 focus:border-red-400' : 'border-transparent focus:border-emerald-400'
                }`}
              />
            </div>
            {budgetError && <p className="text-red-500 text-xs mt-2 font-medium">{budgetError}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Expected Guests</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
              <input 
                type="number" 
                min="1"
                max="10000"
                value={guestCount} 
                onChange={(e) => setGuestCount(e.target.value)} 
                placeholder="200" 
                className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-2 focus:bg-white rounded-2xl transition-all outline-none text-xl font-semibold text-slate-800 ${
                  guestError ? 'border-red-300 focus:border-red-400' : 'border-transparent focus:border-emerald-400'
                }`}
              />
            </div>
            {guestError && <p className="text-red-500 text-xs mt-2 font-medium">{guestError}</p>}
          </div>
        </div>

        {/* Category Sliders */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Budget Allocation</h3>
            <button 
              onClick={handleResetDefaults}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {BUDGET_CATEGORIES.map(cat => {
              const percentage = categoryPercentages[cat.key] || 0;
              const amount = Math.round((budget * percentage) / 100);
              const isEditing = editingCategory === cat.key;
              
              return (
                <div key={cat.key} className="bg-slate-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="font-semibold text-slate-700 text-sm truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePercentageChange(cat.key, Math.floor(percentage) - 1)}
                        className="w-6 h-6 flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-md text-sm font-bold transition-colors"
                        disabled={percentage <= 0}
                      >
                        −
                      </button>
                      <span className="text-sm font-bold text-emerald-600 w-12 text-center">
                        {Number.isInteger(percentage) ? percentage : percentage.toFixed(1)}%
                      </span>
                      <button
                        onClick={() => handlePercentageChange(cat.key, Math.floor(percentage) + 1)}
                        className="w-6 h-6 flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-md text-sm font-bold transition-colors"
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
                          // Only allow digits
                          const rawValue = e.target.value.replace(/[^0-9]/g, '');
                          setEditingValue(rawValue);
                        }}
                        onBlur={() => {
                          // Sync the value when user finishes editing
                          const newAmount = parseInt(editingValue) || 0;
                          handleAmountChange(cat.key, newAmount);
                          setEditingCategory(null);
                          setEditingValue('');
                        }}
                        className="w-24 pl-5 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-right font-semibold text-slate-700 text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={percentage}
                    onChange={(e) => handlePercentageChange(cat.key, parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Total Summary */}
        <div className={`rounded-2xl p-4 mb-6 ${isOverBudget ? 'bg-red-50 border-2 border-red-200' : 'bg-emerald-50 border-2 border-emerald-200'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm font-semibold ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                Total Allocated
              </p>
              <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-700' : 'text-emerald-700'}`}>
                {Number.isInteger(totalPercentage) ? totalPercentage : totalPercentage.toFixed(1)}% ({selectedCurrency.symbol}{Math.round(totalAllocated).toLocaleString()})
              </p>
            </div>
            {isOverBudget && (
              <div className="text-right">
                <p className="text-sm font-semibold text-red-600">Over budget by</p>
                <p className="text-lg font-bold text-red-700">
                  {selectedCurrency.symbol}{(totalAllocated - budget).toLocaleString()}
                </p>
              </div>
            )}
            {!isOverBudget && totalPercentage < 100 && (
              <div className="text-right">
                <p className="text-sm font-semibold text-emerald-600">Remaining</p>
                <p className="text-lg font-bold text-emerald-700">
                  {Number.isInteger(100 - totalPercentage) ? (100 - totalPercentage) : (100 - totalPercentage).toFixed(1)}% ({selectedCurrency.symbol}{Math.round(budget - totalAllocated).toLocaleString()})
                </p>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleCalculate}
          disabled={!hasValidInput}
          className={`w-full py-5 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-[0.98] ${
            hasValidInput 
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
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
            <div className="bg-white rounded-3xl p-8 shadow-md border border-slate-100">
              <p className="text-slate-500 text-sm font-medium mb-1">Total Budget</p>
              <h4 className="text-3xl font-bold text-slate-800">{selectedCurrency.symbol}{budget.toLocaleString()}</h4>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-md border border-slate-100">
              <p className="text-slate-500 text-sm font-medium mb-1">Guest Count</p>
              <h4 className="text-3xl font-bold text-emerald-600">{guests} guests</h4>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-md border border-slate-100">
              <p className="text-slate-500 text-sm font-medium mb-1">Cost Per Head</p>
              <h4 className="text-3xl font-bold text-teal-600">{selectedCurrency.symbol}{(budget / guests).toFixed(2)}</h4>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Budget Breakdown</h3>
              <button 
                onClick={() => window.print()}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" /> Print Plan
              </button>
            </div>
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BUDGET_CATEGORIES.filter(cat => categoryPercentages[cat.key] > 0).map(cat => {
                  const percentage = categoryPercentages[cat.key] || 0;
                  const amount = Math.round((budget * percentage) / 100);

                  return (
                    <div key={cat.key} className="bg-slate-50 rounded-2xl p-4 group hover:bg-slate-100 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{cat.icon}</span>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{cat.name}</h4>
                            <p className="text-xs text-slate-400">
                              {Number.isInteger(percentage) ? percentage : percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <span className="text-lg font-black text-slate-800">{selectedCurrency.symbol}{amount.toLocaleString()}</span>
                      </div>
                      
                      <div className="w-full h-2 bg-slate-200 rounded-full mb-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000" 
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      
                      <p className="text-xs text-slate-500">
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
