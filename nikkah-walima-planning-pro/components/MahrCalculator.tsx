
import React, { useState, useMemo } from 'react';
import { Info, Sparkles, X, ChevronRight } from './Icons';
import { MAHR_TYPES, SILVER_NISAB_DIVISOR } from '../constants';
import { MahrType } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

const CURRENCIES = [
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

const RefreshIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>
  </svg>
);

export const MahrCalculator: React.FC = () => {
  // Persisted state
  const [silverPricePerGram, setSilverPricePerGram] = useLocalStorage<number>('mahr-silverPrice', 0.85);
  const [currencyCode, setCurrencyCode] = useLocalStorage<string>('mahr-currency', 'GBP');
  
  // Derive currency object from stored code
  const selectedCurrency = useMemo(() => 
    CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0],
    [currencyCode]
  );
  
  // Session-only state
  const [selectedMahrInfo, setSelectedMahrInfo] = useState<MahrType | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sources, setSources] = useState<{title: string, uri: string}[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchLivePrice = async () => {
    setIsFetching(true);
    setSources([]);
    setFetchError(null);
    try {
      const response = await fetch(`/api/silver-price?currency=${selectedCurrency.code}`);
      const data = await response.json();
      
      if (data.error) {
        setFetchError(data.error);
        return;
      }
      
      if (data.price) {
        setSilverPricePerGram(data.price);
        setLastUpdated(new Date().toLocaleTimeString());
      }
      
      if (data.sources) {
        setSources(data.sources);
      }
    } catch (error) {
      console.error("Error fetching silver price:", error);
      setFetchError("Failed to fetch price. Please try again.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleCurrencyChange = (code: string) => {
    setCurrencyCode(code);
    setLastUpdated(null); // Clear last updated when currency changes
    setSources([]);
  };

  const handleNisabChange = (val: string) => {
    const nisab = parseFloat(val);
    if (nisab > 0) {
      setSilverPricePerGram(nisab / SILVER_NISAB_DIVISOR);
      setLastUpdated(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif font-bold text-slate-800 mb-2">Authentic Mahr Calculator</h2>
        <p className="text-slate-600">Determining mahr based on contemporary silver market valuations</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-10 border border-slate-100">
        <div className="flex items-start gap-4 p-5 bg-blue-50 border border-blue-100 rounded-2xl mb-8">
          <Info className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
          <div className="text-sm">
            <h4 className="font-bold text-blue-900 mb-1">Market Valuation Help</h4>
            <p className="text-blue-800 leading-relaxed">
              Islamic Mahr traditions are historically tied to the weight of Silver Dirhams. 
              Click the "Update Live" button to fetch current market rates via Google Search.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-end">
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700">Currency</label>
            <select
              value={selectedCurrency.code}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-400 focus:bg-white rounded-2xl transition-all outline-none font-bold text-slate-800"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700 flex justify-between">
              <span>Price Per Gram ({selectedCurrency.code})</span>
              {lastUpdated && <span className="text-[10px] text-emerald-600 uppercase">Updated: {lastUpdated}</span>}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">{selectedCurrency.symbol}</span>
              <input 
                type="number" 
                step="0.0001" 
                value={silverPricePerGram}
                onChange={(e) => {
                  setSilverPricePerGram(parseFloat(e.target.value) || 0);
                  setLastUpdated(null);
                }}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-400 focus:bg-white rounded-2xl transition-all outline-none font-bold text-slate-800 text-xl"
              />
            </div>
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700 opacity-0 hidden md:block">Action</label>
            <button 
              onClick={fetchLivePrice}
              disabled={isFetching}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-[0.98] ${
                isFetching 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
              }`}
            >
              <RefreshIcon className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Fetching...' : 'Update Live Price'}
            </button>
          </div>
        </div>

        {fetchError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm">
            {fetchError}
          </div>
        )}

        {sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Data Sources:</p>
            <div className="flex flex-wrap gap-2">
              {sources.map((s, idx) => (
                <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-600 hover:text-emerald-600 transition-colors">
                  {s.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {MAHR_TYPES.map(mahr => {
          const value = (mahr.grams * silverPricePerGram).toFixed(2);
          return (
            <div key={mahr.id} className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all">
              <div className={`bg-gradient-to-br ${mahr.color} p-6 text-white`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold">{mahr.name}</h3>
                  <Sparkles className="w-5 h-5 opacity-50" />
                </div>
                <p className="text-xs font-medium opacity-80 uppercase tracking-widest">{mahr.arabicName}</p>
              </div>
              <div className="p-6">
                <p className="text-3xl font-black text-slate-800 mb-4">{selectedCurrency.symbol}{parseFloat(value).toLocaleString()}</p>
                <div className={`${mahr.bgColor} ${mahr.textColor} rounded-2xl p-4 text-xs font-semibold mb-6 min-h-[80px]`}>
                  {mahr.description}
                  <div className="mt-2 text-[10px] opacity-70">Weight: {mahr.grams}g Silver</div>
                </div>
                <button 
                  onClick={() => setSelectedMahrInfo(mahr)}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  View Details <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h3 className="text-2xl font-serif font-bold mb-6">Mahr Principles in Islam</h3>
          <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
            <p>
              <strong className="text-emerald-400">Essential Obligation:</strong> Mahr is a mandatory gift from the groom to the bride. It is her exclusive property and symbolizes the groom's responsibility to provide and protect.
            </p>
            <p>
              <strong className="text-emerald-400">Flexibility:</strong> There is no maximum cap on Mahr. While the Sunnah encourages moderation to facilitate marriage, the bride is entitled to whatever amount is mutually agreed.
            </p>
            <p>
              <strong className="text-emerald-400">Hanafi School:</strong> Requires a minimum (10 Dirhams). Other schools of thought (Shafi'i, Maliki, Hanbali) do not specify a strict minimum but recommend anything of value.
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20"></div>
      </div>

      {selectedMahrInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedMahrInfo(null)}>
          <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-serif font-bold text-slate-800">{selectedMahrInfo.name}</h3>
                <p className="text-emerald-600 font-medium">{selectedMahrInfo.arabicName}</p>
              </div>
              <button onClick={() => setSelectedMahrInfo(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl text-slate-700 text-sm leading-relaxed border border-slate-100">
                {selectedMahrInfo.details}
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-emerald-50 rounded-xl">
                <span className="text-xs font-bold text-emerald-800 uppercase">Calculated Weight</span>
                <span className="font-mono font-bold text-emerald-900">{selectedMahrInfo.grams}g Silver</span>
              </div>
            </div>
            <button 
              onClick={() => setSelectedMahrInfo(null)}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-colors"
            >
              Understand and Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
