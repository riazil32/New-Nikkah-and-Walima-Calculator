
import React, { useState, useMemo } from 'react';
import { Users, Calculator, Sparkles } from './Icons';
import { BUDGET_CATEGORIES, CURRENCIES } from '../constants';
import { EnabledCategoriesState } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

export const BudgetPlanner: React.FC = () => {
  // Persisted state
  const [totalBudget, setTotalBudget] = useLocalStorage<string>('budget-totalBudget', '20000');
  const [guestCount, setGuestCount] = useLocalStorage<string>('budget-guestCount', '150');
  const [currencyCode, setCurrencyCode] = useLocalStorage<string>('budget-currency', 'GBP');
  const [enabledCategories, setEnabledCategories] = useLocalStorage<EnabledCategoriesState>(
    'budget-enabledCategories',
    BUDGET_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.key]: true }), {})
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

  const budget = parseFloat(totalBudget) || 0;
  const guests = parseInt(guestCount) || 0;

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

  const hasValidInput = budget > 0 && guests > 0 && !budgetError && !guestError;

  const totalEnabledBaseWeight = useMemo(() => {
    return BUDGET_CATEGORIES.reduce((sum, cat) => 
      sum + (enabledCategories[cat.key] ? cat.basePercentage : 0), 0
    );
  }, [enabledCategories]);

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

  const toggleCategory = (key: string) => {
    setEnabledCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getRecommendation = (category: string, amount: number) => {
    const recommendations: Record<string, string> = {
      venue: amount > 10000 ? 'Premium hotel ballroom or luxury hall' : amount > 5000 ? 'Well-appointed banquet hall' : 'Masjid hall or community centre',
      catering: amount > 12000 ? 'Signature multi-course halal fine dining' : amount > 7000 ? 'High-quality halal buffet' : 'Traditional family-style catering',
      mehndi: amount > 3000 ? 'Large pre-wedding party with professional artists' : amount > 1500 ? 'Focused bridal mehndi and small gathering' : 'Simple home-based mehndi event',
      photography: amount > 4000 ? 'Multi-day cinematic video and photography' : amount > 2500 ? 'Full wedding day professional coverage' : 'Essential wedding photography package',
      decor: amount > 4000 ? 'Custom designer stage and fresh floral walls' : amount > 2000 ? 'Themed stage and elegant table centres' : 'Minimalist and tasteful stage decor',
      attire: amount > 3000 ? 'Designer bridal/groom wear and jewellery' : amount > 1500 ? 'Premium boutique wedding attire' : 'High-street traditional wedding wear',
      gifts: amount > 2000 ? 'Luxury curated gift hampers for guests' : amount > 1000 ? 'Sweet boxes and traditional favours' : 'Thoughtful traditional mementos',
      other: amount > 1500 ? 'Premium car hire and professional planning' : amount > 800 ? 'Standard car hire and essential services' : 'DIY coordination and basic transport'
    };
    return recommendations[category] || 'Consult local vendors for best fit';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif font-bold text-slate-800 mb-2">Wedding Budget Architect</h2>
        <p className="text-slate-600 italic">"The most blessed wedding is the one with the least expenses."</p>
      </div>

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
            <label className="block text-sm font-semibold text-slate-700 mb-3">Total Investment Budget</label>
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
            <label className="block text-sm font-semibold text-slate-700 mb-3">Expected Guest List</label>
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

        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Included Categories</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BUDGET_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => toggleCategory(cat.key)}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center ${
                  enabledCategories[cat.key] 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                    : 'border-slate-100 bg-white text-slate-400 grayscale opacity-50'
                }`}
              >
                <span className="text-2xl mb-2">{cat.icon}</span>
                <span className="text-xs font-bold leading-tight">{cat.name}</span>
              </button>
            ))}
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
          Generate Optimized Breakdown
        </button>
      </div>

      {showResults && budget > 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-8 shadow-md border border-slate-100">
              <p className="text-slate-500 text-sm font-medium mb-1">Total Allocated</p>
              <h4 className="text-3xl font-bold text-slate-800">{selectedCurrency.symbol}{budget.toLocaleString()}</h4>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-md border border-slate-100">
              <p className="text-slate-500 text-sm font-medium mb-1">Guest Capacity</p>
              <h4 className="text-3xl font-bold text-emerald-600">{guests} guests</h4>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-md border border-slate-100">
              <p className="text-slate-500 text-sm font-medium mb-1">Cost Per Head</p>
              <h4 className="text-3xl font-bold text-teal-600">{selectedCurrency.symbol}{(budget / guests).toFixed(2)}</h4>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Budget Distribution Summary</h3>
              <button 
                onClick={() => window.print()}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" /> Print Plan
              </button>
            </div>
            <div className="p-4 md:p-8 space-y-6">
              {BUDGET_CATEGORIES.filter(c => enabledCategories[c.key]).map(cat => {
                const adjustedWeight = cat.basePercentage / totalEnabledBaseWeight;
                const amount = Math.round(budget * adjustedWeight);
                const percentage = Math.round(adjustedWeight * 100);

                return (
                  <div key={cat.key} className="group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                          {cat.icon}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{cat.name}</h4>
                          <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">{percentage}% of budget</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-slate-800">{selectedCurrency.symbol}{amount.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="w-full h-3 bg-slate-100 rounded-full mb-3 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    
                    <div className={`${cat.color} rounded-2xl p-4 text-sm font-medium border border-current border-opacity-10`}>
                      <span className="font-bold">Recommendation:</span> {getRecommendation(cat.key, amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
