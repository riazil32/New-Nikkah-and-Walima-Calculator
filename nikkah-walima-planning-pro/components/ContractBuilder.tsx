
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useScrollLock } from '../hooks/useScrollLock';
import { ContractData, MahrPaymentType } from '../types';
import { MAHR_TYPES, CURRENCIES } from '../constants';
import { DatePicker } from './DatePicker';
import { ChevronDown, X } from './Icons';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/** A4 preview: renders children at fixed 794×1123px (A4 at 96dpi) and scales to fit container.
 *  fitToContainer: when true, also considers container height for scaling (for modal use). */
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

const A4PreviewContainer = React.forwardRef<HTMLDivElement, { children: React.ReactNode; fitToContainer?: boolean }>(({ children, fitToContainer }, contentRef) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const setRefs = useCallback((el: HTMLDivElement | null) => {
    innerRef.current = el;
    if (typeof contentRef === 'function') contentRef(el);
    else if (contentRef) (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  }, [contentRef]);

  const updateScale = useCallback(() => {
    if (!outerRef.current) return;
    const containerWidth = outerRef.current.clientWidth;
    let newScale = Math.min(1, containerWidth / A4_WIDTH);

    if (fitToContainer) {
      const containerHeight = outerRef.current.clientHeight;
      if (containerHeight > 0) {
        newScale = Math.min(newScale, containerHeight / A4_HEIGHT);
      }
      setOffsetY(Math.max(0, (containerHeight - A4_HEIGHT * newScale) / 2));
    } else {
      setOffsetY(0);
    }

    setScale(newScale);
    setOffsetX(Math.max(0, (containerWidth - A4_WIDTH * newScale) / 2));
  }, [fitToContainer]);

  useEffect(() => {
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (outerRef.current) observer.observe(outerRef.current);
    return () => observer.disconnect();
  }, [updateScale]);

  return (
    <div
      ref={outerRef}
      className="overflow-hidden bg-slate-100 dark:bg-zinc-900/50"
      style={fitToContainer ? { width: '100%', height: '100%' } : { height: A4_HEIGHT * scale }}
    >
      <div
        ref={setRefs}
        className="bg-gradient-to-br from-white to-emerald-50 p-12 flex flex-col"
        style={{
          width: A4_WIDTH,
          height: A4_HEIGHT,
          transformOrigin: 'top left',
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
});

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const formTopRef = useRef<HTMLDivElement>(null);
  const certificateContentRef = useRef<HTMLDivElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  useScrollLock(showMahrSync || showResetConfirm || showPreview);
  
  // Certificate template selection
  type CertificateTemplate = 'classic' | 'gold' | 'minimal';
  const [certificateTemplate, setCertificateTemplate] = useLocalStorage<CertificateTemplate>('contract-template', 'classic');
  
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

  // Gregorian to Hijri conversion (Kuwaiti algorithm, approximate)
  const gregorianToHijri = useCallback((dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear();

    let jd = Math.floor((11 * y + 3) / 30) + 354 * y + 30 * m
      - Math.floor((m - 1) / 2) + d + 1948440 - 385;

    if (m < 2 || (m === 1 && d <= 0)) {
      // do nothing for Jan/Feb edge
    }

    // Julian Day Number
    const a = Math.floor((14 - (m + 1)) / 12);
    const yy = y + 4800 - a;
    const mm = (m + 1) + 12 * a - 3;
    jd = d + Math.floor((153 * mm + 2) / 5) + 365 * yy
      + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;

    // JD to Hijri
    const l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719)
      + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
      - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const hm = Math.floor((24 * l3) / 709);
    const hd = l3 - Math.floor((709 * hm) / 24);
    const hy = 30 * n + j - 30;

    const hijriMonths = [
      'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
      'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Shaban',
      'Ramadan', 'Shawwal', 'Dhul Qadah', 'Dhul Hijjah'
    ];

    return `${hd} ${hijriMonths[hm - 1] || ''} ${hy}`;
  }, []);

  // Update a single field
  const updateField = (field: keyof ContractData, value: string | MahrPaymentType) => {
    setContractData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-populate Hijri date when Gregorian date changes
      if (field === 'dateGregorian' && typeof value === 'string') {
        const hijri = gregorianToHijri(value);
        if (hijri) {
          updated.dateHijri = hijri;
        }
      }
      return updated;
    });
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

  // Capture certificate as PNG data URL using html-to-image.
  // Temporarily strips CSS transform & unclips ancestors so the element
  // renders at its natural 794px width for a crisp, full-size capture.
  const captureCertificatePng = useCallback(async (): Promise<string | null> => {
    const el = certificateContentRef.current;
    if (!el) return null;

    // Save & override inline styles on el + ancestors
    const saved: { el: HTMLElement; keys: Record<string, string> }[] = [];
    const save = (target: HTMLElement, overrides: Record<string, string>) => {
      const original: Record<string, string> = {};
      for (const key of Object.keys(overrides)) {
        original[key] = (target.style as any)[key] ?? '';
        (target.style as any)[key] = overrides[key];
      }
      saved.push({ el: target, keys: original });
    };

    save(el, { transform: 'none', transformOrigin: '' });
    let ancestor = el.parentElement;
    while (ancestor) {
      if (getComputedStyle(ancestor).position === 'fixed') break;
      save(ancestor, { overflow: 'visible', height: 'auto', width: `${A4_WIDTH}px`, maxWidth: 'none' });
      ancestor = ancestor.parentElement;
    }
    void el.offsetHeight; // force reflow

    try {
      return await toPng(el, {
        pixelRatio: 2,
        width: A4_WIDTH,
        height: A4_HEIGHT,
        backgroundColor: '#ffffff',
        style: { transform: 'none', transformOrigin: '' },
      });
    } finally {
      for (const { el: t, keys } of saved) {
        for (const [k, v] of Object.entries(keys)) (t.style as any)[k] = v;
      }
    }
  }, []);

  // Download pixel-perfect PDF
  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      const dataUrl = await captureCertificatePng();
      if (!dataUrl) return;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      // Load image to get dimensions
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      const imgRatio = img.height / img.width;
      const fitHeight = pdfWidth * imgRatio;
      if (fitHeight > pdfHeight) {
        const scaledWidth = pdfHeight / imgRatio;
        pdf.addImage(dataUrl, 'PNG', (pdfWidth - scaledWidth) / 2, 0, scaledWidth, pdfHeight);
      } else {
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, fitHeight);
      }
      const groomName = contractData.groomName || 'groom';
      const brideName = contractData.brideName || 'bride';
      pdf.save(`Nikkah_Certificate_${groomName}_${brideName}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Close modal on Escape
  useEffect(() => {
    if (!showPreview) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowPreview(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showPreview]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 scroll-mt-24"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)) {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-white mb-2">Nikkah Certificate Designer</h2>
        <p className="text-slate-600 dark:text-slate-400 italic">"And among His signs is that He created for you mates from among yourselves." - Quran 30:21</p>
      </div>

      {/* Disclaimer Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 mb-4">
        <div className="flex gap-2.5">
          <span className="text-amber-500 text-sm flex-shrink-0 mt-0.5">ℹ️</span>
          <div className="text-[11px] text-amber-800 dark:text-amber-200">
            <p className="font-bold mb-0.5">This is a keepsake certificate for religious & commemorative purposes.</p>
            <p className="text-amber-700 dark:text-amber-300">
              Perfect for signing during your Nikkah ceremony, framing, or as a beautiful alternative to generic Imam-provided forms. 
              For legal recognition in the UK/US, you must also complete civil registration with your local authority.
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div ref={formTopRef} className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-3 md:p-5 mb-4 border border-slate-100 dark:border-zinc-700">
        
        {/* Header Info Section */}
        <section className="mb-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">1</span>
            Certificate Details
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Date (Gregorian) <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={contractData.dateGregorian}
                onChange={(val) => updateField('dateGregorian', val)}
                placeholder="Select date"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Date (Hijri)
                <span className="text-slate-400 dark:text-slate-500 ml-1.5 font-normal normal-case">Auto-calculated · editable</span>
              </label>
              <input
                type="text"
                value={contractData.dateHijri}
                onChange={(e) => updateField('dateHijri', e.target.value)}
                placeholder="e.g., 15 Shaban 1447"
                className="w-full px-2.5 h-8 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-600 focus:border-emerald-400 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Location / Venue <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contractData.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="e.g., East London Mosque, London, UK"
                className="w-full px-2.5 h-8 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-600 focus:border-emerald-400 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>
        </section>

        {/* Couple Details Section */}
        <section className="mb-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">2</span>
            The Couple
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {/* Groom Section */}
            <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-3 border border-teal-200 dark:border-teal-800/50">
              <h4 className="text-xs font-bold text-teal-700 dark:text-teal-400 mb-2.5 flex items-center gap-1.5">
                <span className="text-sm">🤵</span> The Groom
              </h4>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contractData.groomName}
                    onChange={(e) => updateField('groomName', e.target.value)}
                    placeholder="Enter groom's full name"
                    className="w-full px-2.5 h-8 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-600 focus:border-teal-400 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Father's Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contractData.groomFatherName}
                    onChange={(e) => updateField('groomFatherName', e.target.value)}
                    placeholder="Enter groom's father's name"
                    className="w-full px-2.5 h-8 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-600 focus:border-teal-400 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
            
            {/* Bride Section */}
            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 border border-rose-200 dark:border-rose-800/50">
              <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-2.5 flex items-center gap-1.5">
                <span className="text-sm">👰</span> The Bride
              </h4>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contractData.brideName}
                    onChange={(e) => updateField('brideName', e.target.value)}
                    placeholder="Enter bride's full name"
                    className="w-full px-2.5 h-8 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-600 focus:border-rose-400 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Father's Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contractData.brideFatherName}
                    onChange={(e) => updateField('brideFatherName', e.target.value)}
                    placeholder="Enter bride's father's name"
                    className="w-full px-2.5 h-8 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-600 focus:border-rose-400 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mahr Section */}
        <section className="mb-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
            The Mahr
          </h3>
          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 border border-violet-200 dark:border-violet-800/50">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Mahr Amount / Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={contractData.mahrAmount}
                  onChange={(e) => updateField('mahrAmount', e.target.value)}
                  placeholder="e.g., £5,000 or 500 grams of silver"
                  className="w-full px-2.5 h-8 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-600 focus:border-violet-400 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Can be cash, gold, property, or services (e.g., "Teach 5 Surahs")
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Payment Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <label className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border cursor-pointer transition-all text-xs ${
                    contractData.mahrType === 'prompt' 
                      ? 'bg-violet-100 dark:bg-violet-900/40 border-violet-400 text-violet-700 dark:text-violet-300' 
                      : 'bg-white dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-600 text-slate-600 dark:text-slate-400 hover:border-violet-300'
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
                    <span className="text-[11px] whitespace-nowrap">(Mu'ajjal)</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border cursor-pointer transition-all text-xs ${
                    contractData.mahrType === 'deferred' 
                      ? 'bg-violet-100 dark:bg-violet-900/40 border-violet-400 text-violet-700 dark:text-violet-300' 
                      : 'bg-white dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-600 text-slate-600 dark:text-slate-400 hover:border-violet-300'
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
                    <span className="text-[11px] whitespace-nowrap">(Mu'wajjal)</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Prompt = paid at time of Nikkah. Deferred = paid later (upon death/divorce).
                </p>
              </div>
            </div>
            {/* Sync from Calculator button */}
            <div className="mt-3 pt-3 border-t border-violet-200 dark:border-violet-800/50">
              <button
                type="button"
                className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1.5"
                onClick={handleOpenMahrSync}
              >
                <span className="text-sm">💎</span> Sync from Mahr Calculator
              </button>
              
              {/* Mahr Sync Modal */}
              {showMahrSync && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowMahrSync(false)}>
                  <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">Select Mahr Amount</h4>
                      <button 
                        onClick={() => setShowMahrSync(false)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                      >
                        <span className="text-slate-400 text-lg">&times;</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                      Based on current silver price: {mahrCurrency.symbol}{silverPrice.toFixed(2)}/gram
                    </p>
                    <div className="space-y-2">
                      {mahrOptions.map(option => (
                        <button
                          key={option.id}
                          onClick={() => handleSyncMahr(option.formattedValue)}
                          className="w-full p-3 bg-slate-50 dark:bg-zinc-700 hover:bg-violet-50 dark:hover:bg-violet-900/30 border border-slate-200 dark:border-zinc-600 hover:border-violet-300 dark:hover:border-violet-600 rounded-lg text-left transition-all"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-white">{option.name}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">{option.grams}g silver</p>
                            </div>
                            <p className="text-xs font-bold text-violet-600 dark:text-violet-400">{option.formattedValue}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 text-center">
                      Prices synced from Mahr Calculator tab
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Witnesses Section */}
        <section className="mb-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">4</span>
            Witnesses & Officiant
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Witness 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contractData.witness1Name}
                onChange={(e) => updateField('witness1Name', e.target.value)}
                placeholder="Enter first witness name"
                className="w-full px-2.5 h-8 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-600 focus:border-emerald-400 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Witness 2 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contractData.witness2Name}
                onChange={(e) => updateField('witness2Name', e.target.value)}
                placeholder="Enter second witness name"
                className="w-full px-2.5 h-8 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-600 focus:border-emerald-400 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Wali (Bride's Guardian) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contractData.waliName}
                onChange={(e) => updateField('waliName', e.target.value)}
                placeholder="Enter Wali's name"
                className="w-full px-2.5 h-8 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-600 focus:border-emerald-400 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Usually the bride's father or male relative
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Officiant (Imam)
              </label>
              <input
                type="text"
                value={contractData.officiantName}
                onChange={(e) => updateField('officiantName', e.target.value)}
                placeholder="Enter Imam's name"
                className="w-full px-2.5 h-8 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-600 focus:border-emerald-400 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>
        </section>

        {/* Validation Errors */}
        {showValidationErrors && missingFields.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl">
            <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-1.5">Please fill in the required fields:</p>
            <ul className="text-[11px] text-red-600 dark:text-red-400 list-disc list-inside">
              {missingFields.map(({ field, label }) => (
                <li key={field}>{label}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Template Selection */}
        <section className="mb-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">5</span>
            Certificate Style
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'classic' as CertificateTemplate, name: 'Classic', desc: 'Emerald border', color: 'emerald', preview: '🕌' },
              { id: 'gold' as CertificateTemplate, name: 'Gold Ornate', desc: 'Gold & burgundy', color: 'amber', preview: '✨' },
              { id: 'minimal' as CertificateTemplate, name: 'Minimal', desc: 'Clean & modern', color: 'slate', preview: '◼️' },
            ]).map(t => (
              <button
                key={t.id}
                onClick={() => setCertificateTemplate(t.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  certificateTemplate === t.id
                    ? t.color === 'emerald' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : t.color === 'amber' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-slate-500 bg-slate-50 dark:bg-zinc-700/50'
                    : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <span className="text-lg">{t.preview}</span>
                <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{t.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{t.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex flex-row gap-2 pt-4 border-t border-slate-200 dark:border-zinc-700">
          <button
            onClick={handleGenerate}
            className="flex-1 h-10 px-4 font-bold rounded-xl shadow-sm transition-all active:scale-[0.98] text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Generate Certificate Preview
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="h-10 px-3 bg-slate-100 dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-all text-xs flex-shrink-0"
          >
            Reset
          </button>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm mb-4 border border-slate-200 dark:border-zinc-700">
        <div className="px-3 py-2.5">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Frequently Asked Questions
          </h3>
        </div>
        <div className="border-t border-slate-200 dark:border-zinc-700" />
        <div className="p-3 space-y-2">
          {/* FAQ 1 */}
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-2.5 bg-slate-50 dark:bg-zinc-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Will my Imam sign this certificate?</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0" />
            </summary>
            <div className="p-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p className="mb-1.5">
                <strong className="text-emerald-600 dark:text-emerald-400">Yes, most Imams are happy to sign a keepsake certificate!</strong>
              </p>
              <p className="mb-1.5">
                The key is to <strong>show your Imam before the ceremony</strong> to get his approval. Most Imams will happily sign a beautiful keepsake certificate alongside their official register if you ask politely in advance.
              </p>
              <p className="text-slate-500 dark:text-slate-400 italic">
                Tip: Bring a printed copy to your pre-Nikkah meeting so the Imam knows what to expect on the day.
              </p>
            </div>
          </details>

          {/* FAQ 2 */}
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-2.5 bg-slate-50 dark:bg-zinc-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Is this certificate legally binding?</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0" />
            </summary>
            <div className="p-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p className="mb-1.5">
                <strong className="text-amber-600 dark:text-amber-400">No, this is a religious/commemorative certificate.</strong>
              </p>
              <p className="mb-1.5">
                In the UK, USA, Canada, and most Western countries, you need <strong>civil registration</strong> with your local authority (council/city hall) for your marriage to be legally recognized.
              </p>
              <p>
                This certificate is for your <strong>Islamic Nikkah ceremony</strong> - perfect for signing in front of family, framing on your wall, and keeping as a beautiful memento of your blessed union.
              </p>
            </div>
          </details>

          {/* FAQ 3 */}
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-2.5 bg-slate-50 dark:bg-zinc-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Why do I need 2 witnesses and a Wali?</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0" />
            </summary>
            <div className="p-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p className="mb-1.5">
                These are <strong>Islamic requirements</strong> for a valid Nikkah:
              </p>
              <ul className="list-disc list-inside space-y-0.5 mb-1.5">
                <li><strong>2 Adult Muslim Witnesses</strong> - Required to observe and confirm the marriage contract</li>
                <li><strong>Wali (Guardian)</strong> - The bride's guardian (usually her father) who gives consent. This is required in most schools of Islamic jurisprudence.</li>
              </ul>
              <p className="text-slate-500 dark:text-slate-400 italic">
                The Imam/Officiant field is optional but recommended if someone is conducting the ceremony.
              </p>
            </div>
          </details>

          {/* FAQ 4 */}
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-2.5 bg-slate-50 dark:bg-zinc-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">What's the difference between Prompt and Deferred Mahr?</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0" />
            </summary>
            <div className="p-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p className="mb-1.5">
                <strong className="text-violet-600 dark:text-violet-400">Prompt (Mu'ajjal):</strong> Paid immediately at the time of the Nikkah ceremony. This is the most common practice.
              </p>
              <p>
                <strong className="text-violet-600 dark:text-violet-400">Deferred (Mu'wajjal):</strong> Payment is delayed - typically payable upon the wife's request, divorce, or the husband's death. Some couples split the Mahr into both portions.
              </p>
            </div>
          </details>
        </div>
      </div>

      {/* Certificate Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex flex-col" onClick={() => setShowPreview(false)}>
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 bg-white/10 backdrop-blur-md border-b border-white/10 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide whitespace-nowrap">Preview</h3>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="h-8 px-2.5 sm:px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setTimeout(() => formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                }}
                className="h-8 px-2.5 sm:px-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg text-xs transition-all whitespace-nowrap hidden sm:inline-block"
              >
                Edit Form
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="h-8 w-8 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Certificate area - pb-20 accounts for mobile nav bar */}
          <div className="flex-1 min-h-0 p-4 pb-30 md:p-6 md:pb-6" onClick={(e) => e.stopPropagation()}>
              <A4PreviewContainer ref={certificateContentRef} fitToContainer>
                {/* ===== CLASSIC TEMPLATE ===== */}
                {certificateTemplate === 'classic' && (
                <div className="border-4 border-double border-emerald-600 p-8 flex-1 flex flex-col justify-between">
                  <div className="text-center">
                    <div className="text-emerald-600 text-5xl mb-3">﷽</div>
                    <h1 className="text-4xl font-serif font-bold text-slate-800 mb-1">Nikkah Certificate</h1>
                    <p className="text-emerald-700 font-medium">شهادة النكاح</p>
                  </div>
                  <div className="text-center pb-4 border-b border-emerald-200">
                    <p className="text-slate-600 mb-1.5">
                      <span className="font-semibold">Date:</span> {contractData.dateGregorian ? new Date(contractData.dateGregorian).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                      {contractData.dateHijri && <span className="text-emerald-600 ml-2">({contractData.dateHijri})</span>}
                    </p>
                    <p className="text-slate-600"><span className="font-semibold">Location:</span> {contractData.location || '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-700 leading-relaxed mb-5">This is to certify that the Islamic marriage contract (Nikkah) has been solemnized between:</p>
                    <div className="grid grid-cols-2 gap-6 mb-5">
                      <div className="bg-teal-50 rounded-2xl p-5 border border-teal-200">
                        <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-1.5">The Groom</p>
                        <p className="text-xl font-serif font-bold text-slate-800">{contractData.groomName || '—'}</p>
                        <p className="text-sm text-slate-600 mt-1">Son of {contractData.groomFatherName || '—'}</p>
                      </div>
                      <div className="bg-rose-50 rounded-2xl p-5 border border-rose-200">
                        <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-1.5">The Bride</p>
                        <p className="text-xl font-serif font-bold text-slate-800">{contractData.brideName || '—'}</p>
                        <p className="text-sm text-slate-600 mt-1">Daughter of {contractData.brideFatherName || '—'}</p>
                      </div>
                    </div>
                    <div className="bg-violet-50 rounded-2xl p-5 border border-violet-200 mb-5">
                      <p className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-1.5">The Mahr (Dower)</p>
                      <p className="text-2xl font-bold text-slate-800">{contractData.mahrAmount || '—'}</p>
                      <p className="text-sm text-violet-600 mt-1">{contractData.mahrType === 'prompt' ? 'Prompt (Mu\'ajjal) - Payable at time of Nikkah' : 'Deferred (Mu\'wajjal) - Payable upon demand'}</p>
                    </div>
                    <p className="text-slate-700 leading-relaxed">The marriage was conducted in accordance with Islamic Shariah, with the mutual consent of both parties and in the presence of the witnesses named below.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-emerald-200">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Witnesses</p>
                      <div className="space-y-3">
                        <div className="border-b border-slate-200 pb-2"><p className="text-sm text-slate-500">Witness 1</p><p className="font-semibold text-slate-800">{contractData.witness1Name || '—'}</p></div>
                        <div className="border-b border-slate-200 pb-2"><p className="text-sm text-slate-500">Witness 2</p><p className="font-semibold text-slate-800">{contractData.witness2Name || '—'}</p></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Officials</p>
                      <div className="space-y-3">
                        <div className="border-b border-slate-200 pb-2"><p className="text-sm text-slate-500">Wali (Bride's Guardian)</p><p className="font-semibold text-slate-800">{contractData.waliName || '—'}</p></div>
                        {contractData.officiantName && (<div className="border-b border-slate-200 pb-2"><p className="text-sm text-slate-500">Officiant (Imam)</p><p className="font-semibold text-slate-800">{contractData.officiantName}</p></div>)}
                      </div>
                    </div>
                  </div>
                  <div className="text-center pt-4 border-t border-emerald-200">
                    <p className="text-emerald-600 text-sm font-medium italic">"And among His signs is that He created for you mates from among yourselves, that you may dwell in tranquility with them, and He has put love and mercy between your hearts." - Quran 30:21</p>
                  </div>
                </div>
                )}

                {/* ===== GOLD ORNATE TEMPLATE ===== */}
                {certificateTemplate === 'gold' && (
                <div className="border-4 border-double p-8 flex-1 flex flex-col justify-between" style={{ borderColor: '#b8860b', background: 'linear-gradient(135deg, #fffaf0 0%, #fef3e2 50%, #fff8f0 100%)' }}>
                  {/* Decorative corners */}
                  <div className="absolute top-[52px] left-[52px] w-12 h-12 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: '#b8860b' }} />
                  <div className="absolute top-[52px] right-[52px] w-12 h-12 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: '#b8860b' }} />
                  <div className="absolute bottom-[52px] left-[52px] w-12 h-12 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: '#b8860b' }} />
                  <div className="absolute bottom-[52px] right-[52px] w-12 h-12 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: '#b8860b' }} />
                  <div className="text-center">
                    <div className="text-5xl mb-3" style={{ color: '#8b6914' }}>﷽</div>
                    <h1 className="text-4xl font-serif font-bold mb-1" style={{ color: '#5c3a0a' }}>Nikkah Certificate</h1>
                    <p className="font-medium" style={{ color: '#8b6914' }}>شهادة النكاح</p>
                    <div className="mt-2 mx-auto w-40 h-px" style={{ background: 'linear-gradient(to right, transparent, #b8860b, transparent)' }} />
                  </div>
                  <div className="text-center pb-4" style={{ borderBottom: '1px solid #dab76a' }}>
                    <p className="mb-1.5" style={{ color: '#5c3a0a' }}>
                      <span className="font-semibold">Date:</span> {contractData.dateGregorian ? new Date(contractData.dateGregorian).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                      {contractData.dateHijri && <span className="ml-2" style={{ color: '#8b6914' }}>({contractData.dateHijri})</span>}
                    </p>
                    <p style={{ color: '#5c3a0a' }}><span className="font-semibold">Location:</span> {contractData.location || '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="leading-relaxed mb-5" style={{ color: '#5c3a0a' }}>This is to certify that the Islamic marriage contract (Nikkah) has been solemnized between:</p>
                    <div className="grid grid-cols-2 gap-6 mb-5">
                      <div className="rounded-2xl p-5 border" style={{ background: '#fdf6e3', borderColor: '#dab76a' }}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#8b6914' }}>The Groom</p>
                        <p className="text-xl font-serif font-bold" style={{ color: '#5c3a0a' }}>{contractData.groomName || '—'}</p>
                        <p className="text-sm mt-1" style={{ color: '#7a5c1e' }}>Son of {contractData.groomFatherName || '—'}</p>
                      </div>
                      <div className="rounded-2xl p-5 border" style={{ background: '#fdf6e3', borderColor: '#dab76a' }}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#8b1c3a' }}>The Bride</p>
                        <p className="text-xl font-serif font-bold" style={{ color: '#5c3a0a' }}>{contractData.brideName || '—'}</p>
                        <p className="text-sm mt-1" style={{ color: '#7a5c1e' }}>Daughter of {contractData.brideFatherName || '—'}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl p-5 border mb-5" style={{ background: '#f8f0e0', borderColor: '#dab76a' }}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#8b6914' }}>The Mahr (Dower)</p>
                      <p className="text-2xl font-bold" style={{ color: '#5c3a0a' }}>{contractData.mahrAmount || '—'}</p>
                      <p className="text-sm mt-1" style={{ color: '#8b6914' }}>{contractData.mahrType === 'prompt' ? 'Prompt (Mu\'ajjal) - Payable at time of Nikkah' : 'Deferred (Mu\'wajjal) - Payable upon demand'}</p>
                    </div>
                    <p className="leading-relaxed" style={{ color: '#5c3a0a' }}>The marriage was conducted in accordance with Islamic Shariah, with the mutual consent of both parties and in the presence of the witnesses named below.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6 pt-4" style={{ borderTop: '1px solid #dab76a' }}>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#8b6914' }}>Witnesses</p>
                      <div className="space-y-3">
                        <div className="pb-2" style={{ borderBottom: '1px solid #e8d5a0' }}><p className="text-sm" style={{ color: '#8b6914' }}>Witness 1</p><p className="font-semibold" style={{ color: '#5c3a0a' }}>{contractData.witness1Name || '—'}</p></div>
                        <div className="pb-2" style={{ borderBottom: '1px solid #e8d5a0' }}><p className="text-sm" style={{ color: '#8b6914' }}>Witness 2</p><p className="font-semibold" style={{ color: '#5c3a0a' }}>{contractData.witness2Name || '—'}</p></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#8b6914' }}>Officials</p>
                      <div className="space-y-3">
                        <div className="pb-2" style={{ borderBottom: '1px solid #e8d5a0' }}><p className="text-sm" style={{ color: '#8b6914' }}>Wali (Bride's Guardian)</p><p className="font-semibold" style={{ color: '#5c3a0a' }}>{contractData.waliName || '—'}</p></div>
                        {contractData.officiantName && (<div className="pb-2" style={{ borderBottom: '1px solid #e8d5a0' }}><p className="text-sm" style={{ color: '#8b6914' }}>Officiant (Imam)</p><p className="font-semibold" style={{ color: '#5c3a0a' }}>{contractData.officiantName}</p></div>)}
                      </div>
                    </div>
                  </div>
                  <div className="text-center pt-4" style={{ borderTop: '1px solid #dab76a' }}>
                    <p className="text-sm font-medium italic" style={{ color: '#8b6914' }}>"And among His signs is that He created for you mates from among yourselves, that you may dwell in tranquility with them, and He has put love and mercy between your hearts." - Quran 30:21</p>
                  </div>
                </div>
                )}

                {/* ===== MINIMAL MODERN TEMPLATE ===== */}
                {certificateTemplate === 'minimal' && (
                <div className="p-10 flex-1 flex flex-col justify-between" style={{ background: '#ffffff' }}>
                  <div className="text-center">
                    <p className="text-3xl mb-4 text-slate-400">﷽</p>
                    <h1 className="text-5xl font-serif font-bold text-slate-900 tracking-tight mb-2">Nikkah</h1>
                    <p className="text-lg font-light text-slate-400 tracking-[0.3em] uppercase">Certificate</p>
                    <div className="mt-4 mx-auto w-16 h-0.5 bg-slate-900" />
                  </div>
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-500">
                      {contractData.dateGregorian ? new Date(contractData.dateGregorian).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                      {contractData.dateHijri && <span className="mx-2">·</span>}
                      {contractData.dateHijri && <span>{contractData.dateHijri}</span>}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">{contractData.location || '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">This is to certify that the Islamic marriage contract has been solemnized between:</p>
                    <div className="grid grid-cols-2 gap-10 mb-8">
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">The Groom</p>
                        <p className="text-2xl font-serif font-bold text-slate-900">{contractData.groomName || '—'}</p>
                        <p className="text-sm text-slate-500 mt-1">Son of {contractData.groomFatherName || '—'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">The Bride</p>
                        <p className="text-2xl font-serif font-bold text-slate-900">{contractData.brideName || '—'}</p>
                        <p className="text-sm text-slate-500 mt-1">Daughter of {contractData.brideFatherName || '—'}</p>
                      </div>
                    </div>
                    <div className="mx-auto w-8 h-px bg-slate-300 mb-6" />
                    <div className="mb-6">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Mahr</p>
                      <p className="text-2xl font-bold text-slate-900">{contractData.mahrAmount || '—'}</p>
                      <p className="text-xs text-slate-500 mt-1">{contractData.mahrType === 'prompt' ? 'Prompt (Mu\'ajjal)' : 'Deferred (Mu\'wajjal)'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-10 pt-6" style={{ borderTop: '1px solid #e5e7eb' }}>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Witnesses</p>
                      <div className="space-y-4">
                        <div><p className="text-xs text-slate-400">Witness 1</p><p className="font-semibold text-slate-900 text-sm">{contractData.witness1Name || '—'}</p><div className="mt-2 w-full h-px bg-slate-200" /></div>
                        <div><p className="text-xs text-slate-400">Witness 2</p><p className="font-semibold text-slate-900 text-sm">{contractData.witness2Name || '—'}</p><div className="mt-2 w-full h-px bg-slate-200" /></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Officials</p>
                      <div className="space-y-4">
                        <div><p className="text-xs text-slate-400">Wali (Bride's Guardian)</p><p className="font-semibold text-slate-900 text-sm">{contractData.waliName || '—'}</p><div className="mt-2 w-full h-px bg-slate-200" /></div>
                        {contractData.officiantName && (<div><p className="text-xs text-slate-400">Officiant (Imam)</p><p className="font-semibold text-slate-900 text-sm">{contractData.officiantName}</p><div className="mt-2 w-full h-px bg-slate-200" /></div>)}
                      </div>
                    </div>
                  </div>
                  <div className="text-center pt-6">
                    <p className="text-xs text-slate-400 font-light italic max-w-sm mx-auto leading-relaxed">"And among His signs is that He created for you mates from among yourselves, that you may dwell in tranquility with them." — Quran 30:21</p>
                  </div>
                </div>
                )}
              </A4PreviewContainer>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowResetConfirm(false)}>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">Reset Form?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              Are you sure? This will clear all certificate fields and cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleReset();
                  setShowResetConfirm(false);
                }}
                className="flex-1 h-9 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 h-9 bg-slate-100 dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
