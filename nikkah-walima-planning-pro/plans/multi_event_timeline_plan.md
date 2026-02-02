# Phase 2A: Multi-Event Timeline Implementation Plan

## Overview
Transform the single-timeline system to support multiple events (Nikkah, Walima, Mehndi, etc.) with shared configuration from Guest Manager.

## Key Changes

### 1. Shared Event Configuration
- Read enabled events from `guest-manager-data` localStorage (same source as Guest Manager)
- Timeline tabs will match Guest Manager tabs automatically
- User configures events in ONE place (Guest Manager settings)

### 2. Data Structure Migration
- Old: Single `TimelineData` with one date/events array
- New: `TimelineData` with `eventTimelines` object keyed by eventId
- Auto-migrate existing data to first enabled event

### 3. UI Changes
- Add event selector tabs at top (matching Guest Manager style)
- Each tab shows its own date picker and timeline
- Prayer times recalculate per event's date

### 4. Prayer Conflict Logic Updates
- Change from "Hard Block" (red) to "Warning" (yellow)
- Show deadline: "Ensure you pray before [Next Prayer] ([Time])"
- **Fajr Exception**: Deadline is Sunrise, not Dhuhr
- **Jummah Exception**: Keep as HIGH PRIORITY warning (cannot delay)

### 5. Timeline Templates
- "Load Template" button when timeline is empty
- Afternoon Nikkah preset
- Evening Walima preset
- Templates auto-adjust times based on selected start hour

## Implementation Order
1. ✅ Update types.ts with new data structures
2. ✅ Update usePrayerTimes.ts to include Sunrise
3. [ ] Refactor TimelinePlanner.tsx:
   a. Add shared events config reader
   b. Add event tabs UI
   c. Update data handling for multi-event
   d. Update conflict logic with warnings
   e. Add template loading
4. [ ] Test migration of existing data
5. [ ] Commit and deploy

## Files to Modify
- `types.ts` ✅
- `hooks/usePrayerTimes.ts` ✅
- `components/TimelinePlanner.tsx` (major refactor)
