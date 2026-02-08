
import React, { useState, useMemo } from 'react';
import { Info, Sparkles, X, ChevronRight, Scroll, ChevronDown, RefreshCw, BookOpen } from './Icons';
import { CustomSelect } from './CustomSelect';
import { MAHR_TYPES, SILVER_NISAB_DIVISOR, CURRENCIES } from '../constants';
import { MahrType } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Exchange rates from GBP (must match BudgetPlanner)
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

export const MahrCalculator: React.FC = () => {
  // Persisted state
  const [silverPricePerGram, setSilverPricePerGram] = useLocalStorage<number>('mahr-silverPrice', 0.85);
  const [silverPriceGBP, setSilverPriceGBP] = useLocalStorage<number>('mahr-silverPriceGBP', 0.85);
  const [currencyCode, setCurrencyCode] = useLocalStorage<string>('mahr-currency', 'GBP');
  const [priceCurrency, setPriceCurrency] = useLocalStorage<string>('mahr-priceCurrency', 'GBP');
  
  // Derive currency object from stored code
  const selectedCurrency = useMemo(() => 
    CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0],
    [currencyCode]
  );
  
  // Session-only state
  const [isFetching, setIsFetching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sources, setSources] = useState<{title: string, uri: string}[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [priceChange, setPriceChange] = useState<{ direction: 'up' | 'down' | 'same'; oldPrice: number; newPrice: number } | null>(null);
  // Responsive defaults: expanded on desktop (md+), collapsed on mobile
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
  const [showPrinciples, setShowPrinciples] = useState(isDesktop);
  const [showPaymentTypes, setShowPaymentTypes] = useState(isDesktop);
  // Independent expand state per card
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    'minimum': isDesktop, 'azwaj': isDesktop, 'fatimi': isDesktop
  });

  const toggleCard = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchLivePrice = async () => {
    setIsFetching(true);
    setSources([]);
    setFetchError(null);
    setPriceChange(null);
    const oldPrice = silverPricePerGram;
    const fetchCurrency = selectedCurrency.code;
    
    try {
      const response = await fetch(`/api/silver-price?currency=${fetchCurrency}`);
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Dev mode fallback
        const rate = EXCHANGE_RATES_FROM_GBP[fetchCurrency] || 1;
        const estimated = Math.round(0.85 * rate * 100) / 100;
        setSilverPricePerGram(estimated);
        setSilverPriceGBP(0.85);
        setPriceCurrency(fetchCurrency);
        setLastUpdated(new Date().toLocaleTimeString() + ' (estimated)');
        setFetchError('API unavailable - using estimated price');
        return;
      }
      
      const data = await response.json();
      
      // If API doesn't support this currency, fall back to GBP + convert
      if (data.error) {
        console.warn(`API error for ${fetchCurrency}: ${data.error}, falling back to GBP`);
        const gbpResponse = await fetch(`/api/silver-price?currency=GBP`);
        const gbpData = await gbpResponse.json();
        
        if (gbpData.price) {
          const rate = EXCHANGE_RATES_FROM_GBP[fetchCurrency] || 1;
          const convertedPrice = Math.round(gbpData.price * rate * 100) / 100;
          setSilverPriceGBP(gbpData.price);
          setSilverPricePerGram(convertedPrice);
          setPriceCurrency(fetchCurrency);
          setLastUpdated(new Date().toLocaleTimeString());
          setFetchError(`Live rate converted from GBP (${fetchCurrency} not directly supported)`);
          
          if (oldPrice > 0 && priceCurrency === fetchCurrency) {
            const direction = convertedPrice > oldPrice ? 'up' : convertedPrice < oldPrice ? 'down' : 'same';
            setPriceChange({ direction, oldPrice, newPrice: convertedPrice });
          }
        } else {
          setFetchError('Failed to fetch price. Showing most recent cached data.');
        }
        return;
      }
      
      if (data.price) {
        const newPrice = data.price;
        setSilverPricePerGram(newPrice);
        setPriceCurrency(fetchCurrency);
        setLastUpdated(new Date().toLocaleTimeString());
        
        // Also store GBP equivalent for fallback
        if (fetchCurrency === 'GBP') {
          setSilverPriceGBP(newPrice);
        }
        
        // Track price change only if same currency as last fetch
        if (oldPrice > 0 && priceCurrency === fetchCurrency) {
          const direction = newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : 'same';
          setPriceChange({ direction, oldPrice, newPrice });
        }
      }
      
      if (data.sources) {
        setSources(data.sources);
      }
    } catch (error) {
      console.error("Error fetching silver price:", error);
      const rate = EXCHANGE_RATES_FROM_GBP[fetchCurrency] || 1;
      const estimated = Math.round(0.85 * rate * 100) / 100;
      setSilverPricePerGram(estimated);
      setSilverPriceGBP(0.85);
      setPriceCurrency(fetchCurrency);
      setLastUpdated(new Date().toLocaleTimeString() + ' (estimated)');
      setFetchError('Could not fetch live price - using estimate');
    } finally {
      setIsFetching(false);
    }
  };

  const handleCurrencyChange = (code: string) => {
    setCurrencyCode(code);
    // Convert existing price to new currency
    const rate = EXCHANGE_RATES_FROM_GBP[code] || 1;
    setSilverPricePerGram(Math.round(silverPriceGBP * rate * 100) / 100);
    setPriceCurrency(code);
    // Clear price change since currency changed
    setPriceChange(null);
  };

  // Color configs for each mahr type
  const colorConfig: Record<string, { 
    borderColor: string; glowShadow: string;
    titleColor: string; subtitleColor: string;
    descBg: string; descText: string; descBorder: string;
    accentColor: string;
  }> = {
    'minimum': { 
      borderColor: 'border-cyan-500/60 dark:border-cyan-400/40',
      glowShadow: 'shadow-cyan-500/10 dark:shadow-cyan-400/5 hover:shadow-cyan-500/20 dark:hover:shadow-cyan-400/20',
      titleColor: 'text-cyan-600 dark:text-cyan-400',
      subtitleColor: 'text-cyan-500/60 dark:text-cyan-400/50',
      descBg: 'bg-cyan-50 dark:bg-cyan-900/20',
      descText: 'text-cyan-800 dark:text-cyan-200',
      descBorder: 'border-cyan-200 dark:border-cyan-800/50',
      accentColor: 'text-cyan-600 dark:text-cyan-400',
    },
    'azwaj': { 
      borderColor: 'border-emerald-500/60 dark:border-emerald-400/40',
      glowShadow: 'shadow-emerald-500/10 dark:shadow-emerald-400/5 hover:shadow-emerald-500/20 dark:hover:shadow-emerald-400/20',
      titleColor: 'text-emerald-600 dark:text-emerald-400',
      subtitleColor: 'text-emerald-500/60 dark:text-emerald-400/50',
      descBg: 'bg-emerald-50 dark:bg-emerald-900/20',
      descText: 'text-emerald-800 dark:text-emerald-200',
      descBorder: 'border-emerald-200 dark:border-emerald-800/50',
      accentColor: 'text-emerald-600 dark:text-emerald-400',
    },
    'fatimi': { 
      borderColor: 'border-purple-500/60 dark:border-purple-400/40',
      glowShadow: 'shadow-purple-500/10 dark:shadow-purple-400/5 hover:shadow-purple-500/20 dark:hover:shadow-purple-400/20',
      titleColor: 'text-purple-600 dark:text-purple-400',
      subtitleColor: 'text-purple-500/60 dark:text-purple-400/50',
      descBg: 'bg-purple-50 dark:bg-purple-900/20',
      descText: 'text-purple-800 dark:text-purple-200',
      descBorder: 'border-purple-200 dark:border-purple-800/50',
      accentColor: 'text-purple-600 dark:text-purple-400',
    }
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
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-white mb-2">Authentic Mahr Calculator</h2>
        <p className="text-slate-600 dark:text-slate-400 italic">Silver-based mahr valuations using live market rates</p>
      </div>

      {/* Controls Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-3 md:p-4 mb-4 border border-slate-200 dark:border-slate-700">
        {/* Info text */}
        <p className="text-[11px] italic text-center text-slate-400 dark:text-slate-500 mb-3">
          Islamic Mahr traditions are historically tied to the weight of Silver Dirhams. Fetch live rates to get accurate valuations.
        </p>

        {/* Currency + Price + Button */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-end">
          {/* Currency */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Currency</label>
            <CustomSelect
              value={selectedCurrency.code}
              onChange={(val) => handleCurrencyChange(val)}
              options={CURRENCIES.map(c => ({ value: c.code, label: `${c.symbol} ${c.code} - ${c.name}` }))}
            />
          </div>
          {/* Price Per Gram */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Price/Gram ({selectedCurrency.code})
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium pointer-events-none whitespace-nowrap">{selectedCurrency.symbol}</span>
              <input 
                type="text"
                inputMode="decimal"
                value={silverPricePerGram}
                onChange={(e) => {
                  const filtered = e.target.value.replace(/[^0-9.]/g, '');
                  const localPrice = parseFloat(filtered) || 0;
                  setSilverPricePerGram(localPrice);
                  const rate = EXCHANGE_RATES_FROM_GBP[selectedCurrency.code] || 1;
                  setSilverPriceGBP(localPrice / rate);
                  setLastUpdated(null);
                  setPriceChange(null);
                }}
                className="w-full pl-10 pr-2 h-8 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-emerald-400 transition-all"
              />
            </div>
          </div>
          {/* Update Button */}
          <button 
            onClick={fetchLivePrice}
            disabled={isFetching}
            className={`flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold transition-all active:scale-[0.98] border ${
              isFetching 
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 border-slate-200 dark:border-slate-600 cursor-not-allowed' 
              : 'bg-transparent text-emerald-700 dark:text-emerald-400 border-emerald-500 dark:border-emerald-500/60 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:hover:bg-emerald-600 dark:hover:text-white dark:hover:border-emerald-600'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Fetching...' : 'Update Prices'}
          </button>
        </div>

        {/* Status bar */}
        {(lastUpdated || fetchError || priceChange) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
            {lastUpdated && (
              <span className="text-slate-500 dark:text-slate-400">
                Updated: <span className="font-medium text-slate-600 dark:text-slate-300">{lastUpdated}</span>
                {fetchError && fetchError.includes('converted from GBP') && (
                  <span className="text-slate-400 dark:text-slate-500"> • Converted from GBP</span>
                )}
              </span>
            )}
            {priceChange && priceChange.direction !== 'same' && (
              <span className={`font-medium px-1.5 py-0.5 rounded-full ${
                priceChange.direction === 'up' 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              }`}>
                {priceChange.direction === 'up' ? '↑' : '↓'} Silver {priceChange.direction === 'up' ? 'up' : 'down'} ({selectedCurrency.symbol}{Math.abs(priceChange.newPrice - priceChange.oldPrice).toFixed(4)}/g)
              </span>
            )}
            {priceChange && priceChange.direction === 'same' && (
              <span className="text-slate-400 dark:text-slate-500">No change in price</span>
            )}
            {fetchError && (
              <span className="text-amber-600 dark:text-amber-400">{fetchError}</span>
            )}
          </div>
        )}

        {/* Sources */}
        {sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sources:</p>
            <div className="flex flex-wrap gap-1">
              {sources.map((s, idx) => (
                <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[11px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {s.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mahr Types - 3-column grid on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {MAHR_TYPES.map(mahr => {
          const value = mahr.grams * silverPricePerGram;
          const isExpanded = expandedCards[mahr.id] ?? true;
          const colors = colorConfig[mahr.id] || colorConfig['minimum'];
          
          return (
            <div 
              key={mahr.id} 
              className={`relative rounded-xl overflow-hidden border-2 ${colors.borderColor} bg-white dark:bg-slate-800/50 shadow-md ${colors.glowShadow} transition-all hover:shadow-lg hover:-translate-y-0.5`}
            >
              {/* Card header */}
              <div className="px-3 pt-3 pb-2">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className={`text-sm font-bold ${colors.titleColor}`}>{mahr.name}</h3>
                  <p 
                    className={`text-2xl font-bold leading-none select-none flex-shrink-0 ${colors.subtitleColor}`}
                    style={{ fontFamily: 'serif' }}
                  >
                    {mahr.arabicName}
                  </p>
                </div>
                
                {/* Price */}
                <p className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                  {selectedCurrency.symbol}{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {mahr.grams.toFixed(1)}g Silver
                </p>
              </div>

              {/* Divider */}
              <div className="mx-3 border-t border-slate-100 dark:border-slate-700" />

              {/* Card body */}
              <div className="relative z-10 px-3 py-2">
                {/* Description */}
                <p className={`text-[11px] leading-relaxed p-2 rounded-lg border md:min-h-[52px] ${colors.descBg} ${colors.descText} ${colors.descBorder} mb-2`}>
                  {mahr.description}
                </p>

                {/* Expand toggle */}
                <button
                  onClick={() => toggleCard(mahr.id)}
                  className="w-full flex items-center justify-center gap-1 py-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {isExpanded ? 'Hide' : 'View'} Details
                  <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {mahr.details}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Educational Cards - Side by side on desktop */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 ${showPaymentTypes && showPrinciples ? 'items-stretch' : 'items-start'}`}>
        {/* Prompt vs Deferred */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
          <button
            onClick={() => setShowPaymentTypes(!showPaymentTypes)}
            className="w-full px-3 py-2.5 flex items-center justify-between text-left"
          >
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            Prompt vs Deferred Mahr
          </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${showPaymentTypes ? 'rotate-180' : ''}`} />
          </button>
          
          {showPaymentTypes && (
            <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700 flex-1">
              <div className="space-y-2 mt-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800/50">
                    <p className="font-bold text-cyan-700 dark:text-cyan-300 text-[11px] uppercase tracking-wide mb-1">Prompt (Mu'ajjal)</p>
                    <p className="text-[11px] text-cyan-800 dark:text-cyan-200/80 leading-relaxed">
                      Paid immediately at the time of the Nikkah ceremony. This is the most common practice and is the bride's right to receive before the marriage is consummated.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide mb-1">Deferred (Mu'wajjal)</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Payment is delayed — typically payable upon the wife's request, divorce, or the husband's death. Some couples split the Mahr into both portions.
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                  Both types are valid and can be combined. Configure payment type in Budget Planner and Certificate Builder.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mahr Principles in Islam */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
          <button
            onClick={() => setShowPrinciples(!showPrinciples)}
            className="w-full px-3 py-2.5 flex items-center justify-between text-left"
          >
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            Mahr Principles in Islam
          </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${showPrinciples ? 'rotate-180' : ''}`} />
          </button>
          
          {showPrinciples && (
            <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700 flex-1">
            <div className="space-y-2 mt-2.5">
              <div className="flex gap-2 items-baseline">
                <span className="text-emerald-500 dark:text-emerald-400 flex-shrink-0 text-sm leading-none">•</span>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong className="text-emerald-600 dark:text-emerald-400">Essential Obligation</strong> — Mahr is a mandatory gift from the groom to the bride. It is her exclusive property and symbolizes the groom's responsibility to provide and protect.
                </p>
              </div>
              <div className="flex gap-2 items-baseline">
                <span className="text-emerald-500 dark:text-emerald-400 flex-shrink-0 text-sm leading-none">•</span>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong className="text-emerald-600 dark:text-emerald-400">Flexibility</strong> — There is no maximum cap on Mahr. The Sunnah encourages moderation to facilitate marriage, but the bride is entitled to whatever amount is mutually agreed.
                </p>
              </div>
              <div className="flex gap-2 items-baseline">
                <span className="text-emerald-500 dark:text-emerald-400 flex-shrink-0 text-sm leading-none">•</span>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong className="text-emerald-600 dark:text-emerald-400">Hanafi School</strong> — Requires a minimum (10 Dirhams). Other schools of thought (Shafi'i, Maliki, Hanbali) do not specify a strict minimum but recommend anything of value.
                </p>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Workflow hint */}
      <div className="text-center py-2">
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          <span className="font-medium text-slate-500 dark:text-slate-400">Research</span> Mahr here
          <span className="mx-1.5">→</span>
          <span className="font-medium text-slate-500 dark:text-slate-400">Set amount</span> in Budget
          <span className="mx-1.5">→</span>
          <span className="font-medium text-slate-500 dark:text-slate-400">Document</span> in Certificate
        </p>
      </div>
    </div>
  );
};
