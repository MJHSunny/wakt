import React, { useState, useEffect, useCallback } from 'react';
import { Clock, MapPin, Compass, Calendar, Sunrise, Sunset, Moon, Sun, CloudRain, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTimeFormat } from '../context/TimeFormatContext';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { formatPrayerTime, getCurrentPrayerWindowInfo, getPrayerWindows, getPrayerStatus, getAdjustedCurrentPrayerCountdown, getPrayerTimes, calculateTahajjud } from '../../services/prayerService';
import { getHijriCalendarService } from '../../services/hijriCalendarService';
import { setStatusBarTheme } from '../services/statusBarTheme';

// Convert a two-letter country code (or common country name) to its emoji flag; returns empty string if invalid
const countryCodeToFlag = (input?: string) => {
  if (!input) return '';
  const trimmed = input.trim();

  // Quick map for common country names → codes
  const nameToCode: Record<string, string> = {
    'united states': 'US',
    'united kingdom': 'GB',
    'great britain': 'GB',
    'saudi arabia': 'SA',
    'united arab emirates': 'AE',
    'uae': 'AE',
    'qatar': 'QA',
    'kuwait': 'KW',
    'oman': 'OM',
    'bahrain': 'BH',
    'pakistan': 'PK',
    'india': 'IN',
    'indonesia': 'ID',
    'malaysia': 'MY',
    'singapore': 'SG',
    'bangladesh': 'BD',
    'turkey': 'TR',
    'egypt': 'EG',
    'nigeria': 'NG',
    'south africa': 'ZA',
    'australia': 'AU',
    'canada': 'CA',
    'germany': 'DE',
    'france': 'FR',
    'spain': 'ES',
    'italy': 'IT',
    'brazil': 'BR',
    'mexico': 'MX',
  };

  const alpha2 = (() => {
    if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
    const mapped = nameToCode[trimmed.toLowerCase()];
    return mapped ? mapped.toUpperCase() : '';
  })();

  if (!alpha2) return '';

  return String.fromCodePoint(
    ...alpha2.split('').map((char) => 127397 + char.charCodeAt(0))
  );
};

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { prayerTimes, location, cityName, countryName, countryCode, calculationMethod, madhab, scheduleData } = useApp();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hijriDate, setHijriDate] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { formatTime, is24Hour } = useTimeFormat();
  const { theme } = useTheme();
  const countryFlag = countryCodeToFlag(countryCode || countryName);

  // No analog watch calculations needed; digital time used below.

  // Initialize Hijri Calendar Service
  const hijriService = getHijriCalendarService();

  const loadHijriDate = useCallback(async () => {
    const hijri = await hijriService.getCurrentHijriDate();
    if (hijri) {
      setHijriDate(`${hijri.day} ${hijri.monthName} ${hijri.year} AH`);
    }
  }, [hijriService]);

  // Update status bar color when theme changes
  useEffect(() => {
    setStatusBarTheme(theme === 'light' ? 'primarySoft' : 'homeDark');
  }, [theme]);

  useEffect(() => {
    // Load initial Hijri date
    loadHijriDate();

    // Listen for Hijri data updates
    const handleUpdate = () => {
      loadHijriDate();
    };
    window.addEventListener('hijriDataUpdated', handleUpdate);

    return () => {
      window.removeEventListener('hijriDataUpdated', handleUpdate);
    };
  }, [hijriService, loadHijriDate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const [isReady, setIsReady] = useState(false);

  // Add 500ms delay on mount to ensure all background loading completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Loading state - show until data loads
  if (!prayerTimes || !location) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <Clock className="w-16 h-16 text-primary animate-pulse" />
          </div>
          <p className="text-foreground text-lg font-semibold">Loading Prayer Times...</p>
          <p className="text-muted-foreground text-sm mt-2">
            {!location ? 'Getting your location...' : 'Calculating prayer times...'}
          </p>
        </div>
      </div>
    );
  }

  // Validate prayer times data
  if (!prayerTimes.fajr || !prayerTimes.sunrise || !prayerTimes.dhuhr || 
      !prayerTimes.asr || !prayerTimes.maghrib || !prayerTimes.isha) {
    console.error('Invalid prayer times data:', prayerTimes);
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground text-lg font-semibold">Error Loading Prayer Times</p>
          <p className="text-muted-foreground text-sm mt-2">Please refresh the app</p>
        </div>
      </div>
    );
  }

  try {
    // Round today's Fajr before using it in comparisons
    const fajrRounded = new Date(Math.round(prayerTimes.fajr.getTime() / 60000) * 60000);
    const afterMidnightBeforeFajr = currentTime < fajrRounded;
    
    // Calculate TODAY's schedule (for header, current prayer status, etc.)
    const todaySchedule = prayerTimes ? (() => {
      // Compute previous and next day's times for correct night window around midnight
      const previous = new Date(currentTime);
      previous.setDate(previous.getDate() - 1);
      const previousPrayerTimes = getPrayerTimes(
        location.latitude,
        location.longitude,
        previous,
        calculationMethod,
        madhab
      );

      const tomorrow = new Date(currentTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowPrayerTimes = getPrayerTimes(
        location.latitude,
        location.longitude,
        tomorrow,
        calculationMethod,
        madhab
      );
      
      // Pick the correct night: if we're before today's Fajr, use yesterday's Isha → today's Fajr. Otherwise today's Isha → tomorrow's Fajr.
      const isBeforeFajr = currentTime < prayerTimes.fajr;
      const nightIsha = isBeforeFajr ? previousPrayerTimes.isha : prayerTimes.isha;
      const nightFajr = isBeforeFajr ? prayerTimes.fajr : tomorrowPrayerTimes.fajr;

      const nightDuration = nightFajr.getTime() - nightIsha.getTime();
      const oneThird = nightDuration / 3;
      
      // Apply 20-minute preparation buffer before Fajr
      const fajrPreparationBuffer = 20 * 60 * 1000; // 20 minutes
      const adjustedFajrTime = new Date(nightFajr.getTime() - fajrPreparationBuffer);
      
      const tahajjudStartMs = adjustedFajrTime.getTime() - oneThird;
      
      // Round to nearest minute to avoid rounding discrepancies
      const tahajjudStartRounded = new Date(Math.round(tahajjudStartMs / 60000) * 60000);
      const tahajjudEndRounded = new Date(Math.round(adjustedFajrTime.getTime() / 60000) * 60000);
      
      return {
        date: currentTime.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        hijriDate: hijriDate || 'Loading...',
        prayers: [
          { name: 'Fajr', time: formatPrayerTime(prayerTimes.fajr, false) },
          { name: 'Dhuhr', time: formatPrayerTime(prayerTimes.dhuhr, false) },
          { name: 'Asr', time: formatPrayerTime(prayerTimes.asr, false) },
          { name: 'Maghrib', time: formatPrayerTime(prayerTimes.maghrib, false) },
          { name: 'Isha', time: formatPrayerTime(prayerTimes.isha, false) },
        ],
        tahajjudStart: formatPrayerTime(tahajjudStartRounded, false),
        tahajjudEnd: formatPrayerTime(tahajjudEndRounded, false),
        sunrise: formatPrayerTime(prayerTimes.sunrise, false),
        sunset: formatPrayerTime(prayerTimes.sunset, false),
      };
    })() : {
      date: currentTime.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      hijriDate: hijriDate || 'Loading...',
      prayers: [
        { name: 'Fajr', time: '--:--' },
        { name: 'Dhuhr', time: '--:--' },
        { name: 'Asr', time: '--:--' },
        { name: 'Maghrib', time: '--:--' },
        { name: 'Isha', time: '--:--' },
      ],
      tahajjudStart: '--:--',
      tahajjudEnd: '--:--',
      sunrise: '--:--',
      sunset: '--:--',
    };
    
    // Get prayer times for SELECTED date (for prayer times display section only)
    const selectedPrayerTimes = getPrayerTimes(
      location.latitude,
      location.longitude,
      selectedDate,
      calculationMethod,
      madhab
    );
    
    // Calculate schedule for SELECTED date (only for display section)
    const selectedSchedule = selectedPrayerTimes ? (() => {
      // Compute previous and next day's times for correct night window around midnight
      const previous = new Date(selectedDate);
      previous.setDate(previous.getDate() - 1);
      const previousPrayerTimes = getPrayerTimes(
        location.latitude,
        location.longitude,
        previous,
        calculationMethod,
        madhab
      );

      const tomorrow = new Date(selectedDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowPrayerTimes = getPrayerTimes(
        location.latitude,
        location.longitude,
        tomorrow,
        calculationMethod,
        madhab
      );
      
      // For tahajjud calculation on selected date
      const isBeforeFajr = currentTime < selectedPrayerTimes.fajr;
      const nightIsha = isBeforeFajr ? previousPrayerTimes.isha : selectedPrayerTimes.isha;
      const nightFajr = isBeforeFajr ? selectedPrayerTimes.fajr : tomorrowPrayerTimes.fajr;

      const nightDuration = nightFajr.getTime() - nightIsha.getTime();
      const oneThird = nightDuration / 3;
      
      // Apply 20-minute preparation buffer before Fajr
      const fajrPreparationBuffer = 20 * 60 * 1000; // 20 minutes
      const adjustedFajrTime = new Date(nightFajr.getTime() - fajrPreparationBuffer);
      
      const tahajjudStartMs = adjustedFajrTime.getTime() - oneThird;
      
      // Round to nearest minute to avoid rounding discrepancies
      const tahajjudStartRounded = new Date(Math.round(tahajjudStartMs / 60000) * 60000);
      const tahajjudEndRounded = new Date(Math.round(adjustedFajrTime.getTime() / 60000) * 60000);
      
      // Check if selected date is today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      const isToday = today.getTime() === selected.getTime();
      
      // Format date title
      let dateTitle = '';
      if (isToday) {
        dateTitle = "Today's Prayer Times";
      } else {
        dateTitle = selectedDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }) + ' Prayer Times';
      }
      
      return {
        dateTitle,
        prayers: [
          { name: 'Fajr', time: formatPrayerTime(selectedPrayerTimes.fajr, false) },
          { name: 'Dhuhr', time: formatPrayerTime(selectedPrayerTimes.dhuhr, false) },
          { name: 'Asr', time: formatPrayerTime(selectedPrayerTimes.asr, false) },
          { name: 'Maghrib', time: formatPrayerTime(selectedPrayerTimes.maghrib, false) },
          { name: 'Isha', time: formatPrayerTime(selectedPrayerTimes.isha, false) },
        ],
        tahajjudStart: formatPrayerTime(tahajjudStartRounded, false),
        tahajjudEnd: formatPrayerTime(tahajjudEndRounded, false),
      };
    })() : {
      dateTitle: "Prayer Times",
      prayers: [
        { name: 'Fajr', time: '--:--' },
        { name: 'Dhuhr', time: '--:--' },
        { name: 'Asr', time: '--:--' },
        { name: 'Maghrib', time: '--:--' },
        { name: 'Isha', time: '--:--' },
      ],
      tahajjudStart: '--:--',
      tahajjudEnd: '--:--',
    };

  // Get current prayer using adjusted countdown respecting prohibitions
  const getCurrentPrayer = () => {
    const now = currentTime;

    const formatEndsIn = (diffMs: number) => {
      const diff = Math.max(0, diffMs);
      const totalMinutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours <= 0) {
        return `${minutes}m`;
      }
      return `${hours}h ${minutes}m`;
    };

    const adjusted = getAdjustedCurrentPrayerCountdown(
      location.latitude,
      location.longitude,
      now,
      calculationMethod,
      madhab,
      'Fajr'
    );

    // If outside any window (rare), fallback to previous logic using natural windows
    if (!adjusted) {
      const windowsMap = getPrayerWindows(
        location.latitude,
        location.longitude,
        now,
        calculationMethod,
        madhab,
        'Fajr'
      );
      // Pre-Fajr treated as Isha current
      if (now < windowsMap['Fajr'].start) {
        const diff = windowsMap['Fajr'].start.getTime() - now.getTime();
        return {
          prayer: { name: 'Isha', time: todaySchedule.prayers[4].time },
          endsIn: formatEndsIn(diff),
          isProhibited: false,
        };
      }
      return null;
    }

    // After midnight but before Fajr: keep Isha as current; countdown to Fajr
    if (now < fajrRounded) {
      const diffMs = fajrRounded.getTime() - now.getTime();
      return {
        prayer: { name: 'Isha', time: todaySchedule.prayers[4].time },
        endsIn: formatEndsIn(diffMs),
        isProhibited: false,
        resumeAt: undefined,
      };
    }

    const prayerMap: { [key: string]: number } = { Fajr: 0, Dhuhr: 1, Asr: 2, Maghrib: 3, Isha: 4 };
    const prayerIndex = prayerMap[adjusted.name];
    const timeStr = prayerIndex !== undefined ? todaySchedule.prayers[prayerIndex]?.time : '--:--';
    const diff = adjusted.countdownMs ?? 0;
    const endsIn = formatEndsIn(diff);

    return {
      prayer: { name: adjusted.name, time: timeStr },
      endsIn,
      isProhibited: adjusted.isProhibitedNow,
      resumeAt: adjusted.resumeAt,
    };
  };

  const currentPrayer = getCurrentPrayer();

  // Get next prayer if not currently in a prayer
  const getNextPrayer = () => {
    const prayerList = [
      { name: 'Fajr', time: prayerTimes.fajr },
      { name: 'Dhuhr', time: prayerTimes.dhuhr },
      { name: 'Asr', time: prayerTimes.asr },
      { name: 'Maghrib', time: prayerTimes.maghrib },
      { name: 'Isha', time: prayerTimes.isha },
    ];

    // Find next prayer after current time
    for (const prayer of prayerList) {
      if (prayer.time > currentTime) {
        const diff = prayer.time.getTime() - currentTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return {
          name: prayer.name,
          time: formatPrayerTime(prayer.time, false),
          countdown: `${hours}h ${minutes}m`,
        };
      }
    }

    // If no prayer left today, return tomorrow's Fajr
    return {
      name: 'Fajr (Tomorrow)',
      time: '--:--',
      countdown: '--',
    };
  };

  const nextPrayer = getNextPrayer();

  // Determine prayer status using new logic
  const prayerStatus = getPrayerStatus(
    location.latitude,
    location.longitude,
    currentTime,
    calculationMethod,
    madhab
  );
  
  // For backward compatibility with UI - only show prohibited for STRICT_FORBIDDEN
  const prohibitedInfo = {
    isProhibited: prayerStatus.status === 'STRICT_FORBIDDEN',
    label: prayerStatus.label,
    endsAt: prayerStatus.endsAt,
  };

  // Get dynamic card style based on current time
  const getTimeBasedCardStyle = () => {
    // Derive hour/minute in selected timezone
    const tz = location?.timezone || undefined;
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz,
    }).formatToParts(currentTime);
    const hourPart = parts.find(p => p.type === 'hour')?.value || '0';
    const minutePart = parts.find(p => p.type === 'minute')?.value || '0';
    const hour = parseInt(hourPart, 10);
    const minute = parseInt(minutePart, 10);
    const timeInMinutes = hour * 60 + minute;
    
    // Parse prayer times to get sunrise and sunset in minutes (already timezone-adjusted strings)
    const sunriseTime = todaySchedule.sunrise.split(':');
    const sunriseMinutes = parseInt(sunriseTime[0]) * 60 + parseInt(sunriseTime[1]);
    
    const sunsetTime = todaySchedule.sunset.split(':');
    const sunsetMinutes = parseInt(sunsetTime[0]) * 60 + parseInt(sunsetTime[1]);
    
    // Dawn (before sunrise)
    if (timeInMinutes < sunriseMinutes) {
      return {
        gradient: 'from-[#1a1f3a] via-[#2d3561] to-[#4a5578]',
        celestialBody: 'moon',
        progress: ((timeInMinutes / sunriseMinutes) * 100),
        textColor: 'text-white',
        labelColor: 'text-white/70',
        timeColor: 'text-white/90',
        countdownColor: 'text-white'
      };
    }
    // Morning (sunrise to noon)
    else if (timeInMinutes >= sunriseMinutes && hour < 12) {
      const progress = ((timeInMinutes - sunriseMinutes) / (720 - sunriseMinutes)) * 100;
      return {
        gradient: 'from-[#87CEEB] via-[#B0D4F1] to-[#FFD700]',
        celestialBody: 'sun',
        progress: progress,
        textColor: 'text-gray-800',
        labelColor: 'text-gray-700/80',
        timeColor: 'text-gray-900',
        countdownColor: 'text-gray-900'
      };
    }
    // Afternoon (noon to sunset)
    else if (hour >= 12 && timeInMinutes < sunsetMinutes) {
      const progress = ((timeInMinutes - 720) / (sunsetMinutes - 720)) * 100;
      return {
        gradient: 'from-[#FFD700] via-[#FFA500] to-[#FF8C00]',
        celestialBody: 'sun',
        progress: progress,
        textColor: 'text-gray-900',
        labelColor: 'text-gray-800/80',
        timeColor: 'text-gray-950',
        countdownColor: 'text-gray-950'
      };
    }
    // Evening/Sunset (sunset time ± 30 min)
    else if (timeInMinutes >= sunsetMinutes && timeInMinutes < sunsetMinutes + 60) {
      const progress = ((timeInMinutes - sunsetMinutes) / 60) * 100;
      return {
        gradient: 'from-[#FF6B6B] via-[#8B5CF6] to-[#4C1D95]',
        celestialBody: 'sunset',
        progress: progress,
        textColor: 'text-white',
        labelColor: 'text-white/80',
        timeColor: 'text-white/95',
        countdownColor: 'text-white'
      };
    }
    // Night (after evening)
    else {
      const nightStart = sunsetMinutes + 60;
      const progress = ((timeInMinutes - nightStart) / (1440 - nightStart)) * 100;
      return {
        gradient: 'from-[#0f172a] via-[#1e293b] to-[#334155]',
        celestialBody: 'moon',
        progress: progress,
        textColor: 'text-white',
        labelColor: 'text-white/70',
        timeColor: 'text-white/90',
        countdownColor: 'text-white'
      };
    }
  };

  const timeStyle = getTimeBasedCardStyle();

  // Prayer icons mapping
  const getPrayerIcon = (prayerName: string) => {
    switch (prayerName) {
      case 'Fajr':
        return <Sunrise className="w-5 h-5" />;
      case 'Dhuhr':
        return <Sun className="w-5 h-5" />;
      case 'Asr':
        return <Sun className="w-5 h-5" />;
      case 'Maghrib':
        return <Sunset className="w-5 h-5" />;
      case 'Isha':
        return <Moon className="w-5 h-5" />;
      case 'Tahajjud':
        return <Moon className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 overflow-y-auto">{/* Header with elegant gradient and pattern */}
      <div
        className={`relative bg-gradient-to-br ${
          theme === 'light'
            ? 'from-[#bef264] via-[#65a30d] to-[#365314] text-black'
            : 'from-[#0a1612] via-[#0d1a15] to-[#0a1612] text-white'
        } p-4 sm:p-6 pb-12 sm:pb-16 overflow-hidden page-header-safe`}
      >
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.6) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        
        {/* Glowing accent circle */}
        <div className="absolute -top-20 -right-20 w-48 h-48 sm:w-64 sm:h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 sm:w-64 sm:h-64 bg-accent/5 rounded-full blur-3xl" />

        <div className="relative z-10">
          {/* Two-Column Cards Section - Inside Header */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {/* Card 1 - List with Icons */}
            <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-border/50 shadow-lg aspect-square flex flex-col items-start justify-center gap-3 ${
              theme === 'light' ? 'bg-white' : 'bg-card/60'
            }`}>
              {/* Location */}
              <button
                onClick={() => onNavigate('location-setup')}
                className={`flex items-center gap-2 text-[0.75rem] transition-all duration-200 cursor-pointer active:scale-95 w-full ${
                  theme === 'light'
                    ? 'text-black hover:opacity-80'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                <MapPin className={`w-4 h-4 flex-shrink-0 ${theme === 'light' ? 'text-black' : 'text-accent'}`} />
                <span className="truncate flex items-center gap-1">
                  {countryFlag && <span>{countryFlag}</span>}
                  <span>
                    {cityName ? cityName : 'Loading...'}
                    {countryCode ? `, ${countryCode}` : ''}
                  </span>
                </span>
              </button>
              
              {/* Gregorian Date */}
              <div
                className={`flex items-center gap-2 text-[0.75rem] w-full ${
                  theme === 'light' ? 'text-black/70' : 'text-white/80'
                }`}
              >
                <Calendar className={`w-4 h-4 flex-shrink-0 ${theme === 'light' ? 'text-black' : 'text-accent'}`} />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
              
              {/* Hijri Date */}
              <div
                className={`flex items-center gap-2 text-[0.75rem] w-full ${
                  theme === 'light' ? 'text-black/60' : 'text-accent/80'
                }`}
              >
                <Moon className={`w-4 h-4 flex-shrink-0 ${theme === 'light' ? 'text-black' : 'text-accent'}`} />
                <span>{todaySchedule.hijriDate}</span>
              </div>
            </div>

            {/* Card 2 - Digital time top 60%, sunrise/sunset bottom 40% */}
            <div
              className={`rounded-3xl p-4 sm:p-5 border border-border/60 shadow-xl aspect-square flex flex-col overflow-hidden ${
                theme === 'light' ? 'bg-white text-black' : 'bg-card/80 text-white'
              }`}
              style={{ backgroundImage: theme === 'light' ? 'radial-gradient(circle at 20% 20%, rgba(0,0,0,0.04), transparent 35%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.05), transparent 35%)' : 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.06), transparent 35%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05), transparent 35%)' }}
            >
              <div className="flex flex-col w-full h-full items-center justify-center gap-3">
                {/* Top: time + prayer */}
                <div className="flex flex-col items-center justify-center gap-1.5 pt-1">
                  <div
                    className="text-2xl sm:text-3xl font-light tracking-wide text-center leading-tight"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {currentTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: !is24Hour,
                      timeZone: location?.timezone || undefined,
                    })}
                  </div>
                  <div className={`text-[11px] sm:text-sm font-semibold leading-tight text-center ${theme === 'light' ? 'text-black/70' : 'text-white/80'}`}>
                    Current Prayer: {currentPrayer?.prayer?.name || '--'}
                  </div>
                </div>

                {/* Bottom: sunrise + sunset inside card */}
                <div className="flex w-full items-stretch justify-center gap-2.5 max-w-[320px] mx-auto">
                  <div className={`flex-1 max-w-[150px] rounded-2xl px-3 py-2 flex flex-col items-center justify-center gap-0.5 ${theme === 'light' ? 'bg-primary/5 border border-border/60' : 'bg-white/5 border border-border/60'}`}>
                    <Sunrise className="w-4 h-4 text-primary" />
                    <div className={`text-[10px] font-medium uppercase tracking-wide leading-tight ${theme === 'light' ? 'text-black/60' : 'text-white/70'}`}>Sunrise</div>
                    <div className="text-sm font-light leading-tight">{todaySchedule.sunrise}</div>
                  </div>
                  <div className={`flex-1 max-w-[150px] rounded-2xl px-3 py-2 flex flex-col items-center justify-center gap-0.5 ${theme === 'light' ? 'bg-accent/5 border border-border/60' : 'bg-white/5 border border-border/60'}`}>
                    <Sunset className="w-4 h-4 text-primary" />
                    <div className={`text-[10px] font-medium uppercase tracking-wide leading-tight ${theme === 'light' ? 'text-black/60' : 'text-white/70'}`}>Sunset</div>
                    <div className="text-sm font-light leading-tight">{todaySchedule.sunset}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Current Status Card - Prayer, Prohibited Time, or Next Prayer */}
      {(currentPrayer || prohibitedInfo.isProhibited || nextPrayer) && (
        <div className="mx-3 sm:mx-4 -mt-6 sm:-mt-8 mb-3 sm:mb-4 relative z-20">
        {/* PROHIBITED TIME CARD */}
            {prohibitedInfo.isProhibited ? (
              <div className={`relative overflow-hidden bg-gradient-to-r from-red-900 via-red-800 to-red-900 rounded-2xl p-4 sm:p-5 shadow-2xl transition-colors duration-1000`}>
              {/* Warning line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500" />

              {/* Single row layout */}
              <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4">
                {/* Left side - Prohibition info */}
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                  {/* Warning Icon */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl backdrop-blur-sm flex items-center justify-center flex-shrink-0 border bg-red-800/40 border-red-600/50">
                    <div className="text-white scale-110">
                      🚫
                    </div>
                  </div>
                  
                  {/* Prohibition details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-red-200 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1">Prohibited</p>
                    {prohibitedInfo.endsAt && (
                      <p className="text-white text-sm sm:text-base font-medium mb-0.5">Ends at {formatTime(formatPrayerTime(prohibitedInfo.endsAt, false))}</p>
                    )}
                    <p className="text-red-100 text-[9px] sm:text-xs line-clamp-1">{prohibitedInfo.label?.replace('Prohibited: ', '').replace('no voluntary prayers', '').trim()}</p>
                  </div>
                </div>
                
                {/* Right side - Time remaining until end of prohibition */}
                <div className="text-right flex-shrink-0">
                  <p className="text-red-200 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1">
                    In
                  </p>
                  {prohibitedInfo.endsAt && (
                    <div className="text-white text-3xl sm:text-4xl font-bold leading-none drop-shadow-lg">
                      {(() => {
                        const diff = Math.max(0, prohibitedInfo.endsAt.getTime() - currentTime.getTime());
                        const totalMinutes = Math.floor(diff / (1000 * 60));
                        const hours = Math.floor(totalMinutes / 60);
                        const minutes = totalMinutes % 60;
                        if (hours <= 0) {
                          return `${minutes}m`;
                        }
                        return `${hours}h ${minutes}m`;
                      })()}
                    </div>
                  )}
                </div>
              </div>
              </div>
            ) : currentPrayer && !afterMidnightBeforeFajr ? (
              /* NORMAL PRAYER CARD */
              <div className={`relative overflow-hidden bg-gradient-to-r ${timeStyle.gradient} rounded-2xl p-4 sm:p-5 shadow-2xl transition-colors duration-1000`}>
              {/* Horizon line */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-white/20" />

              {/* Single row layout */}
              <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4">
                {/* Left side - Prayer info */}
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                  {/* Prayer Icon */}
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl backdrop-blur-sm flex items-center justify-center flex-shrink-0 border ${
                    timeStyle.celestialBody === 'sun' 
                      ? 'bg-gray-800/30 border-gray-700/40' 
                      : 'bg-white/20 border-white/30'
                  }`}>
                    <div className={timeStyle.textColor + ' scale-110'}>
                      {getPrayerIcon(currentPrayer.prayer.name)}
                    </div>
                  </div>
                  
                  {/* Prayer details */}
                  <div className="flex-1 min-w-0">
                    <p className={`${timeStyle.labelColor} text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1`}>Current Prayer</p>
                    <h2 className={`${timeStyle.textColor} text-2xl sm:text-3xl font-bold mb-0.5`}>{currentPrayer.prayer.name}</h2>
                    <p className={`${timeStyle.timeColor} text-sm sm:text-base font-medium`}>Started at {formatTime(currentPrayer.prayer.time)}</p>
                  </div>
                </div>
                
                {/* Right side - Time remaining */}
                <div className="text-right flex-shrink-0">
                  <p className={`${timeStyle.labelColor} text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1`}>
                    Ends In
                  </p>
                  <div className={`${timeStyle.countdownColor} text-3xl sm:text-4xl font-bold leading-none drop-shadow-lg`}>
                    {currentPrayer.endsIn}
                  </div>
                </div>
              </div>
            </div>
            ) : (
              /* NEXT PRAYER CARD - When not in prayer or prohibition */
              <div className={`relative overflow-hidden bg-gradient-to-r ${timeStyle.gradient} rounded-2xl p-4 sm:p-5 shadow-2xl transition-colors duration-1000`}>
              {/* Decorative line */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-white/20" />

              {/* Single row layout */}
              <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4">
                {/* Left side - Prayer info */}
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                  {/* Prayer Icon */}
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl backdrop-blur-sm flex items-center justify-center flex-shrink-0 border ${
                    timeStyle.celestialBody === 'sun' 
                      ? 'bg-gray-800/30 border-gray-700/40' 
                      : 'bg-white/20 border-white/30'
                  }`}>
                    <div className={timeStyle.textColor + ' scale-110'}>
                      {getPrayerIcon(nextPrayer.name)}
                    </div>
                  </div>
                  
                  {/* Prayer details */}
                  <div className="flex-1 min-w-0">
                    <p className={`${timeStyle.labelColor} text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1`}>Next Prayer</p>
                    <h2 className={`${timeStyle.textColor} text-2xl sm:text-3xl font-bold mb-0.5`}>{nextPrayer.name}</h2>
                    <p className={`${timeStyle.timeColor} text-sm sm:text-base font-medium`}>At {formatTime(nextPrayer.time)}</p>
                  </div>
                </div>
                
                {/* Right side - Time remaining */}
                <div className="text-right flex-shrink-0">
                  <p className={`${timeStyle.labelColor} text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1`}>
                    In
                  </p>
                  <div className={`${timeStyle.countdownColor} text-3xl sm:text-4xl font-bold leading-none drop-shadow-lg`}>
                    {nextPrayer.countdown}
                  </div>
                </div>
              </div>
            </div>
            )}
        </div>
      )}

      <div className="mt-2 sm:mt-3">
        {/* Prayer Times List - Enhanced with gradients and icons */}
        <div className="px-3 sm:px-4 mb-4 sm:mb-6">
        <div className="text-center mb-4 sm:mb-5">
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
            {/* Previous day button */}
            <button
              onClick={() => {
                const prevDate = new Date(selectedDate);
                prevDate.setDate(prevDate.getDate() - 1);
                setSelectedDate(prevDate);
              }}
              className="flex-shrink-0 p-2 sm:p-2.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            
            {/* Title */}
            <h3 className="text-foreground text-lg sm:text-xl font-bold tracking-tight">
              {selectedSchedule.dateTitle}
            </h3>
            
            {/* Next day button */}
            <button
              onClick={() => {
                const nextDate = new Date(selectedDate);
                nextDate.setDate(nextDate.getDate() + 1);
                setSelectedDate(nextDate);
              }}
              className="flex-shrink-0 p-2 sm:p-2.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="h-0.5 w-10 sm:w-12 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
            <div className="w-1.5 h-1.5 bg-accent rounded-full" />
            <div className="h-0.5 w-10 sm:w-12 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
          </div>
        </div>
        
        {/* First row - 3 prayers (Fajr, Dhuhr, Asr) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3">
          {selectedSchedule.prayers.slice(0, 3).map((prayer, index) => {
            return (
              <div
                key={prayer.name}
                className="relative group"
              >
                <div className="relative bg-card rounded-xl sm:rounded-2xl border border-border shadow-xl p-3 sm:p-4 text-center transition-all duration-300">
                  {/* Icon */}
                  <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl mb-1.5 sm:mb-2 bg-white/5 text-muted-foreground">
                    {getPrayerIcon(prayer.name)}
                  </div>
                  
                  <h4 className="text-xs sm:text-sm font-bold tracking-tight mb-1 sm:mb-1.5 text-foreground">
                    {prayer.name}
                  </h4>
                  
                  <div className="text-base sm:text-lg font-light tracking-wide text-foreground/90">
                    {formatTime(prayer.time)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Second row - 2 prayers (Maghrib, Isha) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {selectedSchedule.prayers.slice(3, 5).map((prayer, index) => {
            return (
              <div
                key={prayer.name}
                className="relative group"
              >
                <div className="relative bg-card rounded-xl sm:rounded-2xl border border-border shadow-xl p-3 sm:p-4 text-center transition-all duration-300">
                  {/* Icon */}
                  <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl mb-1.5 sm:mb-2 bg-white/5 text-muted-foreground">
                    {getPrayerIcon(prayer.name)}
                  </div>
                  
                  <h4 className="text-xs sm:text-sm font-bold tracking-tight mb-1 sm:mb-1.5 text-foreground">
                    {prayer.name}
                  </h4>
                  
                  <div className="text-base sm:text-lg font-light tracking-wide text-foreground/90">
                    {formatTime(prayer.time)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Third row - Full width Tahajjud info card */}
        <div className="relative group mb-4 sm:mb-6">
          <div
            className={`relative rounded-xl sm:rounded-2xl border shadow-2xl p-4 sm:p-6 transition-all duration-300 ${
              theme === 'light'
                ? 'border-border bg-gradient-to-br from-[#bef264] via-[#65a30d] to-[#365314] text-black'
                : 'border-purple-400/30 bg-gradient-to-br from-purple-900/40 to-indigo-900/30 text-white'
            }`}
          >
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Icon */}
              <div
                className={`flex-shrink-0 inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl ${
                  theme === 'light' ? 'bg-black/10 text-black' : 'bg-purple-500/20 text-white'
                }`}
              >
                {getPrayerIcon('Tahajjud')}
              </div>
              
              {/* Content */}
              <div className="flex-1 text-left">
                <h4
                  className={`text-base sm:text-lg font-bold tracking-tight mb-1 ${
                    theme === 'light' ? 'text-black' : 'text-white'
                  }`}
                >
                  Tahajjud
                </h4>
                <p
                  className={`text-xs sm:text-sm font-medium ${
                    theme === 'light' ? 'text-black/80' : 'text-white/80'
                  }`}
                >
                  Sunnah Mu'akkadah
                </p>
              </div>
              
              {/* Time window */}
              <div className="flex-shrink-0 text-right">
                <p
                  className={`text-lg sm:text-2xl font-bold ${
                    theme === 'light' ? 'text-black' : 'text-white'
                  }`}
                >
                  {formatTime(selectedSchedule.tahajjudStart)} - {formatTime(selectedSchedule.tahajjudEnd)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Enhanced */}
      <div className="px-3 sm:px-4 mb-4 sm:mb-6">
        <div className="text-center mb-3 sm:mb-4">
          <h3 className="text-foreground text-lg sm:text-xl font-bold tracking-tight">Quick Access</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={() => onNavigate('calendar')}
            className="relative group overflow-hidden active:scale-95 transition-transform rounded-2xl sm:rounded-3xl"
          >
            {/* Hover glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl sm:rounded-3xl opacity-0 group-active:opacity-100 transition-opacity blur-xl" />
            
            <div className="relative flex flex-col items-center gap-3 sm:gap-4 p-5 sm:p-6 bg-card rounded-2xl sm:rounded-3xl shadow-2xl border border-border">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary via-[#0A8B73] to-[#0A6B5D] flex items-center justify-center shadow-xl border border-primary/30">
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <span className="font-bold text-foreground text-sm sm:text-base">Hijri Calendar</span>
              
              {/* Decorative accent */}
              <div className="absolute top-2 sm:top-3 right-2 sm:right-3 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-accent rounded-full" />
            </div>
          </button>
          
          <button
            onClick={() => onNavigate('qibla')}
            className="relative group overflow-hidden active:scale-95 transition-transform rounded-2xl sm:rounded-3xl"
          >
            {/* Hover glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl sm:rounded-3xl opacity-0 group-active:opacity-100 transition-opacity blur-xl" />
            
            <div className="relative flex flex-col items-center gap-3 sm:gap-4 p-5 sm:p-6 bg-card rounded-2xl sm:rounded-3xl shadow-2xl border border-border">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary via-[#0A8B73] to-[#0A6B5D] flex items-center justify-center shadow-xl border border-primary/30">
                <Compass className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <span className="font-bold text-foreground text-sm sm:text-base">Qibla Finder</span>
              
              {/* Decorative accent */}
              <div className="absolute top-2 sm:top-3 right-2 sm:right-3 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-accent rounded-full" />
            </div>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error('Error rendering HomePage:', error);
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground text-lg font-semibold">Rendering Error</p>
          <p className="text-muted-foreground text-sm mt-2">{String(error)}</p>
        </div>
      </div>
    );
  }
}