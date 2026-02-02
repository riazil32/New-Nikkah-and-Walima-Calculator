import { useState, useCallback } from 'react';
import { PrayerTime } from '../types';

interface AladhanResponse {
  code: number;
  status: string;
  data: {
    timings: {
      Fajr: string;
      Sunrise: string;
      Dhuhr: string;
      Asr: string;
      Maghrib: string;
      Isha: string;
      [key: string]: string;
    };
    date: {
      readable: string;
      hijri: {
        date: string;
        month: { en: string };
        year: string;
      };
    };
    meta: {
      latitude: number;
      longitude: number;
      timezone: string;
      method: {
        id: number;
        name: string;
      };
      school: string;
    };
  };
}

export interface LocationInfo {
  latitude: number;
  longitude: number;
  timezone: string;
  method: string;
  school: string;
}

interface UsePrayerTimesResult {
  prayerTimes: PrayerTime[];
  sunrise: string; // Sunrise time (Fajr deadline)
  hijriDate: string;
  locationInfo: LocationInfo | null;
  loading: boolean;
  error: string | null;
  fetchPrayerTimes: (city: string, country: string, date: string, method?: number, school?: number) => Promise<void>;
}

// Prayer names we care about for weddings (including Fajr for early events)
const RELEVANT_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// Check if a date is a Friday (for Jummah)
const isFriday = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date.getDay() === 5; // 0 = Sunday, 5 = Friday
};

// Format time from 24h to 12h format
const formatTime = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const usePrayerTimes = (): UsePrayerTimesResult => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [sunrise, setSunrise] = useState<string>('');
  const [hijriDate, setHijriDate] = useState<string>('');
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrayerTimes = useCallback(async (
    city: string,
    country: string,
    date: string, // YYYY-MM-DD format
    method: number = 3, // Default to Muslim World League
    school: number = 0 // 0 = Standard (Shafi/Maliki/Hanbali), 1 = Hanafi
  ) => {
    if (!city || !country || !date) {
      setError('Please provide city, country, and date');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert date from YYYY-MM-DD to DD-MM-YYYY for API
      const [year, month, day] = date.split('-');
      const apiDate = `${day}-${month}-${year}`;

      // Date must be in the URL path, not as a query parameter
      // school parameter: 0 = Shafi (standard), 1 = Hanafi
      const url = `https://api.aladhan.com/v1/timingsByCity/${apiDate}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}&school=${school}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch prayer times');
      }

      const data: AladhanResponse = await response.json();

      if (data.code !== 200) {
        throw new Error('Invalid response from prayer times API');
      }

      // Check if it's Friday (Jummah replaces Dhuhr)
      const isJummahDay = isFriday(date);

      // Extract relevant prayer times
      const times: PrayerTime[] = RELEVANT_PRAYERS.map(prayer => ({
        // On Friday, rename Dhuhr to Jummah
        name: prayer === 'Dhuhr' && isJummahDay ? 'Jummah' : prayer,
        time: data.data.timings[prayer].split(' ')[0], // Remove timezone if present
        type: 'fixed' as const
      }));

      setPrayerTimes(times);
      
      // Store sunrise time (Fajr deadline)
      setSunrise(data.data.timings.Sunrise.split(' ')[0]);
      
      // Set Hijri date
      const hijri = data.data.date.hijri;
      setHijriDate(`${hijri.date} ${hijri.month.en} ${hijri.year} AH`);

      // Set location info (so users can verify the resolved location)
      const meta = data.data.meta;
      setLocationInfo({
        latitude: meta.latitude,
        longitude: meta.longitude,
        timezone: meta.timezone,
        method: meta.method.name,
        school: meta.school === 'HANAFI' ? 'Hanafi' : 'Standard (Shafi\'i/Maliki/Hanbali)'
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prayer times. Please check the city and country.');
      setPrayerTimes([]);
      setSunrise('');
      setLocationInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    prayerTimes,
    sunrise,
    hijriDate,
    locationInfo,
    loading,
    error,
    fetchPrayerTimes
  };
};
