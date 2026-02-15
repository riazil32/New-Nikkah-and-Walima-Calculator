import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from './Icons';

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
}

export const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  // Get display label for current value
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || '';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    } else if (e.key === 'Enter' && filteredOptions.length > 0) {
      onChange(filteredOptions[0].value);
      setIsOpen(false);
      setSearch('');
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-8 px-2.5 pr-7 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-600 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white text-left truncate ${isOpen ? 'border-emerald-400 dark:border-emerald-400' : 'focus:border-emerald-400'}`}
      >
        <span className={displayLabel ? '' : 'text-slate-400'}>
          {displayLabel || placeholder}
        </span>
      </button>
      <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-600/80 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] overflow-hidden">
          {/* Search Input */}
          <div className="p-1.5 border-b border-slate-200 dark:border-zinc-700">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full px-2.5 h-7 bg-slate-50 dark:bg-zinc-700 rounded-md text-xs outline-none focus:ring-1 focus:ring-emerald-400 text-slate-800 dark:text-white placeholder:text-slate-400"
            />
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-2.5 py-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    value === option.value
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700/70'
                  }`}
                >
                  <span>{option.label}</span>
                  {value === option.value && (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
