import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { TimelineData, WeddingEvent, PrayerTime, TimelineItem } from '../types';
import { Clock, Plus, Trash, Edit, AlertTriangle, MapPin, RefreshCw, X, Info } from './Icons';
import { Combobox } from './Combobox';
import { COUNTRIES, CALCULATION_METHODS, ASR_SCHOOLS, getAutoCalculationMethod, getAutoAsrSchool } from '../constants';

// Default timeline data
const getDefaultTimelineData = (): TimelineData => ({
  date: '',
  city: '',
  country: '',
  method: 3, // Muslim World League (global default)
  school: 0, // Standard (Shafi/Maliki/Hanbali)
  events: []
});

// Common event presets for quick adding
const EVENT_PRESETS = [
  { name: 'Guests Arrive', icon: '🚗', duration: 30 },
  { name: 'Entrance (Baraat/Zaffe)', icon: '🎉', duration: 30 },
  { name: 'Nikkah Ceremony', icon: '💍', duration: 30 },
  { name: 'Photography', icon: '📸', duration: 60 },
  { name: 'Food Service', icon: '🍽️', duration: 90 },
  { name: 'Cake Cutting', icon: '🎂', duration: 15 },
  { name: 'Speeches', icon: '🎤', duration: 30 },
  { name: 'Entertainment', icon: '🎵', duration: 60 },
  { name: 'Prayer Break', icon: '🤲', duration: 15 },
  { name: 'Guest Departure', icon: '👋', duration: 30 },
];

// Prayer duration buffer in minutes (for conflict detection)
const PRAYER_BUFFER_MINUTES = 15;
const JUMMAH_BUFFER_MINUTES = 45; // Jummah includes khutbah + prayer

// Get prayer buffer based on prayer name
const getPrayerBuffer = (prayerName: string): number => {
  return prayerName === 'Jummah' ? JUMMAH_BUFFER_MINUTES : PRAYER_BUFFER_MINUTES;
};

// Convert HH:MM to minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Convert minutes from midnight to HH:MM
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Format time for display (12h format)
const formatTimeDisplay = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Check if an event crosses midnight (end time is "next day")
const isCrossMidnight = (startTime: string, endTime: string): boolean => {
  return timeToMinutes(endTime) < timeToMinutes(startTime);
};

// Check if an event is prayer-related (should show green message instead of red warning)
const isPrayerRelatedEvent = (eventName: string): boolean => {
  const lowerName = eventName.toLowerCase();
  return lowerName.includes('prayer') || lowerName.includes('salah') || lowerName.includes('namaz');
};

// Get effective end time in minutes (accounting for cross-midnight)
const getEffectiveEndMinutes = (startTime: string, endTime: string): number => {
  const endMinutes = timeToMinutes(endTime);
  if (isCrossMidnight(startTime, endTime)) {
    return endMinutes + 24 * 60; // Add 24 hours for next day
  }
  return endMinutes;
};

// Check if an event conflicts with ANY prayer times (returns ALL conflicts)
const checkConflicts = (event: WeddingEvent, prayerTimes: PrayerTime[]): PrayerTime[] => {
  const eventStart = timeToMinutes(event.startTime);
  const eventEnd = getEffectiveEndMinutes(event.startTime, event.endTime);
  const conflicts: PrayerTime[] = [];
  
  for (const prayer of prayerTimes) {
    const prayerStart = timeToMinutes(prayer.time);
    const prayerEnd = prayerStart + getPrayerBuffer(prayer.name);
    
    // Check if event overlaps with prayer time window
    // For cross-midnight events, we need to check both today's and conceptually tomorrow's prayers
    if (eventStart < prayerEnd && eventEnd > prayerStart) {
      conflicts.push(prayer);
    }
  }
  
  return conflicts;
};

// Generate a unique ID
const generateId = (): string => Math.random().toString(36).substring(2, 9);

