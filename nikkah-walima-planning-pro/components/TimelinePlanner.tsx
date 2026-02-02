import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { 
  TimelineData, 
  WeddingEvent, 
  PrayerTime, 
  TimelineItem, 
  MultiEventTimelineData,
  EventTimelineConfig,
  WeddingEventConfig,
  GuestManagerData,
  PrayerConflictInfo
} from '../types';
import { Clock, Plus, Trash, Edit, AlertTriangle, MapPin, RefreshCw, X, Info, ChevronDown } from './Icons';
import { Combobox } from './Combobox';
import { COUNTRIES, CALCULATION_METHODS, ASR_SCHOOLS, getAutoCalculationMethod, getAutoAsrSchool } from '../constants';

// Default wedding events (fallback if guest manager hasn't been configured)
const DEFAULT_WEDDING_EVENTS: WeddingEventConfig[] = [
  { id: 'nikkah', name: 'Nikkah', icon: '💍', enabled: true },
  { id: 'walima', name: 'Walima', icon: '🍽️', enabled: true },
  { id: 'mehndi', name: 'Mehndi', icon: '🎨', enabled: false },
  { id: 'dholki', name: 'Dholki', icon: '🥁', enabled: false },
  { id: 'civil', name: 'Civil Registry', icon: '📝', enabled: false },
];

// Default single event timeline
const getDefaultEventTimeline = (): EventTimelineConfig => ({
  date: '',
  city: '',
  country: '',
  method: 3, // Muslim World League (global default)
  school: 0, // Standard (Shafi/Maliki/Hanbali)
  events: []
});

// Default multi-event timeline data
const getDefaultMultiEventData = (): MultiEventTimelineData => ({
  activeEventId: 'nikkah',
  defaultCity: '',
  defaultCountry: '',
  defaultMethod: 3,
  defaultSchool: 0,
  eventTimelines: {}
});

// Legacy single timeline for migration
const getDefaultTimelineData = (): TimelineData => ({
  date: '',
  city: '',
  country: '',
  method: 3,
  school: 0,
  events: []
});

// Migrate legacy single timeline to multi-event structure
const migrateLegacyData = (
  legacy: TimelineData | null, 
  multiEvent: MultiEventTimelineData,
  firstEventId: string
): MultiEventTimelineData => {
  if (!legacy || !legacy.date) return multiEvent;
  
  // Check if we already have this data migrated
  if (multiEvent.eventTimelines[firstEventId]?.events?.length > 0) {
    return multiEvent;
  }
  
  // Migrate legacy data to first enabled event
  return {
    ...multiEvent,
    defaultCity: legacy.city,
    defaultCountry: legacy.country,
    defaultMethod: legacy.method,
    defaultSchool: legacy.school,
    eventTimelines: {
      ...multiEvent.eventTimelines,
      [firstEventId]: {
        date: legacy.date,
        city: legacy.city,
        country: legacy.country,
        method: legacy.method,
        school: legacy.school,
        events: legacy.events
      }
    }
  };
};

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

// Timeline templates for quick setup
const TIMELINE_TEMPLATES = {
  afternoonNikkah: {
    id: 'afternoonNikkah',
    name: 'Afternoon Nikkah',
    description: 'Traditional afternoon ceremony with Dhuhr/Asr prayers',
    startHour: 14, // 2 PM
    events: [
      { name: 'Guests Arrive', startTime: '14:00', endTime: '14:30', icon: '🚗', type: 'custom' as const },
      { name: 'Nikkah Ceremony', startTime: '14:30', endTime: '15:00', icon: '💍', type: 'custom' as const },
      { name: 'Photography', startTime: '15:00', endTime: '16:00', icon: '📸', type: 'custom' as const },
      { name: 'Prayer Break', startTime: '16:00', endTime: '16:30', icon: '🤲', type: 'custom' as const },
      { name: 'Food Service', startTime: '16:30', endTime: '18:00', icon: '🍽️', type: 'custom' as const },
      { name: 'Guest Departure', startTime: '18:00', endTime: '18:30', icon: '👋', type: 'custom' as const },
    ]
  },
  eveningWalima: {
    id: 'eveningWalima',
    name: 'Evening Walima',
    description: 'Evening reception with Maghrib/Isha prayers',
    startHour: 18, // 6 PM
    events: [
      { name: 'Guests Arrive', startTime: '18:00', endTime: '18:30', icon: '🚗', type: 'custom' as const },
      { name: 'Entrance', startTime: '18:30', endTime: '19:00', icon: '🎉', type: 'custom' as const },
      { name: 'Prayer Break (Maghrib)', startTime: '19:00', endTime: '19:30', icon: '🤲', type: 'custom' as const },
      { name: 'Food Service', startTime: '19:30', endTime: '21:00', icon: '🍽️', type: 'custom' as const },
      { name: 'Cake Cutting', startTime: '21:00', endTime: '21:15', icon: '🎂', type: 'custom' as const },
      { name: 'Speeches', startTime: '21:15', endTime: '21:45', icon: '🎤', type: 'custom' as const },
      { name: 'Prayer Break (Isha)', startTime: '21:45', endTime: '22:15', icon: '🤲', type: 'custom' as const },
      { name: 'Entertainment', startTime: '22:15', endTime: '23:00', icon: '🎵', type: 'custom' as const },
      { name: 'Guest Departure', startTime: '23:00', endTime: '23:30', icon: '👋', type: 'custom' as const },
    ]
  }
};

