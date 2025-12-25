import { PrayerTimeCalculator, calculateSunnahTimes } from '@masaajid/prayer-times';
import type { MethodCode, SunnahTimes, CurrentPrayerInfo } from '@masaajid/prayer-times';

export interface PrayerTimesData {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  sunset: Date; // Aligns with maghrib to power sunrise/sunset displays
  isha: Date;
  currentPrayer: string | null;
  nextPrayer: string | null;
}

export interface SunnahTimesData {
  duhaStart: Date;
  duhaEnd: Date;
  middleOfNight: Date;
  lastThirdOfNight: Date;
  firstThirdOfNight: Date;
}

export interface CalculationMethodOption {
  name: string;
  method: MethodCode;
}

export const calculationMethods: CalculationMethodOption[] = [
  { name: 'Muslim World League', method: 'MWL' },
  { name: 'Islamic Society of North America', method: 'ISNA' },
  { name: 'Egyptian General Authority', method: 'Egypt' },
  { name: 'Umm al-Qura University, Makkah', method: 'UmmAlQura' },
  { name: 'University of Islamic Sciences, Karachi', method: 'Karachi' },
  { name: 'Qatar Calendar House', method: 'Qatar' },
  { name: 'Moonsighting Committee Worldwide', method: 'Moonsighting' },
  { name: 'Dubai', method: 'Dubai' },
  { name: 'Singapore', method: 'Singapore' },
  { name: 'Turkey', method: 'Turkey' },
  { name: 'Tehran', method: 'Tehran' },
  { name: 'Jafari', method: 'Jafari' },
  { name: 'Russia', method: 'Russia' },
  { name: 'JAKIM (Malaysia)', method: 'JAKIM' },
  { name: 'Kemenag (Indonesia)', method: 'Kemenag' },
];

// Optional timezone override (IANA). When set, all calculations and formatting
// will use this timezone instead of the device timezone.
let overrideTimezone: string | undefined;
export function setCalculationTimezone(tz?: string) {
  overrideTimezone = tz || undefined;
}

