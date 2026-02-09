# Prayer-Aware Wedding Timeline - Implementation Plan

## Overview
A unique feature that allows Muslim couples to schedule their wedding day while ensuring events don't clash with mandatory prayer (Salah) times. Prayer times are "fixed anchors" that cannot be moved, while custom events flow around them.

## Why This Feature?
- **Unique Differentiator**: No generic wedding planner accounts for prayer times
- **High Pain Point**: "How do we fit food service between Asr and Maghrib?"
- **Viral Potential**: Visual warnings like "⚠️ Cake cutting clashes with Maghrib" are shareable

---

## Implementation Tasks

### Task 1: Types & Data Structures
**File**: `types.ts`
- Add `'timeline'` to `TabType`
- Create `PrayerTime` interface (name, time, type: 'fixed')
- Create `WeddingEvent` interface (id, name, startTime, endTime, description, type: 'custom')
- Create `TimelineData` interface (date, city, country, method, prayerTimes, events)

### Task 2: Icons
**File**: `components/Icons.tsx`
- Add `Clock` icon for Timeline tab

### Task 3: App Navigation
**File**: `App.tsx`
- Import `TimelinePlanner` component
- Import `Clock` icon
- Add 4th tab button for "Timeline" (desktop nav)
- Add 4th tab button for "Timeline" (mobile nav)
- Add conditional render for `TimelinePlanner`

### Task 4: Prayer Times Hook
**File**: `hooks/usePrayerTimes.ts`
- Create hook to fetch from Aladhan API
- Endpoint: `https://api.aladhan.com/v1/timingsByCity`
- Parameters: city, country, date, method (default: 2 = ISNA)
- Return: { prayerTimes, loading, error, refetch }
- Parse response to extract Fajr, Dhuhr, Asr, Maghrib, Isha

### Task 5: TimelinePlanner Component (Shell)
**File**: `components/TimelinePlanner.tsx`
- Create component shell with header
- Add date picker input
- Add city/country inputs
- Add "Fetch Prayer Times" button
- Use `useLocalStorage` for persisting timeline data

### Task 6: Prayer Times Display
**File**: `components/TimelinePlanner.tsx`
- Render prayer times as "fixed" blocks on timeline
- Style: Gold/Emerald border, distinct "sacred" look
- Show prayer name + time (e.g., "Maghrib - 6:45 PM")
- Visual indicator that these are locked/fixed

### Task 7: Custom Events
**File**: `components/TimelinePlanner.tsx`
- "Add Event" button opens modal/form
- Form fields: Event Name, Start Time, End Time, Description (optional)
- Save events to state/localStorage
- Render custom events as cards on timeline
- Edit/Delete functionality for events

### Task 8: Timeline Visualization
**File**: `components/TimelinePlanner.tsx`
- Merge prayers + events into chronological list
- Vertical timeline layout with time markers
- Visual distinction between prayer blocks and event blocks
- Responsive design (mobile-first)

### Task 9: Conflict Detection
**File**: `components/TimelinePlanner.tsx` or `utils/timelineUtils.ts`
- Create `checkConflict(event, prayerTimes)` function
- Assume prayer duration = 15 minutes for conflict buffer
- If event overlaps prayer time, flag it
- Visual feedback: Red border + warning icon on conflicting events
- Warning message: "⚠️ Clashes with Maghrib"

### Task 10: Polish & Testing
- Loading states for API call
- Error handling (invalid city, API failure)
- Empty states (no events yet)
- Calculation method selector (optional enhancement)
- Mobile responsiveness check

---

## API Details

**Aladhan API Endpoint:**
```
GET https://api.aladhan.com/v1/timingsByCity?city={city}&country={country}&date={DD-MM-YYYY}&method={method}
```

**Methods:**
- 2 = Islamic Society of North America (ISNA) - Good default
- 1 = University of Islamic Sciences, Karachi
- 3 = Muslim World League
- 4 = Umm Al-Qura University, Makkah
- 5 = Egyptian General Authority

**Response Structure:**
```json
{
  "data": {
    "timings": {
      "Fajr": "04:30",
      "Sunrise": "06:00",
      "Dhuhr": "12:30",
      "Asr": "15:45",
      "Maghrib": "18:30",
      "Isha": "20:00"
    }
  }
}
```

---

## UI/UX Notes

### Color Scheme (consistent with app)
- Prayer blocks: Emerald/Gold gradient border
- Custom events: White card with teal accent
- Conflicts: Red border + amber warning

### Timeline Visual
```
┌─────────────────────────────────┐
│  ☪️ Dhuhr - 1:15 PM             │  ← Fixed (gold border)
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  🍽️ Lunch Service               │  ← Custom event
│  1:45 PM - 3:00 PM              │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  ☪️ Asr - 4:30 PM               │  ← Fixed
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  ⚠️ Nikkah Ceremony             │  ← CONFLICT!
│  6:30 PM - 7:30 PM              │
│  "Clashes with Maghrib (6:45)"  │
└─────────────────────────────────┘
```

---

## Suggested Event Presets
Quick-add buttons for common wedding events:
- Guests Arrive
- Nikkah Ceremony
- Photography Session
- Food Service
- Cake Cutting
- Speeches/Toasts
- Entertainment
- Guest Departure

---

## Future Enhancements (Not MVP)
- Drag-and-drop reordering
- Export timeline as PDF
- Share timeline link
- Venue timezone handling
- Sunrise/Sunset display
- Jummah Friday special handling