export const TimelinePlanner: React.FC = () => {
  // Persisted data
  const [timelineData, setTimelineData] = useLocalStorage<TimelineData>(
    'timeline-data',
    getDefaultTimelineData()
  );
  
  // Ref to always hold the latest timeline data (updated synchronously)
  const timelineDataRef = useRef(timelineData);
  
  // Prayer times from API
  const { prayerTimes, hijriDate, locationInfo, loading, error, fetchPrayerTimes } = usePrayerTimes();
  
  // UI state
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WeddingEvent | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Form state for new/edit event
  const [eventForm, setEventForm] = useState({
    name: '',
    startTime: '12:00',
    endTime: '13:00',
    description: '',
    icon: ''
  });
  
  // Form validation state
  const [formTouched, setFormTouched] = useState(false);

  // Fetch prayer times - uses ref to ensure latest values (avoids React state timing issues)
  const handleFetchPrayerTimes = () => {
    const data = timelineDataRef.current;
    
    if (data.date && data.city && data.country) {
      fetchPrayerTimes(
        data.city,
        data.country,
        data.date,
        data.method,
        data.school
      );
    }
  };

  // Handle country change with auto-detection of method and school
  const handleCountryChange = (country: string) => {
    const recommendedMethod = getAutoCalculationMethod(country);
    const recommendedSchool = getAutoAsrSchool(country);
    
    // Update all three values at once
    const newData = { 
      ...timelineDataRef.current, 
      country, 
      method: recommendedMethod, 
      school: recommendedSchool 
    };
    timelineDataRef.current = newData;
    setTimelineData(newData);
  };

  // Auto-fetch when data is loaded and valid
  useEffect(() => {
    if (timelineData.date && timelineData.city && timelineData.country && prayerTimes.length === 0) {
      handleFetchPrayerTimes();
    }
  }, []);

  // Update timeline data field - also updates ref synchronously for immediate access
  const updateField = (field: keyof TimelineData, value: string | number) => {
    const newData = { ...timelineDataRef.current, [field]: value };
    timelineDataRef.current = newData; // Synchronous update
    setTimelineData(newData);
  };

  // Merge and sort all timeline items chronologically
  const sortedTimeline = useMemo((): (TimelineItem & { conflicts?: PrayerTime[]; crossesMidnight?: boolean; isPrayerEvent?: boolean })[] => {
    const items: (TimelineItem & { conflicts?: PrayerTime[]; crossesMidnight?: boolean; isPrayerEvent?: boolean })[] = [];
    
    // Add prayer times
    prayerTimes.forEach(prayer => {
      items.push({ ...prayer });
    });
    
    // Add events with conflict info
    timelineData.events.forEach(event => {
      const conflicts = checkConflicts(event, prayerTimes);
      const crossesMidnight = isCrossMidnight(event.startTime, event.endTime);
      const isPrayerEvent = isPrayerRelatedEvent(event.name);
      items.push({ 
        ...event, 
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        crossesMidnight,
        isPrayerEvent
      });
    });
    
    // Sort by time (cross-midnight events sort by start time)
    items.sort((a, b) => {
      const timeA = a.type === 'fixed' ? (a as PrayerTime).time : (a as WeddingEvent).startTime;
      const timeB = b.type === 'fixed' ? (b as PrayerTime).time : (b as WeddingEvent).startTime;
      return timeToMinutes(timeA) - timeToMinutes(timeB);
    });
    
    return items;
  }, [prayerTimes, timelineData.events]);

  // Add/Update event
  const handleSaveEvent = () => {
    setFormTouched(true);
    if (!eventForm.name || !eventForm.startTime || !eventForm.endTime) return;
    
    const newEvent: WeddingEvent = {
      id: editingEvent?.id || generateId(),
      name: eventForm.name,
      startTime: eventForm.startTime,
      endTime: eventForm.endTime,
      description: eventForm.description,
      icon: eventForm.icon || undefined,
      type: 'custom'
    };
    
    setTimelineData(prev => {
      if (editingEvent) {
        return {
          ...prev,
          events: prev.events.map(e => e.id === editingEvent.id ? newEvent : e)
        };
      }
      return {
        ...prev,
        events: [...prev.events, newEvent]
      };
    });
    
    closeEventModal();
  };

  // Delete event
  const handleDeleteEvent = (id: string) => {
    setTimelineData(prev => ({
      ...prev,
      events: prev.events.filter(e => e.id !== id)
    }));
  };

  // Open modal for editing
  const handleEditEvent = (event: WeddingEvent) => {
    setEditingEvent(event);
    setEventForm({
      name: event.name,
      startTime: event.startTime,
      endTime: event.endTime,
      description: event.description || '',
      icon: event.icon || ''
    });
    setFormTouched(false);
    setShowEventModal(true);
  };

  // Quick add from preset (used from Quick Add panel)
  const handleQuickAdd = (preset: typeof EVENT_PRESETS[0]) => {
    const startMinutes = 12 * 60; // Default to noon
    const endMinutes = startMinutes + preset.duration;
    
    setEventForm({
      name: preset.name,
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(endMinutes),
      description: '',
      icon: preset.icon
    });
    setFormTouched(false);
    setShowPresets(false);
    setShowEventModal(true);
  };

  // Quick add preset directly in modal
  const applyPresetToForm = (preset: typeof EVENT_PRESETS[0]) => {
    const startMinutes = timeToMinutes(eventForm.startTime);
    const endMinutes = startMinutes + preset.duration;
    
    setEventForm(prev => ({
      ...prev,
      name: preset.name,
      endTime: minutesToTime(endMinutes),
      icon: preset.icon
    }));
  };

  // Close modal and reset
  const closeEventModal = () => {
    setShowEventModal(false);
    setEditingEvent(null);
    setFormTouched(false);
    setEventForm({ name: '', startTime: '12:00', endTime: '13:00', description: '', icon: '' });
  };

  // Open modal with pre-filled start time (for Smart Gap buttons)
  // Optional nextEventTime to calculate a smart end time (5 min before next event)
  const openModalWithStartTime = (startTime: string, nextEventTime?: string) => {
    const startMinutes = timeToMinutes(startTime);
    let endMinutes = startMinutes + 30; // Default 30 min duration
    
    // If there's a next event, end 5 min before it (but at least 15 min duration)
    if (nextEventTime) {
      const nextMinutes = timeToMinutes(nextEventTime);
      const smartEnd = nextMinutes - 5;
      if (smartEnd - startMinutes >= 15) {
        endMinutes = smartEnd;
      }
    }
    
    setEventForm({
      name: '',
      startTime,
      endTime: minutesToTime(endMinutes),
      description: '',
      icon: ''
    });
    setFormTouched(false);
    setShowEventModal(true);
  };

  // Get the effective end time of a timeline item in minutes
  const getItemEndMinutes = (item: TimelineItem): number => {
    if (item.type === 'fixed') {
      const prayer = item as PrayerTime;
      return timeToMinutes(prayer.time) + getPrayerBuffer(prayer.name);
    }
    return getEffectiveEndMinutes((item as WeddingEvent).startTime, (item as WeddingEvent).endTime);
  };

  // Get the start time of a timeline item in minutes
  const getItemStartMinutes = (item: TimelineItem): number => {
    if (item.type === 'fixed') {
      return timeToMinutes((item as PrayerTime).time);
    }
    return timeToMinutes((item as WeddingEvent).startTime);
  };

  // Calculate the smart start time for a new event after a given index
  // This finds the MAX end time among all items up to (and including) the current index
  // to handle overlapping events (e.g., Prayer Break covering a prayer time)
  const getSmartStartTime = (currentIndex: number): string => {
    let maxEndMinutes = 0;
    
    // Check all items up to and including the current index
    for (let i = 0; i <= currentIndex; i++) {
      const item = sortedTimeline[i];
      const endMinutes = getItemEndMinutes(item);
      maxEndMinutes = Math.max(maxEndMinutes, endMinutes);
    }
    
    return minutesToTime(maxEndMinutes);
  };

  // Calculate gaps between timeline items for Smart Gap buttons
  const getGapInfo = (currentIndex: number, nextItem: TimelineItem | undefined): { gap: number; startTime: string } | null => {
    if (!nextItem) return null;
    
    // Get the smart start time (MAX of all end times up to this point)
    const smartStartTime = getSmartStartTime(currentIndex);
    const smartStartMinutes = timeToMinutes(smartStartTime);
    
    const nextStartMinutes = getItemStartMinutes(nextItem);
    
    const gap = nextStartMinutes - smartStartMinutes;
    return gap >= 15 ? { gap, startTime: smartStartTime } : null;
  };

  // Check if we have required data
  const hasLocation = timelineData.city && timelineData.country && timelineData.date;
  const hasPrayerTimes = prayerTimes.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-white mb-2">
          Prayer-Aware Timeline
        </h2>
        <p className="text-slate-600 dark:text-slate-400 italic">
          Schedule your wedding day around the sacred times of Salah
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 mb-8">
        <div className="flex gap-3">
          <span className="text-amber-500 text-xl flex-shrink-0">☪️</span>
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold mb-1">Prayer times are sacred anchors</p>
            <p className="text-amber-700 dark:text-amber-300">
              Plan your events around Salah times. We'll warn you if any event clashes with prayer time.
            </p>
          </div>
        </div>
      </div>

      {/* Location & Date Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-6 md:p-8 mb-8 border border-slate-100 dark:border-slate-700">
        
        {/* Collapsed Summary Bar - shown when prayer times loaded and form collapsed */}
        {hasPrayerTimes && !isFormExpanded ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-slate-800 dark:text-white">
                  {timelineData.date && new Date(timelineData.date).toLocaleDateString('en-GB', { 
                    day: 'numeric', month: 'short', year: 'numeric' 
                  })}
                  {' • '}{timelineData.city}, {timelineData.country}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {hijriDate} • {timelineData.school === 1 ? 'Hanafi' : 'Standard'} Asr
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsFormExpanded(true)}
              className="px-4 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
            >
              Edit Details
            </button>
          </div>
        ) : (
          <>
            {/* Expanded Form Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Wedding Details
              </h3>
              {hasPrayerTimes && (
                <button
                  onClick={() => setIsFormExpanded(false)}
                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Collapse ↑
                </button>
              )}
            </div>
            
            {/* Main Inputs: Date, City, Country */}
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Wedding Date
                </label>
                <input
                  type="date"
                  value={timelineData.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-transparent focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-600 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={timelineData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="e.g., London"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-transparent focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-600 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Country
                </label>
                <Combobox
                  options={COUNTRIES}
                  value={timelineData.country}
                  onChange={handleCountryChange}
                  placeholder="Select country..."
                  searchPlaceholder="Search countries..."
                  emptyMessage="No country found."
                />
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="mb-4 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              <span>{showAdvanced ? '▼' : '▶'}</span>
              Advanced Calculation Settings
            </button>

            {/* Advanced Settings (Collapsible) */}
            {showAdvanced && (
              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Calculation Method
                    </label>
                    <select
                      value={timelineData.method}
                      onChange={(e) => updateField('method', Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-600 border-2 border-transparent focus:border-emerald-400 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white"
                    >
                      {CALCULATION_METHODS.map(method => (
                        <option key={method.id} value={method.id}>
                          {method.shortName} - {method.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Asr Calculation (Madhab)
                    </label>
                    <select
                      value={timelineData.school}
                      onChange={(e) => updateField('school', Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-600 border-2 border-transparent focus:border-emerald-400 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white"
                    >
                      {ASR_SCHOOLS.map(school => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <strong>Hanafi Asr</strong> is typically 45-90 minutes later than Standard (Shafi'i/Maliki/Hanbali). 
                  These are auto-detected based on your country but can be changed if your local mosque follows a different school.
                </p>
              </div>
            )}

            <button
              onClick={() => {
                handleFetchPrayerTimes();
                // Auto-collapse form after fetching (with small delay to show loading)
                setTimeout(() => setIsFormExpanded(false), 500);
              }}
              disabled={!hasLocation || loading}
              className={`w-full py-3 px-6 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                hasLocation && !loading
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Fetching Prayer Times...' : 'Get Prayer Times'}
            </button>

            {/* Helper note about city lookup */}
            <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                City can be any city or village name. If not found exactly, prayer times will default to a nearby major city.
              </p>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Hijri Date Display (no coordinates - they're unreliable) */}
            {hijriDate && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  ☪️ {hijriDate}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Timeline Section */}
      {hasPrayerTimes && (
        <>
          {/* Add Event Button */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setShowEventModal(true)}
              className="flex-1 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Event
            </button>
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="py-3 px-6 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all"
            >
              Quick Add
            </button>
          </div>

          {/* Presets Dropdown */}
          {showPresets && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 mb-6">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">Common Wedding Events:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {EVENT_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => handleQuickAdd(preset)}
                    className="p-3 bg-slate-50 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl text-left transition-all border border-transparent hover:border-emerald-300 dark:hover:border-emerald-700"
                  >
                    <span className="text-lg">{preset.icon}</span>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">{preset.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">{preset.duration} min</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-6 md:p-8 border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Your Wedding Timeline
            </h3>

            {sortedTimeline.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <p>Add events to build your timeline</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 md:left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />

                {/* Timeline items */}
                <div className="space-y-4">
                  {sortedTimeline.map((item, index) => {
                    const nextItem = sortedTimeline[index + 1];
                    // Use smart gap calculation that respects overlapping events
                    const gapInfo = getGapInfo(index, nextItem);
                    const nextEventStartTime = nextItem
                      ? (nextItem.type === 'fixed' ? (nextItem as PrayerTime).time : (nextItem as WeddingEvent).startTime)
                      : undefined;
                    
                    return (
                    <React.Fragment key={item.type === 'fixed' ? `prayer-${item.name}` : (item as WeddingEvent).id}>
                    <div className="relative pl-12 md:pl-16">
                      {/* Timeline dot */}
                      <div className={`absolute left-2 md:left-4 w-4 h-4 rounded-full border-2 ${
                        item.type === 'fixed'
                          ? 'bg-amber-100 border-amber-500'
                          : (item as any).conflicts?.length > 0
                            ? (item as any).isPrayerEvent
                              ? 'bg-emerald-100 border-emerald-500' // Green dot for prayer events
                              : 'bg-red-100 border-red-500'
                            : 'bg-emerald-100 border-emerald-500'
                      }`} />

                      {/* Card */}
                      {item.type === 'fixed' ? (
                        // Prayer Time Card
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">☪️</span>
                              <div>
                                <p className="font-bold text-amber-800 dark:text-amber-300">{item.name}</p>
                                <p className="text-sm text-amber-600 dark:text-amber-400">Prayer Time</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                                {formatTimeDisplay(item.time)}
                              </p>
                              <p className="text-xs text-amber-500 dark:text-amber-500 font-medium">FIXED</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Custom Event Card
                        <div className={`rounded-2xl p-4 ${
                          (item as any).conflicts?.length > 0
                            ? (item as any).isPrayerEvent
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700'
                              : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700'
                            : 'bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
                        }`}>
                          {/* Conflict Message - green for prayer events, red for others */}
                          {(item as any).conflicts?.length > 0 && (
                            (item as any).isPrayerEvent ? (
                              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-2">
                                <span>✓</span>
                                <span>Scheduled during prayer time</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-semibold mb-2">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>
                                  Clashes with {(item as any).conflicts.map((c: PrayerTime, i: number) => (
                                    <span key={c.name}>
                                      {i > 0 && (i === (item as any).conflicts.length - 1 ? ' & ' : ', ')}
                                      {c.name}
                                    </span>
                                  ))}
                                </span>
                              </div>
                            )
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {/* Event Icon */}
                              {(item as WeddingEvent).icon && (
                                <span className="text-2xl">{(item as WeddingEvent).icon}</span>
                              )}
                              <div>
                                <p className="font-bold text-slate-800 dark:text-white">{(item as WeddingEvent).name}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {formatTimeDisplay((item as WeddingEvent).startTime)} - {formatTimeDisplay((item as WeddingEvent).endTime)}
                                  {(item as any).crossesMidnight && (
                                    <span className="ml-1 text-xs text-amber-600 dark:text-amber-400 font-medium">(+1 day)</span>
                                  )}
                                </p>
                                {(item as WeddingEvent).description && (
                                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">{(item as WeddingEvent).description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditEvent(item as WeddingEvent)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all"
                              >
                                <Edit className="w-4 h-4 text-slate-500" />
                              </button>
                              <button
                                onClick={() => handleDeleteEvent((item as WeddingEvent).id)}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all"
                              >
                                <Trash className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Smart Gap Button - shows when there's a 15+ min gap to next item */}
                    {gapInfo && (
                      <div className="relative pl-12 md:pl-16 py-2">
                        <button
                          onClick={() => openModalWithStartTime(gapInfo.startTime, nextEventStartTime)}
                          className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500 rounded-xl text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Add event here ({Math.floor(gapInfo.gap / 60) > 0 ? `${Math.floor(gapInfo.gap / 60)}h ` : ''}{gapInfo.gap % 60 > 0 ? `${gapInfo.gap % 60}m` : ''} gap)
                        </button>
                      </div>
                    )}
                    </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty State - No Prayer Times Yet */}
      {!hasPrayerTimes && !loading && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-12 border border-slate-100 dark:border-slate-700 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Set Your Wedding Date & Location</h3>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Enter your wedding date and venue location above to fetch prayer times and start building your timeline.
          </p>
        </div>
      )}

      {/* Add/Edit Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeEventModal}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-800 dark:text-white text-lg">
                {editingEvent ? 'Edit Event' : 'Add Event'}
              </h4>
              <button 
                onClick={closeEventModal}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Quick Add Chips (only when adding new event) */}
            {!editingEvent && (
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Quick Add:</p>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => applyPresetToForm(preset)}
                      className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-600 dark:text-slate-300 rounded-lg transition-all flex items-center gap-1"
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={eventForm.name}
                  onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Nikkah Ceremony"
                  className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400 ${
                    formTouched && !eventForm.name 
                      ? 'border-red-400 dark:border-red-500' 
                      : 'border-transparent focus:border-emerald-400'
                  }`}
                />
                {formTouched && !eventForm.name && (
                  <p className="text-xs text-red-500 mt-1">Event name is required</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white ${
                      formTouched && !eventForm.startTime 
                        ? 'border-red-400 dark:border-red-500' 
                        : 'border-transparent focus:border-emerald-400'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white ${
                      formTouched && !eventForm.endTime 
                        ? 'border-red-400 dark:border-red-500' 
                        : 'border-transparent focus:border-emerald-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Any notes about this event..."
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-transparent focus:border-emerald-400 rounded-xl transition-all outline-none font-medium text-slate-800 dark:text-white placeholder:text-slate-400 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEvent}
                className="flex-1 py-3 px-6 font-bold rounded-xl transition-all bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {editingEvent ? 'Save Changes' : 'Add Event'}
              </button>
              <button
                onClick={closeEventModal}
                className="py-3 px-6 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-all"
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