export function getPrayerTimes(
  lat: number,
  lng: number,
  date: Date,
  methodName: string = 'Muslim World League',
  madhabName: string = 'Shafi'
): PrayerTimesData {
  try {
    // Normalize method and madhab to supported values
    const methodOption = calculationMethods.find(m => m.name === methodName);
    const method = methodOption ? methodOption.method : 'MWL';
    const normalizedMadhab = madhabName?.toLowerCase().includes('hanafi') ? 'Hanafi' : 'Shafi';

    // Create calculator with location and method
    const calculator = new PrayerTimeCalculator({
      method,
      asrSchool: normalizedMadhab === 'Hanafi' ? 'Hanafi' : 'Standard',
      location: [lat, lng],
      timezone: overrideTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    // Calculate prayer times for the given coordinates and date
    const prayerTimes = calculator.calculate(date);

    // Get current prayer info
    const currentPrayerInfo = calculator.getCurrentPrayer();

    return {
      fajr: prayerTimes.fajr,
      sunrise: prayerTimes.sunrise,
      dhuhr: prayerTimes.dhuhr,
      asr: prayerTimes.asr,
      maghrib: prayerTimes.maghrib,
      sunset: prayerTimes.maghrib, // Library does not expose separate sunset; use maghrib
      isha: prayerTimes.isha,
      currentPrayer: currentPrayerInfo?.current || null,
      nextPrayer: currentPrayerInfo?.next || null,
    };
  } catch (error) {
    console.error('Error calculating prayer times:', error);
    // Return fallback prayer times
    const now = new Date();
    return {
      fajr: new Date(now.setHours(5, 0, 0, 0)),
      sunrise: new Date(now.setHours(6, 30, 0, 0)),
      dhuhr: new Date(now.setHours(12, 0, 0, 0)),
      asr: new Date(now.setHours(15, 30, 0, 0)),
      maghrib: new Date(now.setHours(18, 0, 0, 0)),
      sunset: new Date(now.setHours(18, 0, 0, 0)),
      isha: new Date(now.setHours(19, 30, 0, 0)),
      currentPrayer: null,
      nextPrayer: null,
    };
  }
}

export function getSunnahTimes(
  lat: number,
  lng: number,
  date: Date,
  methodName: string = 'Muslim World League'
): SunnahTimesData | null {
  try {
    const methodOption = calculationMethods.find(m => m.name === methodName);
    const method = methodOption ? methodOption.method : 'MWL';
    const timezone = overrideTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    // Helper to normalize string times (HH:MM) into Date objects on the correct day
    const toDate = (t: string | Date): Date => {
      if (t instanceof Date) return t;
      const [h, m] = t.split(':').map(Number);
      const d = new Date(dateOnly);
      d.setHours(h, m, 0, 0);
      // Times after midnight (e.g., 01:15) belong to the following Gregorian date
      if (h < 12 && d.getTime() < dateOnly.getTime()) {
        d.setDate(d.getDate() + 1);
      }
      return d;
    };

    const sunnahTimes = calculateSunnahTimes({
      method,
      location: [lat, lng],
      timezone,
      date: dateOnly,
    });

    return {
      duhaStart: toDate(sunnahTimes.duhaStart),
      duhaEnd: toDate(sunnahTimes.duhaEnd),
      middleOfNight: toDate(sunnahTimes.middleOfNight),
      lastThirdOfNight: toDate(sunnahTimes.lastThirdOfNight),
      firstThirdOfNight: toDate(sunnahTimes.firstThirdOfNight),
    };
  } catch (error) {
    console.error('Error getting Sunnah times:', error);
    return null;
  }
}

export function calculateTahajjud(ishaTime: Date, nextFajrTime: Date): { start: Date; end: Date } {
  // Calculate the night duration
  const nightDuration = nextFajrTime.getTime() - ishaTime.getTime();
  
  // Calculate one third of the night
  const oneThird = nightDuration / 3;
  
  // Tahajjud starts at: Fajr - (oneThird)
  const tahajjudStart = new Date(nextFajrTime.getTime() - oneThird);
  
  // Tahajjud ends at: Fajr
  const tahajjudEnd = nextFajrTime;
  
  return {
    start: tahajjudStart,
    end: tahajjudEnd,
  };
}

export function getTimeUntilNextPrayer(prayerTimes: PrayerTimesData): { prayer: string; timeLeft: number } | null {
  const now = new Date();
  const prayers = [
    { name: 'Fajr', time: prayerTimes.fajr },
    { name: 'Dhuhr', time: prayerTimes.dhuhr },
    { name: 'Asr', time: prayerTimes.asr },
    { name: 'Maghrib', time: prayerTimes.maghrib },
    { name: 'Isha', time: prayerTimes.isha },
  ];

  for (const prayer of prayers) {
    if (prayer.time > now) {
      const timeLeft = prayer.time.getTime() - now.getTime();
      return { prayer: prayer.name, timeLeft };
    }
  }

  // If no prayer left today, return tomorrow's Fajr
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowPrayers = getPrayerTimes(0, 0, tomorrow); // Will be recalculated with actual coordinates
  
  return null;
}

export function formatPrayerTime(date: Date, use12Hour: boolean = true): string {
  if (!date) return '--:--';
  
  if (use12Hour) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: overrideTimezone || undefined,
    });
  } else {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: overrideTimezone || undefined,
    });
  }
}

// ============================================================================
// CLEAN PROHIBITION & WINDOW LOGIC
// ============================================================================

// Prohibition buffers (in minutes)
const BUFFERS = {
  afterFajr: 15,      // Fajr + 15 min → Sunrise
  zenith: 5,          // SolarNoon ± 5 min
  afterAsr: 30,       // Asr + 30 min → Sunset
};

