import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from './Icons';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toYYYYMMDD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Pick a date',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [opensUp, setOpensUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Parse value to determine initial view month
  const parsedDate = value ? new Date(value + 'T00:00:00') : null;
  const today = new Date();

  const [viewYear, setViewYear] = useState(parsedDate?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate?.getMonth() ?? today.getMonth());

  // Sync view to value when it changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Calculate drop direction
  const updateDirection = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpensUp(spaceBelow < 320);
    }
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close on scroll outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: Event) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [isOpen]);

  // Keyboard
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleOpen = () => {
    updateDirection();
    setIsOpen(!isOpen);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleDayClick = (day: number) => {
    onChange(toYYYYMMDD(viewYear, viewMonth, day));
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayStr = toYYYYMMDD(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`w-full h-8 pl-8 pr-7 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-left text-xs font-semibold text-slate-800 dark:text-white truncate transition-all outline-none focus:border-emerald-400 ${isOpen ? 'border-emerald-400 dark:border-emerald-400' : ''}`}
      >
        {value ? (
          <span>{formatDate(value)}</span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
      </button>
      <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      <ChevronRight
        className={`absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none transition-transform duration-200 rotate-90 ${isOpen ? 'rotate-[270deg]' : ''}`}
      />

      {isOpen && (
        <div
          className={`absolute z-50 w-64 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-600/80 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] p-3 ${
            opensUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
            <span className="text-xs font-bold text-slate-800 dark:text-white">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(day => (
              <div key={day} className="text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} />;
              }
              const dateStr = toYYYYMMDD(viewYear, viewMonth, day);
              const isSelected = dateStr === value;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`w-full aspect-square flex items-center justify-center text-xs rounded-md transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-bold'
                      : isToday
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white font-semibold ring-1 ring-slate-300 dark:ring-slate-500'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                onChange(toYYYYMMDD(t.getFullYear(), t.getMonth(), t.getDate()));
                setViewYear(t.getFullYear());
                setViewMonth(t.getMonth());
                setIsOpen(false);
              }}
              className="w-full text-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 py-1 transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
