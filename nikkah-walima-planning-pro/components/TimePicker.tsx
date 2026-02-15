import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, ChevronDown } from './Icons';

interface TimePickerProps {
  value: string; // HH:MM (24h format)
  onChange: (value: string) => void;
  className?: string;
  hasError?: boolean;
}

function parseTime(val: string): { hour: string; minute: string } {
  const parts = val.split(':');
  return {
    hour: (parts[0] || '12').padStart(2, '0'),
    minute: (parts[1] || '00').padStart(2, '0'),
  };
}

function formatTime(hour: string, minute: string): string {
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

function clamp(val: number, min: number, max: number): number {
  if (val > max) return min;
  if (val < min) return max;
  return val;
}

/** A single number input box (hour or minute) */
const TimeBox: React.FC<{
  value: string;
  onChange: (val: string) => void;
  min: number;
  max: number;
  label: string;
  autoFocus?: boolean;
  onTab?: () => void;
}> = ({ value, onChange, min, max, label, autoFocus, onTab }) => {
  const [editText, setEditText] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value when not focused
  useEffect(() => {
    if (!isFocused) {
      setEditText(value);
    }
  }, [value, isFocused]);

  // Auto-focus the hour box when popover opens
  useEffect(() => {
    if (autoFocus) {
      // Small delay so popover renders first
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [autoFocus]);

  const commit = (text: string) => {
    const num = parseInt(text);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(String(num).padStart(2, '0'));
    } else {
      setEditText(value);
    }
  };

  const increment = (delta: number) => {
    const current = parseInt(value);
    const next = clamp(current + delta, min, max);
    onChange(String(next).padStart(2, '0'));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      increment(e.shiftKey ? 5 : 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      increment(e.shiftKey ? -5 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(editText);
      inputRef.current?.blur();
    } else if (e.key === 'Tab' && onTab) {
      // Let default tab behavior happen, but also notify parent
    }
    e.stopPropagation();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    increment(e.deltaY < 0 ? 1 : -1);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        tabIndex={-1}
        onClick={() => increment(1)}
        className="w-full flex items-center justify-center h-5 text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
      >
        <ChevronDown className="w-4 h-4 rotate-180" />
      </button>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={isFocused ? editText : value}
        onChange={(e) => {
          // Only allow digits, max 2 chars
          const val = e.target.value.replace(/\D/g, '').slice(0, 2);
          setEditText(val);
        }}
        onFocus={() => {
          setIsFocused(true);
          setEditText(value);
          // Select all on focus
          setTimeout(() => inputRef.current?.select(), 0);
        }}
        onBlur={() => {
          setIsFocused(false);
          commit(editText);
        }}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        className={`w-14 h-12 text-center text-lg font-bold rounded-lg outline-none transition-all ${
          isFocused
            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300'
            : 'bg-slate-100 dark:bg-zinc-700/60 border-2 border-transparent text-slate-800 dark:text-white hover:border-slate-300 dark:hover:border-slate-500'
        }`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => increment(-1)}
        className="w-full flex items-center justify-center h-5 text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
  );
};

/** Detect touch/mobile device (coarse pointer = finger, not mouse) */
function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  className = '',
  hasError = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [opensUp, setOpensUp] = useState(false);
  // Draft state: edits happen here, only committed on OK
  const [draftHour, setDraftHour] = useState('12');
  const [draftMinute, setDraftMinute] = useState('00');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);

  // Initialize draft from value when opening
  const openPopover = () => {
    const { hour, minute } = parseTime(value);
    setDraftHour(hour);
    setDraftMinute(minute);
    updateDirection();
    setIsOpen(true);
  };

  const handleConfirm = () => {
    onChange(formatTime(draftHour, draftMinute));
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleTriggerClick = () => {
    if (isOpen) {
      handleCancel();
      return;
    }
    // On touch devices, use the native OS time picker
    if (isTouchDevice() && nativeInputRef.current) {
      nativeInputRef.current.showPicker();
      return;
    }
    openPopover();
  };

  // Calculate drop direction (respects scrollable ancestors like modals)
  const updateDirection = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let availableBottom = window.innerHeight;
      let el: HTMLElement | null = triggerRef.current.parentElement;
      while (el) {
        const { overflowY } = getComputedStyle(el);
        if (overflowY === 'auto' || overflowY === 'scroll') {
          availableBottom = Math.min(availableBottom, el.getBoundingClientRect().bottom);
          break;
        }
        el = el.parentElement;
      }
      const spaceBelow = availableBottom - rect.bottom;
      setOpensUp(spaceBelow < 200);
    }
  }, []);

  // Close on click outside = cancel
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Keyboard - Escape to cancel
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const borderClass = hasError
    ? 'border-red-400 dark:border-red-500'
    : isOpen
      ? 'border-emerald-400 dark:border-emerald-400'
      : 'border-slate-200 dark:border-zinc-600 focus-within:border-emerald-400';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Hidden native time input for mobile OS picker */}
      <input
        ref={nativeInputRef}
        type="time"
        value={value || ''}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Trigger */}
      <div
        ref={triggerRef}
        className={`flex items-center h-8 bg-slate-50 dark:bg-zinc-900/50 border ${borderClass} rounded-lg transition-all cursor-pointer`}
        onClick={handleTriggerClick}
      >
        <Clock className="ml-2.5 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
        <span className="flex-1 text-xs font-semibold text-slate-800 dark:text-white px-2 select-none">
          {value || <span className="text-slate-400">HH:MM</span>}
        </span>
      </div>

      {/* Popover - Material style time input (desktop only) */}
      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute z-50 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-600/80 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] ${
            opensUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="px-4 pt-3 pb-2">
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Enter time</p>

            <div className="flex items-center gap-1.5 justify-center">
              <TimeBox
                value={draftHour}
                onChange={setDraftHour}
                min={0}
                max={23}
                label="Hour"
                autoFocus
              />
              <span className="text-xl font-bold text-slate-400 dark:text-slate-500 mt-[-18px]">:</span>
              <TimeBox
                value={draftMinute}
                onChange={setDraftMinute}
                min={0}
                max={59}
                label="Minute"
              />
            </div>
          </div>

          {/* Confirm / Cancel buttons */}
          <div className="flex items-center justify-center gap-2 px-4 pb-2.5">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
