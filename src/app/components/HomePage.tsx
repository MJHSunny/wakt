import React, { useState, useEffect, useCallback } from 'react';
import { Clock, MapPin, Compass, Calendar, Sunrise, Sunset, Moon, Sun, CloudRain, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTimeFormat } from '../context/TimeFormatContext';
import { useApp } from '../context/AppContext';
import { formatPrayerTime, getCurrentPrayerWindowInfo, getPrayerWindows, getProhibitedTimeInfoClean, getAdjustedCurrentPrayerCountdown, getPrayerTimes, calculateTahajjud } from '../../services/prayerService';
import { getHijriCalendarService } from '../../services/hijriCalendarService';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { prayerTimes, location, cityName, countryName, calculationMethod, madhab, scheduleData } = useApp();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hijriDate, setHijriDate] = useState<string>('');
  const { formatTime, is24Hour } = useTimeFormat();

  // Initialize Hijri Calendar Service
  const hijriService = getHijriCalendarService();

  const loadHijriDate = useCallback(async () => {
    const hijri = await hijriService.getCurrentHijriDate();
    if (hijri) {
      setHijriDate(`${hijri.day} ${hijri.monthName} ${hijri.year} AH`);
    }
  }, [hijriService]);

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
    
    // Calculate schedule from prayer times
    const schedule = prayerTimes ? (() => {
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
      const tahajjudStartMs = nightFajr.getTime() - oneThird;
      
      // Round to nearest minute to avoid rounding discrepancies
      const tahajjudStartRounded = new Date(Math.round(tahajjudStartMs / 60000) * 60000);
      const tahajjudEndRounded = new Date(Math.round(nightFajr.getTime() / 60000) * 60000);
      
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

  // Get current prayer using adjusted countdown respecting prohibitions
  const getCurrentPrayer = () => {
    const now = currentTime;

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
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return {
          prayer: { name: 'Isha', time: schedule.prayers[4].time },
          endsIn: `${hours}h ${minutes}m`,
          isProhibited: false,
        };
      }
      return null;
    }

    // Explicit pre-Fajr handling: show Isha ending at Fajr start (use rounded Fajr for comparison)
    if (now < fajrRounded) {
      const diffMs = fajrRounded.getTime() - now.getTime();
      const hoursPF = Math.floor(diffMs / (1000 * 60 * 60));
      const minutesPF = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return {
        prayer: { name: 'Isha', time: schedule.prayers[4].time },
        endsIn: `${hoursPF}h ${minutesPF}m`,
        isProhibited: false,
        resumeAt: undefined,
      };
    }

    const prayerMap: { [key: string]: number } = { Fajr: 0, Dhuhr: 1, Asr: 2, Maghrib: 3, Isha: 4 };
    const prayerIndex = prayerMap[adjusted.name];
    const timeStr = prayerIndex !== undefined ? schedule.prayers[prayerIndex]?.time : '--:--';
    const diff = Math.max(0, adjusted.countdownMs ?? 0);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const endsIn = `${hours}h ${minutes}m`;

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

  // Determine prohibited time status
  const prohibitedInfo = getProhibitedTimeInfoClean(
    location.latitude,
    location.longitude,
    currentTime,
    calculationMethod,
    madhab
  );

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
    const sunriseTime = schedule.sunrise.split(':');
    const sunriseMinutes = parseInt(sunriseTime[0]) * 60 + parseInt(sunriseTime[1]);
    
    const sunsetTime = schedule.sunset.split(':');
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
      <div className="relative bg-gradient-to-br from-[#0a1612] via-[#0d1a15] to-[#0a1612] text-white p-4 sm:p-6 pb-12 sm:pb-16 overflow-hidden page-header-safe">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
        
        {/* Glowing accent circle */}
        <div className="absolute -top-20 -right-20 w-48 h-48 sm:w-64 sm:h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 sm:w-64 sm:h-64 bg-accent/5 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="text-center mb-4 sm:mb-6">
            <p className="text-white/60 text-[10px] sm:text-xs font-semibold mb-2 uppercase tracking-widest">Prayer Times</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent mb-3 sm:mb-4">
              Assalamu Alaikum
            </h1>
            <button
              onClick={() => onNavigate('location-setup')}
              className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-white/90 bg-white/10 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border border-white/20 shadow-lg hover:bg-white/15 hover:border-white/30 transition-all duration-200 cursor-pointer active:scale-95"
            >
              <MapPin className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-accent" />
              <span className="font-semibold">{cityName && countryName ? `${cityName}, ${countryName}` : 'Loading...'}</span>
            </button>
          </div>

          {/* Date info with elegant styling */}
          <div className="mb-4 sm:mb-6 text-center">
            <p className="text-white/95 font-semibold mb-1 text-sm sm:text-base">{schedule.date}</p>
            <div className="flex items-center justify-center gap-2">
              <div className="h-px w-6 sm:w-8 bg-gradient-to-r from-transparent to-accent/50" />
              <p className="text-accent/90 text-[10px] sm:text-xs font-medium">{schedule.hijriDate}</p>
              <div className="h-px w-6 sm:w-8 bg-gradient-to-l from-transparent to-accent/50" />
            </div>
          </div>

          {/* Current time with Sunrise/Sunset - All in one row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* Sunrise */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl py-3 sm:py-4 px-2 sm:px-3 border border-white/20 shadow-xl">
              <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#f97316]/20 flex items-center justify-center flex-shrink-0">
                  <Sunrise className="w-4 h-4 sm:w-5 sm:h-5 text-orange-300 flex-shrink-0" />
                </div>
                <div className="text-center w-full">
                  <p className="text-white/60 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide mb-0.5">Sunrise</p>
                  <p className="text-white font-bold text-[13px] sm:text-sm">{schedule.sunrise}</p>
                </div>
              </div>
            </div>

            {/* Current Time - Center and larger */}
            <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl py-3 sm:py-4 px-2 sm:px-3 border border-white/20 shadow-2xl">
              <div className="flex flex-col items-center justify-center h-full w-full gap-0.5">
                {/* Time */}
                <div className="text-xl sm:text-2xl md:text-3xl font-light tracking-wide text-white text-center w-full">
                  {(() => {
                    const tzStr = location?.timezone ? location.timezone : 'DEVICE_DEFAULT';
                    console.log('[HomePage] Formatting time. TZ Override:', tzStr, 'Location:', location?.city, location?.country);
                    const formatted = currentTime.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: !is24Hour,
                      timeZone: location?.timezone || undefined
                    });
                    console.log('[HomePage] Formatted time:', formatted, 'with TZ:', tzStr);
                    return formatted;
                  })()}
                </div>
                {/* Now label */}
                <div className="flex items-center justify-center gap-1 text-white/60 text-[8px] sm:text-[9px] mt-0.5">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                  <span className="font-semibold uppercase tracking-wider">Now</span>
                </div>
              </div>
            </div>

            {/* Sunset */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl py-3 sm:py-4 px-2 sm:px-3 border border-white/20 shadow-xl">
              <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#a855f7]/20 flex items-center justify-center flex-shrink-0">
                  <Sunset className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300 flex-shrink-0" />
                </div>
                <div className="text-center w-full">
                  <p className="text-white/60 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide mb-0.5">Sunset</p>
                  <p className="text-white font-bold text-[13px] sm:text-sm">{schedule.sunset}</p>
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
              <div className={`relative overflow-hidden bg-gradient-to-r from-red-900 via-red-800 to-red-900 rounded-2xl p-4 sm:p-5 shadow-xl transition-colors duration-1000`}>
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
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        return `${hours}h ${minutes}m`;
                      })()}
                    </div>
                  )}
                </div>
              </div>
              </div>
            ) : currentPrayer ? (
              /* NORMAL PRAYER CARD */
              <div className={`relative overflow-hidden bg-gradient-to-r ${timeStyle.gradient} rounded-2xl p-4 sm:p-5 shadow-xl transition-colors duration-1000`}>
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
              <div className={`relative overflow-hidden bg-gradient-to-r ${timeStyle.gradient} rounded-2xl p-4 sm:p-5 shadow-xl transition-colors duration-1000`}>
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
          <h3 className="text-foreground text-lg sm:text-xl font-bold tracking-tight mb-1">Today's Prayer Times</h3>
          <div className="flex items-center justify-center gap-2">
            <div className="h-0.5 w-10 sm:w-12 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
            <div className="w-1.5 h-1.5 bg-accent rounded-full" />
            <div className="h-0.5 w-10 sm:w-12 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
          </div>
        </div>
        
        {/* First row - 3 prayers (Fajr, Dhuhr, Asr) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3">
          {schedule.prayers.slice(0, 3).map((prayer, index) => {
            return (
              <div
                key={prayer.name}
                className="relative group"
              >
                <div className="relative bg-gradient-to-br from-card to-card/80 border border-white/5 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 text-center transition-all duration-300">
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
          {schedule.prayers.slice(3, 5).map((prayer, index) => {
            return (
              <div
                key={prayer.name}
                className="relative group"
              >
                <div className="relative bg-gradient-to-br from-card to-card/80 border border-white/5 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 text-center transition-all duration-300">
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
          <div className="relative bg-gradient-to-br from-purple-900/40 to-indigo-900/30 border border-purple-400/30 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 transition-all duration-300">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Icon */}
              <div className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-purple-500/20 text-white">
                {getPrayerIcon('Tahajjud')}
              </div>
              
              {/* Content */}
              <div className="flex-1 text-left">
                <h4 className="text-base sm:text-lg font-bold tracking-tight mb-1 text-white">
                  Tahajjud
                </h4>
                <p className="text-xs sm:text-sm text-white/80 font-medium">
                  Sunnah Mu'akkadah
                </p>
              </div>
              
              {/* Time window */}
              <div className="flex-shrink-0 text-right">
                <p className="text-lg sm:text-2xl font-bold text-white">
                  {formatTime(schedule.tahajjudStart)} - {formatTime(schedule.tahajjudEnd)}
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
            className="relative group overflow-hidden active:scale-95 transition-transform"
          >
            {/* Hover glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-xl sm:rounded-2xl opacity-0 group-active:opacity-100 transition-opacity blur-xl" />
            
            <div className="relative flex flex-col items-center gap-3 sm:gap-4 p-5 sm:p-6 bg-gradient-to-br from-card to-card/60 rounded-xl sm:rounded-2xl shadow-lg border border-white/5">
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
            className="relative group overflow-hidden active:scale-95 transition-transform"
          >
            {/* Hover glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-xl sm:rounded-2xl opacity-0 group-active:opacity-100 transition-opacity blur-xl" />
            
            <div className="relative flex flex-col items-center gap-3 sm:gap-4 p-5 sm:p-6 bg-gradient-to-br from-card to-card/60 rounded-xl sm:rounded-2xl shadow-lg border border-white/5">
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