
import React, { useState, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ContractData, MahrPaymentType } from '../types';
import { MAHR_TYPES, CURRENCIES } from '../constants';

// Default empty contract data
const getDefaultContractData = (): ContractData => ({
  dateGregorian: '',
  dateHijri: '',
  location: '',
  groomName: '',
  groomFatherName: '',
  brideName: '',
  brideFatherName: '',
  mahrAmount: '',
  mahrType: 'prompt',
  witness1Name: '',
  witness2Name: '',
  waliName: '',
  officiantName: '',
});

// Required fields for validation
const REQUIRED_FIELDS: { field: keyof ContractData; label: string }[] = [
  { field: 'dateGregorian', label: 'Date (Gregorian)' },
  { field: 'location', label: 'Location' },
  { field: 'groomName', label: "Groom's Name" },
  { field: 'groomFatherName', label: "Groom's Father's Name" },
  { field: 'brideName', label: "Bride's Name" },
  { field: 'brideFatherName', label: "Bride's Father's Name" },
  { field: 'mahrAmount', label: 'Mahr Amount' },
  { field: 'witness1Name', label: 'Witness 1' },
  { field: 'witness2Name', label: 'Witness 2' },
  { field: 'waliName', label: 'Wali' },
];

export const ContractBuilder: React.FC = () => {
  // Persisted form state
  const [contractData, setContractData] = useLocalStorage<ContractData>(
    'contract-formData',
    getDefaultContractData()
  );
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showMahrSync, setShowMahrSync] = useState(false);
  
  // Read mahr calculator data from localStorage
  const [silverPrice] = useLocalStorage<number>('mahr-silverPrice', 0.85);
  const [mahrCurrencyCode] = useLocalStorage<string>('mahr-currency', 'GBP');
  
  const mahrCurrency = useMemo(() => 
    CURRENCIES.find(c => c.code === mahrCurrencyCode) || CURRENCIES[0],
    [mahrCurrencyCode]
  );
  
  // Calculate mahr options
  const mahrOptions = useMemo(() => {
    return MAHR_TYPES.map(mahr => ({
      ...mahr,
      calculatedValue: (mahr.grams * silverPrice).toFixed(2),
      formattedValue: `${mahrCurrency.symbol}${(mahr.grams * silverPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }));
  }, [silverPrice, mahrCurrency]);

  // Handle sync selection
  const handleSyncMahr = (value: string) => {
    updateField('mahrAmount', value);
    setShowMahrSync(false);
    // Clear the temporary key
    localStorage.removeItem('mahr-selectedForContract');
  };

  // Check for pre-selected mahr from calculator
  const handleOpenMahrSync = () => {
    const savedMahr = localStorage.getItem('mahr-selectedForContract');
    if (savedMahr) {
      // Auto-fill and show confirmation
      updateField('mahrAmount', savedMahr);
      localStorage.removeItem('mahr-selectedForContract');
    } else {
      setShowMahrSync(true);
    }
  };

  // Validation
  const missingFields = useMemo(() => {
    return REQUIRED_FIELDS.filter(({ field }) => !contractData[field]?.toString().trim());
  }, [contractData]);

  const isFormValid = missingFields.length === 0;

  // Update a single field
  const updateField = (field: keyof ContractData, value: string | MahrPaymentType) => {
    setContractData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle generate click
  const handleGenerate = () => {
    if (!isFormValid) {
      setShowValidationErrors(true);
      return;
    }
    setShowValidationErrors(false);
    setShowPreview(true);
  };

  // Reset form
  const handleReset = () => {
    setContractData(getDefaultContractData());
    setShowPreview(false);
    setShowValidationErrors(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-white mb-2">Nikkah Contract Builder</h2>
        <p className="text-slate-600 dark:text-slate-400 italic">"And among His signs is that He created for you mates from among yourselves." - Quran 30:21</p>
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-6 md:p-10 mb-8 border border-slate-100 dark:border-slate-700">
        
        {/* Header Info Section */}
        <section className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">1</span>
            Contract Details
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Date (Gregorian) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={contractData.dateGregorian}
                onChange={(e) => updateField('dateGregorian', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-transparent focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-600 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Date (Hijri)
                <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 font-normal">Subject to moon sighting</span>
              </label>
              <input
                type="text"
                value={contractData.dateHijri}
                onChange={(e) => updateField('dateHijri', e.target.value)}
                placeholder="e.g., 15 Shaban 1447"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-transparent focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-600 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Location / Venue <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contractData.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="e.g., East London Mosque, London, UK"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-transparent focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-600 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>
        </section>

        {/* Couple Details Section */}
        <section className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">2</span>
            The Couple
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Groom Section */}
            <div className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-5 border border-teal-200 dark:border-teal-800/50">
              <h4 className="font-bold text-teal-700 dark:text-teal-400 mb-4 flex items-center gap-2">
                <span className="text-lg">🤵</span> The Groom
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contractData.groomName}
                    onChange={(e) => updateField('groomName', e.target.value)}
                    placeholder="Enter groom's full name"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-transparent focus:border-teal-400 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Father's Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contractData.groomFatherName}
                    onChange={(e) => updateField('groomFatherName', e.target.value)}
                    placeholder="Enter groom's father's name"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-transparent focus:border-teal-400 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
            
            {/* Bride Section */}
            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-5 border border-rose-200 dark:border-rose-800/50">
              <h4 className="font-bold text-rose-700 dark:text-rose-400 mb-4 flex items-center gap-2">
                <span className="text-lg">👰</span> The Bride
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contractData.brideName}
                    onChange={(e) => updateField('brideName', e.target.value)}
                    placeholder="Enter bride's full name"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-transparent focus:border-rose-400 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Father's Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contractData.brideFatherName}
                    onChange={(e) => updateField('brideFatherName', e.target.value)}
                    placeholder="Enter bride's father's name"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-transparent focus:border-rose-400 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mahr Section */}
        <section className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">3</span>
            The Mahr
          </h3>
          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-5 border border-violet-200 dark:border-violet-800/50">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Mahr Amount / Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={contractData.mahrAmount}
                  onChange={(e) => updateField('mahrAmount', e.target.value)}
                  placeholder="e.g., £5,000 or 500 grams of silver"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-transparent focus:border-violet-400 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Can be cash, gold, property, or services (e.g., "Teach 5 Surahs")
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Payment Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                    contractData.mahrType === 'prompt' 
                      ? 'bg-violet-100 dark:bg-violet-900/40 border-violet-400 text-violet-700 dark:text-violet-300' 
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-violet-300'
                  }`}>
                    <input
                      type="radio"
                      name="mahrType"
                      value="prompt"
                      checked={contractData.mahrType === 'prompt'}
                      onChange={() => updateField('mahrType', 'prompt')}
                      className="sr-only"
                    />
                    <span className="font-semibold">Prompt</span>
                    <span className="text-xs">(Mu'ajjal)</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                    contractData.mahrType === 'deferred' 
                      ? 'bg-violet-100 dark:bg-violet-900/40 border-violet-400 text-violet-700 dark:text-violet-300' 
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-violet-300'
                  }`}>
                    <input
                      type="radio"
                      name="mahrType"
                      value="deferred"
                      checked={contractData.mahrType === 'deferred'}
                      onChange={() => updateField('mahrType', 'deferred')}
                      className="sr-only"
                    />
                    <span className="font-semibold">Deferred</span>
                    <span className="text-xs">(Mu'wajjal)</span>
                  </label>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Prompt = paid at time of Nikkah. Deferred = paid later (upon death/divorce).
                </p>
              </div>
            </div>
            {/* Sync from Calculator button */}
            <div className="mt-4 pt-4 border-t border-violet-200 dark:border-violet-800/50">
              <button
                type="button"
                className="text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-2"
                onClick={handleOpenMahrSync}
              >
                <span>💎</span> Sync from Mahr Calculator
              </button>
              
              {/* Mahr Sync Modal */}
              {showMahrSync && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowMahrSync(false)}>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-slate-800 dark:text-white text-lg">Select Mahr Amount</h4>
                      <button 
                        onClick={() => setShowMahrSync(false)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                      >
                        <span className="text-slate-400 text-xl">&times;</span>
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                      Based on current silver price: {mahrCurrency.symbol}{silverPrice.toFixed(2)}/gram
                    </p>
                    <div className="space-y-3">
                      {mahrOptions.map(option => (
                        <button
                          key={option.id}
                          onClick={() => handleSyncMahr(option.formattedValue)}
                          className="w-full p-4 bg-slate-50 dark:bg-slate-700 hover:bg-violet-50 dark:hover:bg-violet-900/30 border border-slate-200 dark:border-slate-600 hover:border-violet-300 dark:hover:border-violet-600 rounded-xl text-left transition-all"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white">{option.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{option.grams}g silver</p>
                            </div>
                            <p className="font-bold text-violet-600 dark:text-violet-400 text-lg">{option.formattedValue}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 text-center">
                      Prices synced from Mahr Calculator tab
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Witnesses Section */}
        <section className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">4</span>
            Witnesses & Officiant
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Witness 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contractData.witness1Name}
                onChange={(e) => updateField('witness1Name', e.target.value)}
                placeholder="Enter first witness name"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-transparent focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-600 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Witness 2 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contractData.witness2Name}
                onChange={(e) => updateField('witness2Name', e.target.value)}
                placeholder="Enter second witness name"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-transparent focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-600 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Wali (Bride's Guardian) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contractData.waliName}
                onChange={(e) => updateField('waliName', e.target.value)}
                placeholder="Enter Wali's name"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-transparent focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-600 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Usually the bride's father or male relative
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Officiant (Imam)
              </label>
              <input
                type="text"
                value={contractData.officiantName}
                onChange={(e) => updateField('officiantName', e.target.value)}
                placeholder="Enter Imam's name"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-transparent focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-600 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>
        </section>

        {/* Validation Errors */}
        {showValidationErrors && missingFields.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl">
            <p className="font-bold text-red-700 dark:text-red-400 mb-2">Please fill in the required fields:</p>
            <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside">
              {missingFields.map(({ field, label }) => (
                <li key={field}>{label}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleGenerate}
            className={`flex-1 py-4 px-6 font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] ${
              isFormValid 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 dark:shadow-emerald-900/30' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 dark:shadow-emerald-900/30'
            }`}
          >
            Generate Certificate Preview
          </button>
          <button
            onClick={handleReset}
            className="py-4 px-6 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all"
          >
            Reset Form
          </button>
        </div>
      </div>

      {/* Certificate Preview (conditionally rendered) */}
      {showPreview && (
        <div id="certificate-preview" className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-0 print:rounded-none">
          {/* Certificate Header Actions */}
          <div className="bg-slate-50 dark:bg-slate-700 p-4 flex justify-between items-center print:hidden">
            <h3 className="font-bold text-slate-700 dark:text-slate-200">Certificate Preview</h3>
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2"
              >
                🖨️ Print Certificate
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-200 font-bold rounded-xl text-sm transition-all"
              >
                Edit Form
              </button>
            </div>
          </div>
          
          {/* The Certificate Itself */}
          <div className="p-8 md:p-12 bg-gradient-to-br from-white to-emerald-50 print:bg-white">
            {/* Decorative Border */}
            <div className="border-4 border-double border-emerald-600 p-8 md:p-12">
              {/* Header */}
              <div className="text-center mb-10">
                <div className="text-emerald-600 text-5xl mb-4">﷽</div>
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-2">
                  Certificate of Nikkah
                </h1>
                <p className="text-emerald-700 font-medium">عقد النكاح</p>
              </div>

              {/* Date & Location */}
              <div className="text-center mb-10 pb-8 border-b border-emerald-200">
                <p className="text-slate-600 mb-2">
                  <span className="font-semibold">Date:</span> {contractData.dateGregorian ? new Date(contractData.dateGregorian).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                  {contractData.dateHijri && <span className="text-emerald-600 ml-2">({contractData.dateHijri})</span>}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold">Location:</span> {contractData.location || '—'}
                </p>
              </div>

              {/* Main Content */}
              <div className="text-center mb-10 max-w-2xl mx-auto">
                <p className="text-slate-700 leading-relaxed mb-6">
                  This is to certify that the Islamic marriage contract (Nikkah) has been solemnized between:
                </p>
                
                {/* The Couple */}
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  {/* Groom */}
                  <div className="bg-teal-50 rounded-2xl p-6 border border-teal-200">
                    <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-2">The Groom</p>
                    <p className="text-xl font-serif font-bold text-slate-800">{contractData.groomName || '—'}</p>
                    <p className="text-sm text-slate-600 mt-1">Son of {contractData.groomFatherName || '—'}</p>
                  </div>
                  
                  {/* Bride */}
                  <div className="bg-rose-50 rounded-2xl p-6 border border-rose-200">
                    <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-2">The Bride</p>
                    <p className="text-xl font-serif font-bold text-slate-800">{contractData.brideName || '—'}</p>
                    <p className="text-sm text-slate-600 mt-1">Daughter of {contractData.brideFatherName || '—'}</p>
                  </div>
                </div>

                {/* Mahr */}
                <div className="bg-violet-50 rounded-2xl p-6 border border-violet-200 mb-8">
                  <p className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-2">The Mahr (Dower)</p>
                  <p className="text-2xl font-bold text-slate-800">{contractData.mahrAmount || '—'}</p>
                  <p className="text-sm text-violet-600 mt-1">
                    {contractData.mahrType === 'prompt' ? 'Prompt (Mu\'ajjal) - Payable at time of Nikkah' : 'Deferred (Mu\'wajjal) - Payable upon demand'}
                  </p>
                </div>

                <p className="text-slate-700 leading-relaxed">
                  The marriage was conducted in accordance with Islamic Shariah, with the mutual consent of both parties and in the presence of the witnesses named below.
                </p>
              </div>

              {/* Witnesses & Signatures */}
              <div className="grid md:grid-cols-2 gap-6 pt-8 border-t border-emerald-200">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Witnesses</p>
                  <div className="space-y-4">
                    <div className="border-b border-slate-200 pb-2">
                      <p className="text-sm text-slate-500">Witness 1</p>
                      <p className="font-semibold text-slate-800">{contractData.witness1Name || '—'}</p>
                    </div>
                    <div className="border-b border-slate-200 pb-2">
                      <p className="text-sm text-slate-500">Witness 2</p>
                      <p className="font-semibold text-slate-800">{contractData.witness2Name || '—'}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Officials</p>
                  <div className="space-y-4">
                    <div className="border-b border-slate-200 pb-2">
                      <p className="text-sm text-slate-500">Wali (Bride's Guardian)</p>
                      <p className="font-semibold text-slate-800">{contractData.waliName || '—'}</p>
                    </div>
                    {contractData.officiantName && (
                      <div className="border-b border-slate-200 pb-2">
                        <p className="text-sm text-slate-500">Officiant (Imam)</p>
                        <p className="font-semibold text-slate-800">{contractData.officiantName}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center mt-10 pt-8 border-t border-emerald-200">
                <p className="text-emerald-600 text-sm font-medium italic">
                  "And among His signs is that He created for you mates from among yourselves, that you may dwell in tranquility with them, and He has put love and mercy between your hearts." - Quran 30:21
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
