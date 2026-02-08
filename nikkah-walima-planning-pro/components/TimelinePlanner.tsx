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
  PrayerConflictInfo,
  CachedPrayerData
} from '../types';
import { DatePicker } from './DatePicker';
import { EventSettingsModal } from './EventSettingsModal';
import { Clock, Plus, Trash, Edit, AlertTriangle, MapPin, RefreshCw, X, Info, ChevronDown, SettingsIcon } from './Icons';
import { Combobox } from './Combobox';
import { COUNTRIES, CALCULATION_METHODS, ASR_SCHOOLS, getAutoCalculationMethod, getAutoAsrSchool } from '../constants';
import { CustomSelect } from './CustomSelect';

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

// Calculate Islamic Midnight: midpoint between Maghrib and next Fajr
// Formula: Maghrib + ((NextFajr - Maghrib) / 2)
const calculateIslamicMidnight = (maghribTime: string, fajrTime: string): string => {
  const maghribMins = timeToMinutes(maghribTime);
  // Fajr is next day, so add 24 hours
  const fajrMins = timeToMinutes(fajrTime) + 24 * 60;
  const midnightMins = maghribMins + Math.floor((fajrMins - maghribMins) / 2);
  return minutesToTime(midnightMins % (24 * 60));
};

// Calculate Asr Makruh start time: ~20 mins before Maghrib (when sun starts yellowing)
const calculateAsrMakruhStart = (maghribTime: string): string => {
  const maghribMins = timeToMinutes(maghribTime);
  const makruhMins = Math.max(0, maghribMins - 20);
  return minutesToTime(makruhMins);
};

// Calculate Fiqh times from prayer times
const calculateFiqhTimes = (prayerTimes: PrayerTime[]): { islamicMidnight: string; asrMakruhStart: string } => {
  const maghrib = prayerTimes.find(p => p.name === 'Maghrib');
  const fajr = prayerTimes.find(p => p.name === 'Fajr');
  
  return {
    islamicMidnight: maghrib && fajr ? calculateIslamicMidnight(maghrib.time, fajr.time) : '00:00',
    asrMakruhStart: maghrib ? calculateAsrMakruhStart(maghrib.time) : '18:00'
  };
};

