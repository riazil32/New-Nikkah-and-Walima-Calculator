
import React, { useState, useMemo } from 'react';
import { Info, Sparkles, X, ChevronRight, Scroll, ChevronDown } from './Icons';
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

const RefreshIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>
  </svg>
);

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

  // Color configs for each mahr type - glass/outline style
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
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header - matching Budget page style */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-white mb-2">Authentic Mahr Calculator</h2>
        <p className="text-slate-600 dark:text-slate-400 italic">Silver-based mahr valuations using live market rates</p>
      </div>

      {/* Controls Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 md:p-6 mb-6 border border-slate-200 dark:border-slate-700">
        {/* Info text - subtle */}
        <p className="text-sm italic text-center text-slate-400 dark:text-slate-500 mb-4">
          Islamic Mahr traditions are historically tied to the weight of Silver Dirhams. Fetch live rates to get accurate valuations.
        </p>

        {/* Currency + Price + Button */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          {/* Currency */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Currency</label>
            <select
              value={selectedCurrency.code}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-emerald-400 transition-all"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</option>
              ))}
            </select>
          </div>
          {/* Price Per Gram */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Price/Gram ({selectedCurrency.code})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{selectedCurrency.symbol}</span>
              <input 
                type="number" 
                step="0.0001" 
                value={silverPricePerGram}
                onChange={(e) => {
                  const localPrice = parseFloat(e.target.value) || 0;
                  setSilverPricePerGram(localPrice);
                  // Also update GBP base for currency conversion
                  const rate = EXCHANGE_RATES_FROM_GBP[selectedCurrency.code] || 1;
                  setSilverPriceGBP(localPrice / rate);
                  setLastUpdated(null);
                  setPriceChange(null);
                }}
                className="w-full pl-7 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-emerald-400 transition-all"
              />
            </div>
          </div>
          {/* Update Button */}
          <button 
            onClick={fetchLivePrice}
            disabled={isFetching}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-[0.98] border ${
              isFetching 
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 border-slate-200 dark:border-slate-600 cursor-not-allowed' 
              : 'bg-transparent text-emerald-700 dark:text-emerald-400 border-emerald-500 dark:border-emerald-500/60 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:hover:bg-emerald-600 dark:hover:text-white dark:hover:border-emerald-600'
            }`}
          >
            <RefreshIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Fetching...' : 'Update Prices'}
          </button>
        </div>

        {/* Status bar: Updated time + Price change indicator */}
        {(lastUpdated || fetchError || priceChange) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {lastUpdated && (
              <span className="text-slate-500 dark:text-slate-400">
                Updated: <span className="font-medium text-slate-600 dark:text-slate-300">{lastUpdated}</span>
                {fetchError && fetchError.includes('converted from GBP') && (
                  <span className="text-slate-400 dark:text-slate-500"> • Converted from GBP</span>
                )}
              </span>
            )}
            {priceChange && priceChange.direction !== 'same' && (
              <span className={`font-medium px-2 py-0.5 rounded-full ${
                priceChange.direction === 'up' 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              }`}>
                {priceChange.direction === 'up' ? '↑' : '↓'} Silver price {priceChange.direction === 'up' ? 'increased' : 'decreased'} ({selectedCurrency.symbol}{Math.abs(priceChange.newPrice - priceChange.oldPrice).toFixed(4)}/g)
              </span>
            )}
            {priceChange && priceChange.direction === 'same' && (
              <span className="text-slate-400 dark:text-slate-500">No change in price</span>
            )}
            {fetchError && (
              <span className="text-amber-600 dark:text-amber-400">⚠️ {fetchError}</span>
            )}
          </div>
        )}

        {/* Sources */}
        {sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Sources:</p>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((s, idx) => (
                <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[11px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {s.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mahr Types - 3-column grid on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {MAHR_TYPES.map(mahr => {
          const value = mahr.grams * silverPricePerGram;
          const isExpanded = expandedCards[mahr.id] ?? true;
          const colors = colorConfig[mahr.id] || colorConfig['minimum'];
          
          return (
            <div 
              key={mahr.id} 
              className={`relative rounded-xl overflow-hidden border-2 ${colors.borderColor} bg-white dark:bg-slate-800/50 shadow-lg ${colors.glowShadow} transition-all hover:shadow-xl hover:-translate-y-0.5`}
            >
              {/* Card header */}
              <div className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className={`text-base font-bold ${colors.titleColor}`}>{mahr.name}</h3>
                  {/* Arabic calligraphy - top right */}
                  <p 
                    className={`text-3xl font-bold leading-none select-none flex-shrink-0 ${colors.subtitleColor}`}
                    style={{ fontFamily: 'serif' }}
                  >
                    {mahr.arabicName}
                  </p>
                </div>
                
                {/* Price - hero element */}
                <p className="text-3xl font-black text-slate-800 dark:text-white mb-0.5">
                  {selectedCurrency.symbol}{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {mahr.grams.toFixed(1)}g Silver
                </p>
              </div>

              {/* Divider */}
              <div className="mx-4 border-t border-slate-100 dark:border-slate-700" />

              {/* Card body */}
              <div className="relative z-10 p-4 pt-3">
                {/* Description - always visible, min-height for alignment on desktop */}
                <p className={`text-xs leading-relaxed p-2.5 rounded-lg border md:min-h-[60px] ${colors.descBg} ${colors.descText} ${colors.descBorder} mb-3`}>
                  {mahr.description}
                </p>

                {/* Expand for scholarly details */}
                <button
                  onClick={() => toggleCard(mahr.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {isExpanded ? 'Hide' : 'View'} Details
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {mahr.details}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mahr Principles - Collapsible, open by default */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          onClick={() => setShowPrinciples(!showPrinciples)}
          className="w-full px-4 py-3 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">📖</span>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Mahr Principles in Islam</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showPrinciples ? 'rotate-180' : ''}`} />
        </button>
        
        {showPrinciples && (
          <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-3 mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                <strong className="text-emerald-600 dark:text-emerald-400">Essential Obligation:</strong> Mahr is a mandatory gift from the groom to the bride. It is her exclusive property and symbolizes the groom's responsibility to provide and protect.
              </p>
              <p>
                <strong className="text-emerald-600 dark:text-emerald-400">Flexibility:</strong> There is no maximum cap on Mahr. While the Sunnah encourages moderation to facilitate marriage, the bride is entitled to whatever amount is mutually agreed.
              </p>
              <p>
                <strong className="text-emerald-600 dark:text-emerald-400">Hanafi School:</strong> Requires a minimum (10 Dirhams). Other schools of thought (Shafi'i, Maliki, Hanbali) do not specify a strict minimum but recommend anything of value.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
