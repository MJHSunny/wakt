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
      dhuhr: prayerTimes.dhuhr, // Library returns time when sun has PASSED zenith
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
  // 20-minute buffer before Fajr to allow user preparation time
  const fajrPreparationBuffer = 20 * 60 * 1000; // 20 minutes in milliseconds
  const adjustedFajrTime = new Date(nextFajrTime.getTime() - fajrPreparationBuffer);
  
  // Calculate the night duration
  const nightDuration = adjustedFajrTime.getTime() - ishaTime.getTime();
  
  // Calculate one third of the night
  const oneThird = nightDuration / 3;
  
  // Tahajjud starts at: (Fajr - 20 min) - (oneThird)
  const tahajjudStart = new Date(adjustedFajrTime.getTime() - oneThird);
  
  // Tahajjud ends at: Fajr - 20 min (to give time to prepare for Fajr)
  const tahajjudEnd = adjustedFajrTime;
  
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
// CLEAN PROHIBITION & WINDOW LOGIC (Refined per Islamic Fiqh)
// ============================================================================

/**
 * Prayer Buffers Configuration (in minutes)
 * 
 * Buffers account for refraction, terrain, and safety margins.
 * These ensure astronomical anchors are safely interpreted per Sunnah.
 */
export interface PrayerBuffers {
  riseBuffer: number;     // After sunrise until sun clearly risen (12–15 min)
  setBuffer: number;      // Before sunset until start of setting (3–6 min)
  zenithBuffer: number;   // Around solar noon (2–5 min)
  maghribBuffer: number;  // After sunset to ensure full disk down (1–2 min)
}

/**
 * Default buffer values based on common fiqh practice
 */
export const defaultBuffers: PrayerBuffers = {
  riseBuffer: 15,        // Sun clearly risen after 15 min
  setBuffer: 5,          // Sun starts setting 5 min before official sunset
  zenithBuffer: 3,       // Solar noon ± 3 min
  maghribBuffer: 2,      // Sun fully down 2 min after official sunset
};

/**
 * Calculate dynamic sunrise/sunset buffers based on latitude, date, and season
 * 
 * The duration of sunrise/sunset varies with:
 * - Latitude: Higher latitudes have longer twilight
 * - Season: Sun's angle affects rise/set speed
 * - Solar declination: Changes throughout the year
 * 
 * @param lat Latitude in degrees
 * @param date Date for calculation
 * @returns Dynamic buffers adjusted for location and season
 */
export function calculateDynamicBuffers(lat: number, date: Date): PrayerBuffers {
  const absLat = Math.abs(lat);
  
  // Calculate day of year for seasonal adjustment
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  
  // Solar declination approximation (degrees)
  // Ranges from -23.45° (winter solstice) to +23.45° (summer solstice)
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);
  
  // Calculate sun's angular velocity at horizon
  // Higher latitudes and extreme declinations = slower rise/set
  const latRad = lat * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  
  // Effective angle: combination of latitude and seasonal effects
  const effectiveAngle = Math.abs(latRad - decRad);
  
  // Base calculations for rise/set duration
  // Formula: duration increases with latitude and seasonal extremes
  const latitudeFactor = 1 + (absLat / 90) * 0.8; // 1.0 at equator, 1.8 at poles
  const seasonalFactor = 1 + Math.abs(declination / 23.45) * 0.3; // 1.0 at equinoxes, 1.3 at solstices
  
  // Calculate dynamic buffers
  const baseRiseBuffer = 12; // Base duration in minutes
  const riseBuffer = Math.round(baseRiseBuffer * latitudeFactor * seasonalFactor);
  
  const baseSetBuffer = 3;
  const setBuffer = Math.round(baseSetBuffer * latitudeFactor * seasonalFactor);
  
  // Zenith buffer: affected by sun's altitude at noon
  // IMPORTANT: Higher sun = flatter trajectory = LONGER zenith period
  // In summer: sun is high = longer buffer needed
  // In winter: sun is low = shorter buffer needed
  const sunHeightFactor = Math.cos(effectiveAngle); // Higher = sun is higher at noon
  const baseZenithBuffer = 2;
  // Direct relationship: higher sun = longer buffer (flatter trajectory)
  const zenithBuffer = Math.max(2, Math.round(baseZenithBuffer + sunHeightFactor * 3 + absLat / 30));
  
  // Maghrib buffer: also affected by sun's angle during sunset
  // Twilight duration varies with latitude and season
  // Higher latitude + summer = longer twilight = longer buffer
  const maghribBuffer = Math.max(1, Math.round(1 + latitudeFactor * seasonalFactor + absLat / 45));
  
  return {
    riseBuffer: Math.min(20, Math.max(10, riseBuffer)), // Clamp between 10-20 min
    setBuffer: Math.min(8, Math.max(2, setBuffer)),     // Clamp between 2-8 min
    zenithBuffer: Math.min(7, Math.max(2, zenithBuffer)), // Clamp between 2-7 min
    maghribBuffer: Math.min(3, Math.max(1, maghribBuffer)), // Clamp between 1-3 min
  };
}