// Check if an event conflicts with ANY prayer times (returns ALL conflicts with deadline info)
// Enhanced with Fiqh-compliant warnings (Makruh zones, Islamic Midnight)
const checkConflicts = (
  event: WeddingEvent, 
  prayerTimes: PrayerTime[],
  sunrise: string,
  islamicMidnight: string,
  asrMakruhStart: string
): PrayerConflictInfo[] => {
  const eventStart = timeToMinutes(event.startTime);
  const eventEnd = getEffectiveEndMinutes(event.startTime, event.endTime);
  const conflicts: PrayerConflictInfo[] = [];
  
  const asrMakruhMins = timeToMinutes(asrMakruhStart);
  const islamicMidnightMins = timeToMinutes(islamicMidnight);
  
  for (let i = 0; i < prayerTimes.length; i++) {
    const prayer = prayerTimes[i];
    const prayerStart = timeToMinutes(prayer.time);
    const prayerEnd = prayerStart + getPrayerBuffer(prayer.name);
    
    // Check if event overlaps with prayer time window
    if (eventStart < prayerEnd && eventEnd > prayerStart) {
      // Determine the deadline and severity based on Fiqh rules
      let deadline: string;
      let deadlineName: string;
      let severity: 'info' | 'warning' | 'makruh' | 'critical' | 'high' = 'warning';
      let warningMessage: string | undefined;
      
      if (prayer.name === 'Fajr') {
        // Fajr must be completed before Sunrise - this is CRITICAL
        deadline = sunrise;
        deadlineName = 'Sunrise';
        severity = 'critical';
        warningMessage = `Fajr ends sharply at Sunrise (${formatTimeDisplay(sunrise)}). Must pray before then.`;
      } else if (prayer.name === 'Jummah') {
        // Jummah is time-sensitive - cannot delay, must attend congregation
        const asrPrayer = prayerTimes.find(p => p.name === 'Asr');
        deadline = asrPrayer?.time || '';
        deadlineName = 'Asr';
        severity = 'high'; // Highest priority - cannot skip Jummah
        warningMessage = 'Jummah congregation cannot be delayed. Consider rescheduling this event.';
      } else if (prayer.name === 'Asr') {
        // Asr has Makruh zone (20 mins before Maghrib when sun yellows)
        const maghrib = prayerTimes.find(p => p.name === 'Maghrib');
        if (maghrib) {
          deadline = maghrib.time;
          deadlineName = 'Maghrib';
          
          // Check if event pushes into Makruh zone
          if (eventEnd > asrMakruhMins) {
            severity = 'makruh';
            warningMessage = `Recommended to pray Asr before ${formatTimeDisplay(asrMakruhStart)} (sun yellowing). Disliked to delay further.`;
          } else {
            warningMessage = `Ensure Asr before ${formatTimeDisplay(asrMakruhStart)} (preferred) or latest by Maghrib.`;
          }
        } else {
          deadline = '18:30';
          deadlineName = 'Maghrib';
        }
      } else if (prayer.name === 'Isha') {
        // Isha preferred time ends at Islamic Midnight
        deadline = islamicMidnight;
        deadlineName = 'Islamic Midnight';
        
        // Check if event goes past Islamic Midnight
        // Handle cross-midnight properly
        const eventEndNormalized = eventEnd > 24 * 60 ? eventEnd - 24 * 60 : eventEnd;
        if (eventEndNormalized > islamicMidnightMins || eventEnd > 24 * 60) {
          severity = 'warning';
          warningMessage = `Preferred Isha time ends at Islamic Midnight (${formatTimeDisplay(islamicMidnight)}). Valid until Fajr but discouraged.`;
        } else {
          severity = 'info';
          warningMessage = `Ensure Isha before Islamic Midnight (${formatTimeDisplay(islamicMidnight)}) for preferred time.`;
        }
      } else {
        // Dhuhr/Maghrib - standard next prayer deadline
        const nextPrayer = prayerTimes[i + 1];
        if (nextPrayer) {
          deadline = nextPrayer.time;
          deadlineName = nextPrayer.name;
          warningMessage = `Ensure prayer before ${deadlineName} (${formatTimeDisplay(deadline)}).`;
        } else {
          deadline = '23:59';
          deadlineName = 'end of day';
        }
      }
      
      conflicts.push({
        prayer,
        deadline,
        deadlineName,
        severity,
        warningMessage
      });
    }
  }
  
  return conflicts;
};

// Generate a unique ID
const generateId = (): string => Math.random().toString(36).substring(2, 9);

