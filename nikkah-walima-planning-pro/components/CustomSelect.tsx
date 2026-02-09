import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from './Icons';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  className = '',
  triggerClassName = '',
  placeholder = 'Select...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [opensUp, setOpensUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find(o => String(o.value) === String(value));

  // Calculate drop direction on open (respects scrollable ancestors like modals)
  const updateDirection = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Find closest scrollable ancestor to determine actual available space
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
      setOpensUp(spaceBelow < 240);
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

  // Close on scroll outside the dropdown (prevents misaligned dropdown)
  // Delayed attachment avoids the initial scrollIntoView (selected item) from triggering close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: Event) => {
      // Don't close if scrolling inside the dropdown list itself
      if (listRef.current && listRef.current.contains(e.target as Node)) return;
      // Don't close if scrolling inside the select container itself
      if (containerRef.current && containerRef.current.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    const timeout = setTimeout(() => {
      window.addEventListener('scroll', handler, true);
    }, 100);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('scroll', handler, true);
    };
  }, [isOpen]);

  // Reset highlight & calculate direction when opening
  useEffect(() => {
    if (isOpen) {
      updateDirection();
      const idx = options.findIndex(o => String(o.value) === String(value));
      setHighlightedIndex(idx >= 0 ? idx : 0);
      // Scroll selected item into view
      requestAnimationFrame(() => {
        if (listRef.current && idx >= 0) {
          const items = listRef.current.children;
          if (items[idx]) {
            (items[idx] as HTMLElement).scrollIntoView({ block: 'nearest' });
          }
        }
      });
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightedIndex]) {
        (items[highlightedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // Prevent parent enter-to-blur handlers
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          onChange(options[highlightedIndex].value);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => Math.min(prev + 1, options.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => Math.max(prev - 1, 0));
        }
        break;
      case 'Tab':
        if (isOpen) setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full h-8 px-2.5 pr-7 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-left text-xs font-semibold text-slate-800 dark:text-white truncate transition-all outline-none focus:border-emerald-400 ${isOpen ? 'border-emerald-400 dark:border-emerald-400' : ''} ${triggerClassName}`}
      >
        {selectedOption?.label || placeholder}
      </button>
      <ChevronDown
        className={`absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      />

      {isOpen && (
        <div
          ref={listRef}
          className={`absolute z-50 w-full max-h-56 overflow-auto rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-600/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] py-1 custom-scrollbar ${
            opensUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          role="listbox"
          onKeyDown={handleKeyDown}
          onWheel={(e) => {
            // Contain wheel events inside the dropdown to prevent page scroll closing it
            const el = listRef.current;
            if (!el) return;
            const { scrollTop, scrollHeight, clientHeight } = el;
            const atTop = scrollTop === 0 && e.deltaY < 0;
            const atBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;
            if (atTop || atBottom) {
              e.preventDefault();
            }
          }}
        >
          {options.map((option, index) => {
            const isSelected = String(option.value) === String(value);
            const isHighlighted = highlightedIndex === index;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full text-left px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold'
                    : isHighlighted
                      ? 'bg-slate-100 dark:bg-slate-700/70 text-slate-800 dark:text-white font-medium'
                      : 'text-slate-700 dark:text-slate-300 font-medium'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