interface ProhibitedInterval {
  start: Date;
  end: Date;
  label: string;
  type: 'SUNRISE' | 'ZENITH' | 'SUNSET';
}

/**
 * Get Strict Forbidden Intervals (no ṣalāh at all)
 * 
 * Per hadith, prayer is forbidden at 3 times:
 * 1. While sun is rising (sunrise + riseBuffer)
 * 2. While at zenith (solar noon ± zenithBuffer)
 * 3. While setting (sunset - setBuffer to sunset + maghribBuffer)
 * 
 * @param lat Latitude
 * @param lng Longitude
 * @param date Date to calculate for
 * @param methodName Prayer calculation method
 * @param madhabName Madhab (Shafi or Hanafi)
 * @param buffers Custom buffer values (optional, auto-calculates based on location/date if not provided)
 * @returns Array of strict forbidden intervals
 */
export function getStrictForbiddenIntervals(
  lat: number,
  lng: number,
  date: Date,
  methodName: string = 'Muslim World League',
  madhabName: string = 'Shafi',
  buffers?: PrayerBuffers
): ProhibitedInterval[] {
  const times = getPrayerTimes(lat, lng, date, methodName, madhabName);
  
  // Use dynamic buffers if not provided
  const actualBuffers = buffers || calculateDynamicBuffers(lat, date);

  const intervals: ProhibitedInterval[] = [];

  // 1) SUNRISE FORBIDDEN: [sunrise, sunrise + riseBuffer)
  // Sun is rising → until it has risen high
  intervals.push({
    start: times.sunrise,
    end: new Date(times.sunrise.getTime() + actualBuffers.riseBuffer * 60000),
    label: 'Sunrise: sun is rising (no prayer)',
    type: 'SUNRISE',
  });

  // 2) ZENITH FORBIDDEN: [dhuhr - zenithBuffer, dhuhr)
  // Sun at zenith BEFORE Dhuhr starts (not centered around it)
  // Dhuhr time from library = when sun has PASSED zenith (prayer can start)
  // Forbidden period is BEFORE this time
  intervals.push({
    start: new Date(times.dhuhr.getTime() - actualBuffers.zenithBuffer * 60000),
    end: times.dhuhr, // Forbidden period ENDS when Dhuhr prayer starts
    label: 'Zenith: sun at noon (no prayer)',
    type: 'ZENITH',
  });

  // 3) SUNSET FORBIDDEN: [sunset - setBuffer, sunset)
  // Sun is setting → until it fully sets
  // Using times.sunset (which equals times.maghrib from library)
  intervals.push({
    start: new Date(times.sunset.getTime() - actualBuffers.setBuffer * 60000),
    end: times.sunset, // Forbidden period ENDS when sun has fully set
    label: 'Sunset: sun is setting (no prayer)',
    type: 'SUNSET',
  });

  return intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Get No-Voluntary (Nafl) Windows per Sunnah
 * 
 * Voluntary prayers are forbidden:
 * - After Fajr until sunrise
 * - After Asr until sunset
 * 
 * But obligatory (Farḍ) prayers are allowed.
 * 
 * @param lat Latitude
 * @param lng Longitude
 * @param date Date to calculate for
 * @param methodName Prayer calculation method
 * @param madhabName Madhab (Shafi or Hanafi)
 * @returns Object with afterFajr and afterAsr no-nafl windows
 */
export function getNoNaflWindows(
  lat: number,
  lng: number,
  date: Date,
  methodName: string = 'Muslim World League',
  madhabName: string = 'Shafi'
): { afterFajr: { start: Date; end: Date }; afterAsr: { start: Date; end: Date } } {
  const times = getPrayerTimes(lat, lng, date, methodName, madhabName);

  return {
    afterFajr: {
      start: times.fajr,
      end: times.sunrise,
    },
    afterAsr: {
      start: times.asr,
      end: times.sunset,
    },
  };
}

/**
 * Classify prayer status at a given time
 * 
 * Returns one of:
 * - STRICT_FORBIDDEN: No prayer at all (sunrise, zenith, sunset forbidden windows)
 * - NO_NAFL_ONLY_FARD: Voluntary prayers forbidden (after Fajr, after Asr)
 * - ALL_ALLOWED: All prayers allowed
 * 
 * @param lat Latitude
 * @param lng Longitude
 * @param time Time to check
 * @param methodName Prayer calculation method
 * @param madhabName Madhab (Shafi or Hanafi)
 * @param buffers Custom buffer values (optional)
 * @returns Object with status and details
 */
export function getPrayerStatus(
  lat: number,
  lng: number,
  time: Date,
  methodName: string = 'Muslim World League',
  madhabName: string = 'Shafi',
  buffers?: PrayerBuffers
): {
  status: 'STRICT_FORBIDDEN' | 'NO_NAFL_ONLY_FARD' | 'ALL_ALLOWED';
  label: string;
  endsAt?: Date;
} {
  // Check strict forbidden windows first
  const strictForbidden = getStrictForbiddenIntervals(lat, lng, time, methodName, madhabName, buffers);
  const activeStrict = strictForbidden.find(i => time >= i.start && time < i.end);

  if (activeStrict) {
    return {
      status: 'STRICT_FORBIDDEN',
      label: activeStrict.label,
      endsAt: activeStrict.end,
    };
  }

  // Check no-nafl windows
  const noNafl = getNoNaflWindows(lat, lng, time, methodName, madhabName);
  const inAfterFajr = time >= noNafl.afterFajr.start && time < noNafl.afterFajr.end;
  const inAfterAsr = time >= noNafl.afterAsr.start && time < noNafl.afterAsr.end;

  if (inAfterFajr) {
    return {
      status: 'NO_NAFL_ONLY_FARD',
      label: 'No voluntary prayers: Fajr has been performed (farḍ allowed)',
      endsAt: noNafl.afterFajr.end,
    };
  }

  if (inAfterAsr) {
    return {
      status: 'NO_NAFL_ONLY_FARD',
      label: 'No voluntary prayers: Asr has been performed (farḍ allowed)',
      endsAt: noNafl.afterAsr.end,
    };
  }

  return {
    status: 'ALL_ALLOWED',
    label: 'All prayers allowed',
  };
}

/**
 * Get Prayer Windows with Precise Start/End Times
 * 
 * Windows are defined by Sunnah and astronomical anchors:
 * 
 * - FajrWindow = [fajr, sunrise)
 * - DhuhrWindow = [dhuhr + zenithBuffer, asr)  // ensures sun has declined
 * - AsrWindow = [asr, sunset - setBuffer)      // ensures sun hasn't started setting
 * - MaghribWindow = [sunset + maghribBuffer, isha)  // ensures sun fully down
 * - IshaWindow = [isha, nextDay.fajr) or [isha, midnight]
 * 
 * @param lat Latitude
 * @param lng Longitude
 * @param date Date to calculate for
 * @param methodName Prayer calculation method
 * @param madhabName Madhab (Shafi or Hanafi)
 * @param ishaEndsAt Whether Isha ends at Fajr or Midnight
 * @param buffers Custom buffer values (optional)
 * @returns Record of prayer windows
 */
export function getPrayerWindows(
  lat: number,
  lng: number,
  date: Date,
  methodName: string = 'Muslim World League',
  madhabName: string = 'Shafi',
  ishaEndsAt: 'Fajr' | 'Midnight' = 'Fajr',
  buffers?: PrayerBuffers
): Record<string, { start: Date; end: Date }> {
  const today = getPrayerTimes(lat, lng, date, methodName, madhabName);
  const actualBuffers = buffers || calculateDynamicBuffers(lat, date);

  // Compute tomorrow Fajr for Isha end
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = getPrayerTimes(lat, lng, tomorrow, methodName, madhabName);

  // Middle of night using Sunnah calculator
  const sunnah = getSunnahTimes(lat, lng, date, methodName);
  const midnight = sunnah?.middleOfNight ?? new Date((today.maghrib.getTime() + tomorrowTimes.fajr.getTime()) / 2);

  return {
    Fajr: {
      start: today.fajr,
      end: today.sunrise,
    },
    Dhuhr: {
      // Dhuhr starts when sun has passed zenith (library value is correct)
      start: today.dhuhr,
      end: today.asr,
    },
    Asr: {
      start: today.asr,
      // Asr ends before sun starts setting (apply setBuffer safety margin)
      end: new Date(today.sunset.getTime() - actualBuffers.setBuffer * 60000),
    },
    Maghrib: {
      // Maghrib starts exactly when sun has fully set (at sunset time)
      start: today.sunset,
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
  ishaEndsAt: 'Fajr' | 'Midnight' = 'Fajr',
  buffers?: PrayerBuffers
): { name: string; start: Date; end: Date } | null {
  const windows = getPrayerWindows(lat, lng, now, methodName, madhabName, ishaEndsAt, buffers);
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

/**
 * DEPRECATED: Use getPrayerStatus() instead
 * 
 * Get prohibition status at a given time (legacy version)
 */
export function getProhibitedTimeInfoClean(
  lat: number,
  lng: number,
  date: Date,
  methodName: string = 'Muslim World League',
  madhabName: string = 'Shafi',
  buffers?: PrayerBuffers
): { isProhibited: boolean; label?: string; endsAt?: Date } {
  const status = getPrayerStatus(lat, lng, date, methodName, madhabName, buffers);
  
  // For backward compatibility: return isProhibited = true if STRICT_FORBIDDEN or NO_NAFL_ONLY_FARD
  const isProhibited = status.status !== 'ALL_ALLOWED';
  
  return {
    isProhibited,
    label: status.label,
    endsAt: status.endsAt,
  };
}

/**
 * Legacy function - use getStrictForbiddenIntervals() instead
 */
export const getProhibitedIntervals = (
  lat: number,
  lng: number,
  date: Date,
  methodName: string = 'Muslim World League',
  madhabName: string = 'Shafi',
  buffers?: PrayerBuffers
) => getStrictForbiddenIntervals(lat, lng, date, methodName, madhabName, buffers);

/**
 * Compute adjusted countdown for current prayer window
 * 
 * Returns the countdown to when the current prayer window ends,
 * accounting for upcoming strict forbidden windows that may cut it short.
 * 
 * @param lat Latitude
 * @param lng Longitude
 * @param now Current time
 * @param methodName Prayer calculation method
 * @param madhabName Madhab (Shafi or Hanafi)
 * @param ishaEndsAt Whether Isha ends at Fajr or Midnight
 * @param buffers Custom buffer values (optional)
 * @returns Countdown info or null if outside prayer window
 */
export function getAdjustedCurrentPrayerCountdown(
  lat: number,
  lng: number,
  now: Date,
  methodName: string = 'Muslim World League',
  madhabName: string = 'Shafi',
  ishaEndsAt: 'Fajr' | 'Midnight' = 'Fajr',
  buffers?: PrayerBuffers
): {
  name: string;
  start: Date;
  naturalEnd: Date;
  adjustedEnd?: Date;
  isProhibitedNow: boolean;
  resumeAt?: Date;
  countdownMs?: number;
} | null {
  const info = getCurrentPrayerWindowInfo(lat, lng, now, methodName, madhabName, ishaEndsAt, buffers);
  if (!info) return null;

  const strictForbidden = getStrictForbiddenIntervals(lat, lng, now, methodName, madhabName, buffers)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // Check if currently inside any strict forbidden interval
  const currentProhibition = strictForbidden.find(p => now >= p.start && now < p.end);
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

  // Find earliest strict forbidden window that starts after now
  const upcomingProhibition = strictForbidden.find(p => p.start > now);
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