export const TimelinePlanner: React.FC = () => {
  // Read/write shared events config from Guest Manager (single source of truth)
  const [guestManagerData, setGuestManagerData] = useLocalStorage<GuestManagerData | null>('guest-manager-data', null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Get enabled events from Guest Manager, or use defaults
  const enabledEvents = useMemo(() => {
    if (guestManagerData?.events) {
      return guestManagerData.events.filter(e => e.enabled);
    }
    return DEFAULT_WEDDING_EVENTS.filter(e => e.enabled);
  }, [guestManagerData?.events]);
  
  // All events (for settings modal)
  const allEvents = guestManagerData?.events || DEFAULT_WEDDING_EVENTS;

  // Event management handlers (write to guest-manager-data)
  const handleToggleEvent = (eventId: string) => {
    setGuestManagerData(prev => {
      if (!prev) return prev;
      return { ...prev, events: prev.events.map(e => e.id === eventId ? { ...e, enabled: !e.enabled } : e) };
    });
  };

  const handleAddCustomEvent = (name: string, icon: string) => {
    if (!name.trim()) return;
    const id = `custom-${Math.random().toString(36).substring(2, 9)}`;
    const newEvent: WeddingEventConfig = { id, name: name.trim(), icon, enabled: true, isCustom: true };
    setGuestManagerData(prev => {
      if (!prev) return prev;
      return { ...prev, events: [...prev.events, newEvent] };
    });
  };

  const handleDeleteCustomEvent = (eventId: string) => {
    setGuestManagerData(prev => {
      if (!prev) return prev;
      return { ...prev, events: prev.events.filter(e => e.id !== eventId) };
    });
  };

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
  
  // Prayer times from API hook (used for fetching, not as primary state)
  const { prayerTimes: fetchedPrayerTimes, sunrise: fetchedSunrise, hijriDate: fetchedHijriDate, locationInfo, loading, error, fetchPrayerTimes } = usePrayerTimes();
  
  // Get prayer times from per-event cached data (PRIMARY SOURCE)
  const cachedData = currentTimeline.cachedPrayerData;
  const prayerTimes = cachedData?.prayerTimes || [];
  const sunrise = cachedData?.sunrise || '';
  const hijriDate = cachedData?.hijriDate || '';
  const islamicMidnight = cachedData?.islamicMidnight || '';
  const asrMakruhStart = cachedData?.asrMakruhStart || '';
  
  // When new prayer times are fetched, store them in the current event's cache
  useEffect(() => {
    if (fetchedPrayerTimes.length > 0 && fetchedSunrise) {
      const fiqhTimes = calculateFiqhTimes(fetchedPrayerTimes);
      
      const newCachedData: CachedPrayerData = {
        prayerTimes: fetchedPrayerTimes,
        sunrise: fetchedSunrise,
        hijriDate: fetchedHijriDate,
        fetchedAt: new Date().toISOString(),
        islamicMidnight: fiqhTimes.islamicMidnight,
        asrMakruhStart: fiqhTimes.asrMakruhStart
      };
      
      // Only update if different from current cache
      if (JSON.stringify(newCachedData.prayerTimes) !== JSON.stringify(cachedData?.prayerTimes)) {
        setTimelineData(prev => ({
          ...prev,
          cachedPrayerData: newCachedData
        }));
      }
    }
  }, [fetchedPrayerTimes, fetchedSunrise, fetchedHijriDate]);
  
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
    
    // Add events with conflict info (using Fiqh-compliant checking)
    timelineData.events.forEach(event => {
      const conflictInfo = checkConflicts(
        event, 
        prayerTimes, 
        sunrise, 
        islamicMidnight || calculateFiqhTimes(prayerTimes).islamicMidnight,
        asrMakruhStart || calculateFiqhTimes(prayerTimes).asrMakruhStart
      );
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
  }, [prayerTimes, timelineData.events, sunrise, islamicMidnight, asrMakruhStart]);
  
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
    <div className="max-w-5xl mx-auto px-4 py-8"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)) {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
    >
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
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 overflow-x-auto md:overflow-visible md:flex-wrap pb-2 -mx-4 px-4 md:mx-0 md:px-0 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {enabledEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => switchEvent(event.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    activeEventId === event.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="text-sm">{event.icon}</span>
                  <span>{event.name}</span>
                  {multiEventData.eventTimelines[event.id]?.events?.length > 0 && (
                    <span className={`text-[11px] px-1.5 py-px rounded-full ${
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
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium text-emerald-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex-shrink-0"
            >
              <SettingsIcon className="w-3 h-3" />
              Manage
            </button>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 mb-4">
        <div className="flex gap-2.5">
          <span className="text-amber-500 text-sm flex-shrink-0 mt-0.5">☪️</span>
          <div className="text-[11px] text-amber-800 dark:text-amber-200">
            <p className="font-bold mb-0.5">Prayer times are sacred anchors</p>
            <p className="text-amber-700 dark:text-amber-300">
              Plan your events around Salah times. We'll warn you if any event overlaps with prayer time, showing you the deadline to pray before the next prayer begins.
            </p>
          </div>
        </div>
      </div>

      {/* Location & Date Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-3 md:p-4 mb-4 border border-slate-200 dark:border-slate-700">
        
        {/* Collapsed Summary Bar - shown when prayer times loaded and form collapsed */}
        {hasPrayerTimes && !isFormExpanded ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">
                  {timelineData.date && new Date(timelineData.date).toLocaleDateString('en-GB', { 
                    day: 'numeric', month: 'short', year: 'numeric' 
                  })}
                  {' • '}{timelineData.city}, {timelineData.country}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {hijriDate} • {timelineData.school === 1 ? 'Hanafi' : 'Standard'} Asr
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsFormExpanded(true)}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
            >
              Edit Details
            </button>
          </div>
        ) : (
          <>
            {/* Expanded Form Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Wedding Details
              </h3>
              {hasPrayerTimes && (
                <button
                  onClick={() => setIsFormExpanded(false)}
                  className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Collapse ↑
                </button>
              )}
            </div>
            
            {/* Main Inputs: Date, City, Country */}
            <div className="grid md:grid-cols-3 gap-2.5 mb-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Wedding Date
                </label>
                <DatePicker
                  value={timelineData.date}
                  onChange={(val) => updateField('date', val)}
                  placeholder="Select date"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={timelineData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="e.g., London"
                  className="w-full px-2.5 h-8 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 focus:border-emerald-400 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
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
              className="mb-3 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? '' : '-rotate-90'}`} />
              Advanced Calculation Settings
            </button>

            {/* Advanced Settings (Collapsible) */}
            {showAdvanced && (
              <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-3">
                <div className="grid md:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                      Calculation Method
                    </label>
                    <CustomSelect
                      value={String(timelineData.method)}
                      onChange={(val) => updateField('method', Number(val))}
                      options={CALCULATION_METHODS.map(method => ({ value: String(method.id), label: `${method.shortName} - ${method.name}` }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                      Asr Calculation (Madhab)
                    </label>
                    <CustomSelect
                      value={String(timelineData.school)}
                      onChange={(val) => updateField('school', Number(val))}
                      options={ASR_SCHOOLS.map(school => ({ value: String(school.id), label: school.name }))}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
              className={`w-full h-8 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                hasLocation && !loading
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Fetching Prayer Times...' : 'Get Prayer Times'}
            </button>

            {/* Helper note about city lookup */}
            <div className="mt-3 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <p>
                City can be any city or village name. If not found exactly, prayer times will default to a nearby major city.
              </p>
            </div>

            {error && (
              <div className="mt-3 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-xs text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Hijri Date Display (no coordinates - they're unreliable) */}
            {hijriDate && (
              <div className="mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
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
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowEventModal(true)}
              className="flex-1 h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Event
            </button>
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="h-8 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-all"
            >
              Quick Add
            </button>
          </div>

          {/* Presets Dropdown */}
          {showPresets && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 mb-4">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Common Wedding Events:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                {EVENT_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => handleQuickAdd(preset)}
                    className="p-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-left transition-all border border-transparent hover:border-emerald-300 dark:hover:border-emerald-700"
                  >
                    <span className="text-sm">{preset.icon}</span>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">{preset.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500">{preset.duration} min</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-3 md:p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Your Wedding Timeline
            </h3>

            {sortedTimeline.length === 0 || timelineData.events.length === 0 ? (
              <div className="text-center py-6">
                <Clock className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  {prayerTimes.length > 0 
                    ? `Build your ${activeEvent?.name || 'wedding'} timeline`
                    : 'Add events to build your timeline'}
                </p>
                
                {/* Template Loading Buttons */}
                {prayerTimes.length > 0 && (
                  <div className="max-w-sm mx-auto">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-2">
                      Start with a template:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => loadTemplate('afternoonNikkah')}
                        className="p-3 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-left transition-all group"
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm">☀️</span>
                          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Afternoon Nikkah</span>
                        </div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          2:00 PM start • Dhuhr/Asr prayers
                        </p>
                      </button>
                      <button
                        onClick={() => loadTemplate('eveningWalima')}
                        className="p-3 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800 rounded-lg text-left transition-all group"
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm">🌙</span>
                          <span className="text-xs font-bold text-violet-800 dark:text-violet-300">Evening Walima</span>
                        </div>
                        <p className="text-[11px] text-violet-600 dark:text-violet-400">
                          6:00 PM start • Maghrib/Isha prayers
                        </p>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
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
                      {/* Timeline dot - color based on conflict severity */}
                      <div className={`absolute left-2 md:left-4 w-4 h-4 rounded-full border-2 ${
                        item.type === 'fixed'
                          ? 'bg-amber-100 border-amber-500'
                          : (item as any).conflictInfo?.length > 0
                            ? (item as any).isPrayerEvent
                              ? 'bg-emerald-100 border-emerald-500' // Green dot for prayer events
                              : (item as any).conflictInfo.some((c: PrayerConflictInfo) => c.severity === 'high' || c.severity === 'critical')
                                ? 'bg-red-100 border-red-500' // Red for critical/Jummah
                                : (item as any).conflictInfo.some((c: PrayerConflictInfo) => c.severity === 'makruh')
                                  ? 'bg-orange-100 border-orange-500' // Orange for Makruh zone
                                  : 'bg-amber-100 border-amber-500' // Amber for warnings
                            : 'bg-emerald-100 border-emerald-500'
                      }`} />

                      {/* Card */}
                      {item.type === 'fixed' ? (
                        // Prayer Time Card
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg">☪️</span>
                              <div>
                                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">{item.name}</p>
                                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                  {item.name === 'Jummah' ? 'Friday Prayer (Congregation)' : 'Prayer Time'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                                {formatTimeDisplay(item.time)}
                              </p>
                              <p className="text-[11px] text-amber-500 dark:text-amber-500 font-medium">FIXED</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Custom Event Card
                        <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3">
                          {/* Conflict Alert Banners - distinct style from event cards */}
                          {(item as any).conflictInfo?.length > 0 && (
                            (item as any).isPrayerEvent ? (
                              // Green success banner for prayer-related events
                              <div className="border-l-4 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-r-lg px-2.5 py-1.5 mb-2.5">
                                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                                  <span>✓</span>
                                  <span>Scheduled during prayer time</span>
                                </div>
                              </div>
                            ) : (
                              // Warning banners based on severity
                              <div className="space-y-1.5 mb-2.5">
                                {(item as any).conflictInfo.map((conflict: PrayerConflictInfo, idx: number) => {
                                  // Determine banner style based on severity
                                  const severityStyles = {
                                    high: 'border-red-500 bg-red-500/10 dark:bg-red-500/5 text-red-700 dark:text-red-400',
                                    critical: 'border-red-500 bg-red-500/10 dark:bg-red-500/5 text-red-700 dark:text-red-400',
                                    makruh: 'border-orange-500 bg-orange-500/10 dark:bg-orange-500/5 text-orange-700 dark:text-orange-400',
                                    warning: 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/5 text-amber-700 dark:text-amber-400',
                                    info: 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/5 text-blue-700 dark:text-blue-400'
                                  };
                                  const severityIcons = {
                                    high: '⛔',
                                    critical: '⚠️',
                                    makruh: '⚡',
                                    warning: '⏰',
                                    info: 'ℹ️'
                                  };
                                  const style = severityStyles[conflict.severity] || severityStyles.warning;
                                  const icon = severityIcons[conflict.severity] || severityIcons.warning;
                                  
                                  return (
                                    <div key={conflict.prayer.name} className={`border-l-4 ${style} rounded-r-lg px-2.5 py-1.5`}>
                                      <div className="flex items-start gap-1.5 text-xs">
                                        <span className="flex-shrink-0">{icon}</span>
                                        <div>
                                          <span className="font-medium block">
                                            Overlaps {conflict.prayer.name}
                                          </span>
                                          {conflict.warningMessage && (
                                            <span className="text-[11px] opacity-90 block mt-0.5">
                                              {conflict.warningMessage}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {/* Event Icon */}
                              {(item as WeddingEvent).icon && (
                                <span className="text-lg">{(item as WeddingEvent).icon}</span>
                              )}
                              <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-white">{(item as WeddingEvent).name}</p>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                  {formatTimeDisplay((item as WeddingEvent).startTime)} - {formatTimeDisplay((item as WeddingEvent).endTime)}
                                  {(item as any).crossesMidnight && (
                                    <span className="ml-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">(+1 day)</span>
                                  )}
                                </p>
                                {(item as WeddingEvent).description && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">{(item as WeddingEvent).description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleEditEvent(item as WeddingEvent)}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all"
                              >
                                <Edit className="w-3.5 h-3.5 text-slate-500" />
                              </button>
                              <button
                                onClick={() => handleDeleteEvent((item as WeddingEvent).id)}
                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all"
                              >
                                <Trash className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Smart Gap Button - shows when there's a 15+ min gap to next item */}
                    {gapInfo && (
                      <div className="relative pl-12 md:pl-16 py-1.5">
                        <button
                          onClick={() => openModalWithStartTime(gapInfo.startTime, nextEventStartTime)}
                          className="w-full py-1.5 border border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500 rounded-lg text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all flex items-center justify-center gap-1.5 text-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add event here ({Math.floor(gapInfo.gap / 60) > 0 ? `${Math.floor(gapInfo.gap / 60)}h ` : ''}{gapInfo.gap % 60 > 0 ? `${gapInfo.gap % 60}m` : ''} gap)
                        </button>
                      </div>
                    )}
                    </React.Fragment>
                    );
                  })}

                  {/* Add event after last item */}
                  {sortedTimeline.length > 0 && (() => {
                    const lastItem = sortedTimeline[sortedTimeline.length - 1];
                    const lastEndTime = lastItem.type === 'fixed'
                      ? (lastItem as PrayerTime).time
                      : (lastItem as WeddingEvent).endTime;
                    return (
                      <div className="relative pl-12 md:pl-16 py-1.5">
                        <button
                          onClick={() => openModalWithStartTime(lastEndTime)}
                          className="w-full py-1.5 border border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500 rounded-lg text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all flex items-center justify-center gap-1.5 text-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add event after {lastItem.name}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty State - No Prayer Times Yet */}
      {!hasPrayerTimes && !loading && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 border border-slate-200 dark:border-slate-700 text-center">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1.5">Set Your Wedding Date & Location</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Enter your wedding date and venue location above to fetch prayer times and start building your timeline.
          </p>
        </div>
      )}

      {/* Add/Edit Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeEventModal}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 max-w-sm w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                {editingEvent ? 'Edit Event' : 'Add Event'}
              </h4>
              <button 
                onClick={closeEventModal}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Quick Add Chips (only when adding new event) */}
            {!editingEvent && (
              <div className="mb-3">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Quick Add:</p>
                <div className="flex flex-wrap gap-1">
                  {EVENT_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => applyPresetToForm(preset)}
                      className="px-2 py-1 text-[11px] bg-slate-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-600 dark:text-slate-300 rounded-md transition-all flex items-center gap-1"
                    >
                      <span className="text-xs">{preset.icon}</span>
                      <span>{preset.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={eventForm.name}
                  onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Nikkah Ceremony"
                  className={`w-full px-2.5 h-8 bg-slate-50 dark:bg-slate-900/50 border rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 ${
                    formTouched && !eventForm.name 
                      ? 'border-red-400 dark:border-red-500' 
                      : 'border-slate-200 dark:border-slate-600 focus:border-emerald-400'
                  }`}
                />
                {formTouched && !eventForm.name && (
                  <p className="text-[11px] text-red-500 mt-0.5">Event name is required</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className={`w-full px-2.5 h-8 bg-slate-50 dark:bg-slate-900/50 border rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white ${
                      formTouched && !eventForm.startTime 
                        ? 'border-red-400 dark:border-red-500' 
                        : 'border-slate-200 dark:border-slate-600 focus:border-emerald-400'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className={`w-full px-2.5 h-8 bg-slate-50 dark:bg-slate-900/50 border rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white ${
                      formTouched && !eventForm.endTime 
                        ? 'border-red-400 dark:border-red-500' 
                        : 'border-slate-200 dark:border-slate-600 focus:border-emerald-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Any notes about this event..."
                  rows={2}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 focus:border-emerald-400 rounded-lg transition-all outline-none text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveEvent}
                className="flex-1 h-8 px-3 text-xs font-bold rounded-lg transition-all bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {editingEvent ? 'Save Changes' : 'Add Event'}
              </button>
              <button
                onClick={closeEventModal}
                className="h-8 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Shared Event Settings Modal */}
      <EventSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        events={allEvents}
        onToggleEvent={handleToggleEvent}
        onAddCustomEvent={handleAddCustomEvent}
        onDeleteCustomEvent={handleDeleteCustomEvent}
        showSegregation={false}
      />
    </div>
  );
};