// Prayer duration buffer in minutes (for conflict detection)
const PRAYER_BUFFER_MINUTES = 15;
const JUMMAH_BUFFER_MINUTES = 45; // Jummah includes khutbah + prayer
const FAJR_BUFFER_MINUTES = 20; // Fajr is typically shorter

// Get prayer buffer based on prayer name
const getPrayerBuffer = (prayerName: string): number => {
  if (prayerName === 'Jummah') return JUMMAH_BUFFER_MINUTES;
  if (prayerName === 'Fajr') return FAJR_BUFFER_MINUTES;
  return PRAYER_BUFFER_MINUTES;
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

// Check if an event conflicts with ANY prayer times (returns ALL conflicts with deadline info)
const checkConflicts = (
  event: WeddingEvent, 
  prayerTimes: PrayerTime[],
  sunrise: string
): PrayerConflictInfo[] => {
  const eventStart = timeToMinutes(event.startTime);
  const eventEnd = getEffectiveEndMinutes(event.startTime, event.endTime);
  const conflicts: PrayerConflictInfo[] = [];
  
  // Create a map for finding next prayer
  const prayerOrder = ['Fajr', 'Dhuhr', 'Jummah', 'Asr', 'Maghrib', 'Isha'];
  
  for (let i = 0; i < prayerTimes.length; i++) {
    const prayer = prayerTimes[i];
    const prayerStart = timeToMinutes(prayer.time);
    const prayerEnd = prayerStart + getPrayerBuffer(prayer.name);
    
    // Check if event overlaps with prayer time window
    if (eventStart < prayerEnd && eventEnd > prayerStart) {
      // Determine the deadline (when the prayer MUST be completed by)
      let deadline: string;
      let deadlineName: string;
      let severity: 'warning' | 'high' = 'warning';
      
      if (prayer.name === 'Fajr') {
        // Fajr must be completed before Sunrise
        deadline = sunrise;
        deadlineName = 'Sunrise';
      } else if (prayer.name === 'Jummah') {
        // Jummah is time-sensitive - cannot delay, must attend congregation
        // Find Asr time as theoretical deadline
        const asrPrayer = prayerTimes.find(p => p.name === 'Asr');
        deadline = asrPrayer?.time || '';
        deadlineName = 'Asr';
        severity = 'high'; // High priority - cannot skip Jummah
      } else {
        // For other prayers, deadline is the next prayer
        const nextPrayer = prayerTimes[i + 1];
        if (nextPrayer) {
          deadline = nextPrayer.time;
          deadlineName = nextPrayer.name;
        } else {
          // Isha - deadline is Fajr (next day), but we'll show a reasonable time
          deadline = '23:59';
          deadlineName = 'Midnight';
        }
      }
      
      conflicts.push({
        prayer,
        deadline,
        deadlineName,
        severity
      });
    }
  }
  
  return conflicts;
};

// Generate a unique ID
const generateId = (): string => Math.random().toString(36).substring(2, 9);

export const TimelinePlanner: React.FC = () => {
  // Read shared events config from Guest Manager (single source of truth)
  const [guestManagerData] = useLocalStorage<GuestManagerData | null>('guest-manager-data', null);
  
  // Get enabled events from Guest Manager, or use defaults
  const enabledEvents = useMemo(() => {
    if (guestManagerData?.events) {
      return guestManagerData.events.filter(e => e.enabled);
    }
    return DEFAULT_WEDDING_EVENTS.filter(e => e.enabled);
  }, [guestManagerData?.events]);
  
  // Legacy single timeline data (for migration)
  const [legacyData] = useLocalStorage<TimelineData | null>('timeline-data', null);
  
  // Multi-event timeline data
  const [multiEventData, setMultiEventData] = useLocalStorage<MultiEventTimelineData>(
    'multi-event-timeline-data',
    getDefaultMultiEventData()
  );
  
  // Migrate legacy data on first load
  useEffect(() => {
    if (legacyData && legacyData.date && enabledEvents.length > 0) {
      const firstEventId = enabledEvents[0].id;
      const migratedData = migrateLegacyData(legacyData, multiEventData, firstEventId);
      if (JSON.stringify(migratedData) !== JSON.stringify(multiEventData)) {
        setMultiEventData(migratedData);
      }
    }
  }, [legacyData, enabledEvents]);
  
  // Active event selection
  const activeEventId = multiEventData.activeEventId || enabledEvents[0]?.id || 'nikkah';
  const activeEvent = enabledEvents.find(e => e.id === activeEventId) || enabledEvents[0];
  
  // Get current event's timeline data
  const currentTimeline: EventTimelineConfig = multiEventData.eventTimelines[activeEventId] || {
    date: '',
    city: multiEventData.defaultCity,
    country: multiEventData.defaultCountry,
    method: multiEventData.defaultMethod,
    school: multiEventData.defaultSchool,
    events: []
  };
  
  // Wrapper to update timeline data while maintaining ref synchronization
  const timelineData = currentTimeline;
  const timelineDataRef = useRef(currentTimeline);
  
  // Keep ref in sync
  useEffect(() => {
    timelineDataRef.current = currentTimeline;
  }, [currentTimeline]);
  
  // Update timeline data for the active event
  const setTimelineData = (updater: EventTimelineConfig | ((prev: EventTimelineConfig) => EventTimelineConfig)) => {
    setMultiEventData(prev => {
      const currentData = prev.eventTimelines[activeEventId] || {
        date: '',
        city: prev.defaultCity,
        country: prev.defaultCountry,
        method: prev.defaultMethod,
        school: prev.defaultSchool,
        events: []
      };
      const newData = typeof updater === 'function' ? updater(currentData) : updater;
      return {
        ...prev,
        eventTimelines: {
          ...prev.eventTimelines,
          [activeEventId]: newData
        }
      };
    });
  };
  
  // Switch active event
  const switchEvent = (eventId: string) => {
    setMultiEventData(prev => ({
      ...prev,
      activeEventId: eventId
    }));
  };
  
  // Prayer times from API
  const { prayerTimes, sunrise, hijriDate, locationInfo, loading, error, fetchPrayerTimes } = usePrayerTimes();
  
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
  const sortedTimeline = useMemo((): (TimelineItem & { conflictInfo?: PrayerConflictInfo[]; crossesMidnight?: boolean; isPrayerEvent?: boolean })[] => {
    const items: (TimelineItem & { conflictInfo?: PrayerConflictInfo[]; crossesMidnight?: boolean; isPrayerEvent?: boolean })[] = [];
    
    // Add prayer times
    prayerTimes.forEach(prayer => {
      items.push({ ...prayer });
    });
    
    // Add events with conflict info
    timelineData.events.forEach(event => {
      const conflictInfo = checkConflicts(event, prayerTimes, sunrise);
      const crossesMidnight = isCrossMidnight(event.startTime, event.endTime);
      const isPrayerEvent = isPrayerRelatedEvent(event.name);
      items.push({ 
        ...event, 
        conflictInfo: conflictInfo.length > 0 ? conflictInfo : undefined,
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
  }, [prayerTimes, timelineData.events, sunrise]);
  
  // Load a timeline template
  const loadTemplate = (templateId: 'afternoonNikkah' | 'eveningWalima') => {
    const template = TIMELINE_TEMPLATES[templateId];
    if (!template) return;
    
    const generateId = () => Math.random().toString(36).substring(2, 9);
    
    const newEvents: WeddingEvent[] = template.events.map(e => ({
      ...e,
      id: generateId()
    }));
    
    setTimelineData(prev => ({
      ...prev,
      events: newEvents
    }));
  };

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
          Schedule your wedding events around the sacred times of Salah
        </p>
      </div>

      {/* Event Tabs - Only show if multiple events enabled */}
      {enabledEvents.length > 1 && (
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {enabledEvents.map(event => (
              <button
                key={event.id}
                onClick={() => switchEvent(event.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
                  activeEventId === event.id
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{event.icon}</span>
                <span>{event.name}</span>
                {multiEventData.eventTimelines[event.id]?.events?.length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeEventId === event.id
                      ? 'bg-emerald-500'
                      : 'bg-slate-200 dark:bg-slate-600'
                  }`}>
                    {multiEventData.eventTimelines[event.id].events.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            💡 Configure events in the Guest Manager to add more tabs
          </p>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 mb-8">
        <div className="flex gap-3">
          <span className="text-amber-500 text-xl flex-shrink-0">☪️</span>
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold mb-1">Prayer times are sacred anchors</p>
            <p className="text-amber-700 dark:text-amber-300">
              Plan your events around Salah times. We'll warn you if any event overlaps with prayer time, showing you the deadline to pray before the next prayer begins.
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

            {sortedTimeline.length === 0 || timelineData.events.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  {prayerTimes.length > 0 
                    ? `Build your ${activeEvent?.name || 'wedding'} timeline`
                    : 'Add events to build your timeline'}
                </p>
                
                {/* Template Loading Buttons */}
                {prayerTimes.length > 0 && (
                  <div className="max-w-md mx-auto">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">
                      Start with a template:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => loadTemplate('afternoonNikkah')}
                        className="p-4 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl text-left transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">☀️</span>
                          <span className="font-bold text-emerald-800 dark:text-emerald-300">Afternoon Nikkah</span>
                        </div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          2:00 PM start • Dhuhr/Asr prayers
                        </p>
                      </button>
                      <button
                        onClick={() => loadTemplate('eveningWalima')}
                        className="p-4 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 border-2 border-violet-200 dark:border-violet-800 rounded-xl text-left transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">🌙</span>
                          <span className="font-bold text-violet-800 dark:text-violet-300">Evening Walima</span>
                        </div>
                        <p className="text-xs text-violet-600 dark:text-violet-400">
                          6:00 PM start • Maghrib/Isha prayers
                        </p>
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                      Templates provide a starting point. Customize times after loading.
                    </p>
                  </div>
                )}
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
                          : (item as any).conflictInfo?.length > 0
                            ? (item as any).isPrayerEvent
                              ? 'bg-emerald-100 border-emerald-500' // Green dot for prayer events
                              : (item as any).conflictInfo.some((c: PrayerConflictInfo) => c.severity === 'high')
                                ? 'bg-red-100 border-red-500' // Red for Jummah conflicts
                                : 'bg-amber-100 border-amber-500' // Amber for warnings
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
                                <p className="text-sm text-amber-600 dark:text-amber-400">
                                  {item.name === 'Jummah' ? 'Friday Prayer (Congregation)' : 'Prayer Time'}
                                </p>
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
                          (item as any).conflictInfo?.length > 0
                            ? (item as any).isPrayerEvent
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700'
                              : (item as any).conflictInfo.some((c: PrayerConflictInfo) => c.severity === 'high')
                                ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700'
                                : 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700'
                            : 'bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
                        }`}>
                          {/* Conflict Message - green for prayer events, yellow warning for delays, red for Jummah */}
                          {(item as any).conflictInfo?.length > 0 && (
                            (item as any).isPrayerEvent ? (
                              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-2">
                                <span>✓</span>
                                <span>Scheduled during prayer time</span>
                              </div>
                            ) : (item as any).conflictInfo.some((c: PrayerConflictInfo) => c.severity === 'high') ? (
                              // High priority - Jummah conflict
                              <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-sm font-semibold mb-2">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="block">
                                    ⚠️ Overlaps with Jummah Prayer
                                  </span>
                                  <span className="block text-xs font-normal mt-0.5">
                                    Jummah congregation cannot be delayed. Consider rescheduling this event.
                                  </span>
                                </div>
                              </div>
                            ) : (
                              // Yellow warning - can delay prayer
                              <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 text-sm mb-2">
                                <span className="text-base mt-0.5">⚠️</span>
                                <div>
                                  {(item as any).conflictInfo.map((conflict: PrayerConflictInfo, idx: number) => (
                                    <span key={conflict.prayer.name} className="block">
                                      Overlaps {conflict.prayer.name}. Ensure prayer before {conflict.deadlineName} ({formatTimeDisplay(conflict.deadline)})
                                    </span>
                                  ))}
                                </div>
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
