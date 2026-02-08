import React, { useState } from 'react';
import { WeddingEventConfig } from '../types';
import { X, Check } from './Icons';
import { CustomSelect } from './CustomSelect';

// Categorized event presets (shared between GuestManager and TimelinePlanner)
export const ALL_EVENT_PRESETS: { category: string; events: Omit<WeddingEventConfig, 'enabled'>[] }[] = [
  { category: 'Core', events: [
    { id: 'nikkah', name: 'Nikkah', icon: '💍' },
    { id: 'walima', name: 'Walima', icon: '🍽️' },
  ]},
  { category: 'South Asian', events: [
    { id: 'mehndi', name: 'Mehndi', icon: '🌸' },
    { id: 'dholki', name: 'Dholki', icon: '🪘' },
    { id: 'baraat', name: 'Baraat', icon: '🐴' },
  ]},
  { category: 'Arab', events: [
    { id: 'katb-kitab', name: 'Katb Kitab', icon: '📖' },
    { id: 'henna', name: 'Henna Night', icon: '🤲' },
    { id: 'zaffe', name: 'Zaffe', icon: '🎵' },
  ]},
  { category: 'Western / Civil', events: [
    { id: 'civil', name: 'Civil Registry', icon: '📝' },
    { id: 'reception', name: 'Reception', icon: '🥂' },
    { id: 'rehearsal', name: 'Rehearsal Dinner', icon: '🍷' },
  ]},
];

const CUSTOM_ICONS = ['🎉', '🎊', '💐', '🎶', '🎭', '🌙', '☪️', '🕌', '🎈', '🍰', '💒', '🚗'];

interface EventSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: WeddingEventConfig[];
  onToggleEvent: (eventId: string) => void;
  onAddCustomEvent: (name: string, icon: string) => void;
  onDeleteCustomEvent: (eventId: string) => void;
  showSegregation?: boolean;
  segregationMode?: boolean;
  onToggleSegregation?: () => void;
}

export const EventSettingsModal: React.FC<EventSettingsModalProps> = ({
  isOpen,
  onClose,
  events,
  onToggleEvent,
  onAddCustomEvent,
  onDeleteCustomEvent,
  showSegregation = false,
  segregationMode = false,
  onToggleSegregation,
}) => {
  const [newCustomEventName, setNewCustomEventName] = useState('');
  const [newCustomEventIcon, setNewCustomEventIcon] = useState('🎉');

  const handleAdd = () => {
    const name = newCustomEventName.trim();
    if (!name) return;
    onAddCustomEvent(name, newCustomEventIcon);
    setNewCustomEventName('');
    setNewCustomEventIcon('🎉');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 max-w-md w-full shadow-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Settings</h3>
          <button onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {/* Segregation Mode - only shown from Guest Manager */}
          {showSegregation && onToggleSegregation && (
            <div className="mb-4">
              <label className="flex items-center justify-between cursor-pointer p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">Segregation Mode</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">View male/female counts separately</p>
                </div>
                <div className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ml-3 ${
                  segregationMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-500'
                }`}>
                  <input type="checkbox" checked={segregationMode} onChange={onToggleSegregation} className="sr-only" />
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    segregationMode ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </div>
              </label>
            </div>
          )}

          {/* Event Configuration */}
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Events to track</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
              Toggle events for guest invitations
            </p>

            {ALL_EVENT_PRESETS.map(category => {
              const categoryEvents = events.filter(de => category.events.some(pe => pe.id === de.id));
              if (categoryEvents.length === 0) return null;
              return (
                <div key={category.category} className="mb-3">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">{category.category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {categoryEvents.map(event => (
                      <button key={event.id} onClick={() => onToggleEvent(event.id)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                          event.enabled
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-transparent'
                        }`}>
                        <span>{event.icon}</span>
                        <span>{event.name}</span>
                        {event.enabled && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Custom Events */}
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2.5">Custom Events</p>
              <div className="flex flex-wrap gap-x-3 gap-y-3">
                {events.filter(e => e.isCustom).map(event => (
                  <div key={event.id} className="relative group/pill">
                    <button onClick={() => onToggleEvent(event.id)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                        event.enabled
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-transparent'
                      }`}>
                      <span>{event.icon}</span>
                      <span>{event.name}</span>
                      {event.enabled && <Check className="w-3 h-3" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteCustomEvent(event.id); }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center sm:opacity-0 sm:group-hover/pill:opacity-100 transition-opacity shadow-sm"
                      title="Delete custom event">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
              {/* Add custom event */}
              <div className="flex items-center gap-1.5 mt-2.5">
                <CustomSelect
                  value={newCustomEventIcon}
                  onChange={(val) => setNewCustomEventIcon(val)}
                  options={CUSTOM_ICONS.map(icon => ({ value: icon, label: icon }))}
                  className="w-12 flex-shrink-0"
                  triggerClassName="!h-8 !px-1 !pr-5 !text-sm text-center !rounded-md"
                />
                <input type="text" value={newCustomEventName} onChange={(e) => setNewCustomEventName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                  placeholder="Event name..."
                  className="flex-1 h-8 px-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-md text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-400"
                />
                <button onClick={handleAdd} disabled={!newCustomEventName.trim()}
                  className="h-8 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-semibold text-xs rounded-md transition-colors disabled:cursor-not-allowed">
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <button onClick={onClose}
          className="w-full mt-3 py-2.5 bg-slate-800 dark:bg-white text-white dark:text-slate-800 font-bold text-sm rounded-xl hover:opacity-90 transition-opacity flex-shrink-0">
          Done
        </button>
      </div>
    </div>
  );
};