interface ProhibitedInterval {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Core Logic: Prayer windows that end at the earliest prohibition start or next prayer.
 * windowEnd = MIN(nextPrayerStart, nextProhibitionStartAfter(windowStart))
 * 
 * Classical Prohibited Times (3 intervals - per Islamic Fiqh):
 * 1. After Fajr until Sunrise
 * 2. Sun at Zenith (briefly before Dhuhr)
 * 3. After Asr until Sunset
 */
export function getProhibitedIntervalsClean(
  lat: number,
  lng: number,
  date: Date,
  methodName: string = 'Muslim World League',
  madhabName: string = 'Shafi'
): ProhibitedInterval[] {
  const times = getPrayerTimes(lat, lng, date, methodName, madhabName);

  const intervals: ProhibitedInterval[] = [];

  // 1) After Fajr prohibition: Fajr + buffer → Sunrise
  intervals.push({
    start: new Date(times.fajr.getTime() + BUFFERS.afterFajr * 60000),
    end: times.sunrise,
    label: 'After Fajr: no voluntary prayers until sunrise',
  });

  // 2) Zenith prohibition: Brief window BEFORE Dhuhr (not extending into Dhuhr prayer)
  // SolarNoon ± buffer, but END at Dhuhr start (don't overlap prayer time)
  intervals.push({
    start: new Date(times.dhuhr.getTime() - BUFFERS.zenith * 60000),
    end: times.dhuhr, // End exactly at Dhuhr start, not after
    label: 'Sun at zenith: no voluntary prayers',
  });

  // 3) After Asr prohibition: Asr + buffer → Sunset
  intervals.push({
    start: new Date(times.asr.getTime() + BUFFERS.afterAsr * 60000),
    end: times.maghrib, // Maghrib marks sunset
    label: 'After Asr: no voluntary prayers until sunset',
  });

  return intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Get prohibition status at a given time
 */
export function getProhibitedTimeInfoClean(
  lat: number,
  lng: number,
  date: Date,
  methodName: string = 'Muslim World League',
  madhabName: string = 'Shafi'
): { isProhibited: boolean; label?: string; endsAt?: Date } {
  const intervals = getProhibitedIntervalsClean(lat, lng, date, methodName, madhabName);
  
  const activeInterval = intervals.find(i => date >= i.start && date < i.end);
  
  if (activeInterval) {
    return {
      isProhibited: true,
      label: activeInterval.label,
      endsAt: activeInterval.end,
    };
  }

  return { isProhibited: false };
}

// Returns precise start/end for each prayer based on astronomical rules
export function getPrayerWindows(
  lat: number,
  lng: number,
  date: Date,
  methodName: string = 'Muslim World League',
  madhabName: string = 'Shafi',
  ishaEndsAt: 'Fajr' | 'Midnight' = 'Fajr'
): Record<string, { start: Date; end: Date }> {
  const today = getPrayerTimes(lat, lng, date, methodName, madhabName);

  // Compute tomorrow Fajr for Isha end if needed
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = getPrayerTimes(lat, lng, tomorrow, methodName, madhabName);

  // Middle of night using Sunnah calculator (half of night between Maghrib and Fajr)
  const sunnah = getSunnahTimes(lat, lng, date, methodName);
  const midnight = sunnah?.middleOfNight ?? new Date((today.maghrib.getTime() + tomorrowTimes.fajr.getTime()) / 2);

  return {
    Fajr: {
      start: today.fajr,
      end: today.sunrise,
    },
    Dhuhr: {
      start: today.dhuhr,
      end: today.asr,
    },
    Asr: {
      start: today.asr,
      end: today.maghrib,
    },
    Maghrib: {
      start: today.maghrib,
      end: today.isha,
    },
    Isha: {
      start: today.isha,
      end: ishaEndsAt === 'Fajr' ? tomorrowTimes.fajr : midnight,
    },
  };
}

// Returns current prayer window and its precise end time
export function getCurrentPrayerWindowInfo(
  lat: number,
  lng: number,
  now: Date,
  methodName: string = 'Muslim World League',
  madhabName: string = 'Shafi',
  ishaEndsAt: 'Fajr' | 'Midnight' = 'Fajr'
): { name: string; start: Date; end: Date } | null {
  const windows = getPrayerWindows(lat, lng, now, methodName, madhabName, ishaEndsAt);
  const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

  for (const name of order) {
    const w = windows[name];
    if (now >= w.start && now < w.end) return { name, start: w.start, end: w.end };
  }

  // If after Isha end but before Fajr (rare due to choice), treat as Isha period
  const isha = windows['Isha'];
  if (now < windows['Fajr'].start) return { name: 'Isha', start: isha.start, end: isha.end };

  return null;
}

// Prohibited times per provided guidance
export function getProhibitedTimeInfo(
  lat: number,
  lng: number,
  date: Date,
  methodName: string = 'Muslim World League',
  madhabName: string = 'Shafi'
): { isProhibited: boolean; label?: string; endsAt?: Date } {
  const times = getPrayerTimes(lat, lng, date, methodName, madhabName);
  const sunrise = times.sunrise;
  const sunset = times.maghrib; // Maghrib (sunset prayer time)
  const dhuhr = times.dhuhr;
  const isha = times.isha;

  // Buffers based on guidance
  const sunriseBufferMinutes = 15; // 10-20 minutes after actual sunrise
  const zenithBufferMinutes = 5;   // few minutes immediately before Dhuhr

  const afterSunriseEnd = new Date(sunrise.getTime() + sunriseBufferMinutes * 60000);
  // Model zenith prohibition as a short window ending exactly at Dhuhr start
  const zenithEnd = dhuhr;
  const zenithStart = new Date(zenithEnd.getTime() - zenithBufferMinutes * 60000);
  
  // After Asr prohibition: starts when Asr window ends (at Maghrib) until sun is fully set
  const sunsetProhibitionEnd = new Date(isha.getTime() + 15 * 60000);

  // 1) Sunrise prohibition: from sunrise until ~15 minutes after sunrise
  if (date >= sunrise && date < afterSunriseEnd) {
    return {
      isProhibited: true,
      label: 'Prohibited: Sunrise period (no voluntary prayers).',
      endsAt: afterSunriseEnd,
    };
  }

  // 2) Zenith (midday) prohibition: brief minutes immediately before Dhuhr
  if (date >= zenithStart && date < zenithEnd) {
    return {
      isProhibited: true,
      label: 'Prohibited: Sun at zenith (midday).',
      endsAt: zenithEnd,
    };
  }

  // 3) After Asr until sunset: no voluntary prayers (starts after Asr window ends at Maghrib)
  if (date >= sunset && date < sunsetProhibitionEnd) {
    return {
      isProhibited: true,
      label: 'Prohibited: After sunset (no voluntary prayers).',
      endsAt: sunsetProhibitionEnd,
    };
  }

  return { isProhibited: false };
}

// List all prohibited intervals - use the clean version instead
export const getProhibitedIntervals = getProhibitedIntervalsClean;

// Compute adjusted end for the current prayer window considering prohibitions
export function getAdjustedCurrentPrayerCountdown(
  lat: number,
  lng: number,
  now: Date,
  methodName: string = 'Muslim World League',
  madhabName: string = 'Shafi',
  ishaEndsAt: 'Fajr' | 'Midnight' = 'Fajr'
): {
  name: string;
  start: Date;
  naturalEnd: Date;
  adjustedEnd?: Date;
  isProhibitedNow: boolean;
  resumeAt?: Date;
  countdownMs?: number;
} | null {
  const info = getCurrentPrayerWindowInfo(lat, lng, now, methodName, madhabName, ishaEndsAt);
  if (!info) return null;

  const prohibited = getProhibitedIntervals(lat, lng, now, methodName, madhabName)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // Check if currently inside any prohibited interval
  const currentProhibition = prohibited.find(p => now >= p.start && now < p.end);
  if (currentProhibition) {
    return {
      name: info.name,
      start: info.start,
      naturalEnd: info.end,
      isProhibitedNow: true,
      resumeAt: currentProhibition.end,
      countdownMs: currentProhibition.end.getTime() - now.getTime(),
    };
  }

  // Find earliest prohibition that starts after now
  const upcomingProhibition = prohibited.find(p => p.start > now);
  const naturalEnd = info.end;
  const adjustedEnd = upcomingProhibition && upcomingProhibition.start < naturalEnd
    ? upcomingProhibition.start
    : naturalEnd;

  const countdownMs = adjustedEnd.getTime() - now.getTime();
  return {
    name: info.name,
    start: info.start,
    naturalEnd,
    adjustedEnd,
    isProhibitedNow: false,
    countdownMs,
  };
}
