import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Compass, Calendar, Sunrise, Sunset, Moon, Sun, CloudRain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTimeFormat } from '../context/TimeFormatContext';
import { useApp } from '../context/AppContext';
import { formatPrayerTime } from '../../services/prayerService';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { prayerTimes, location, cityName, countryName, prayerTimesLoading } = useApp();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { formatTime, is24Hour } = useTimeFormat();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Show loading state while fetching prayer times
  if (!prayerTimes || prayerTimesLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4"
          >
            <Clock className="w-16 h-16 text-primary" />
          </motion.div>
          <p className="text-foreground text-lg font-semibold">Loading Prayer Times...</p>
          <p className="text-muted-foreground text-sm mt-2">Getting your location</p>
        </div>
      </div>
    );
  }

  // Get current and next prayer - only called after prayerTimes is confirmed to exist
  const getCurrentAndNextPrayer = () => {
    const now = currentTime;
    // Only consider the 5 daily prayers (exclude Sunrise)
    const mainPrayers = [
      { name: 'Fajr', time: prayerTimes.fajr },
      { name: 'Dhuhr', time: prayerTimes.dhuhr },
      { name: 'Asr', time: prayerTimes.asr },
      { name: 'Maghrib', time: prayerTimes.maghrib },
      { name: 'Isha', time: prayerTimes.isha },
    ];

    // Find which prayer period we're currently in
    let currentPrayerIndex = -1;
    
    for (let i = 0; i < mainPrayers.length; i++) {
      if (now >= mainPrayers[i].time) {
        currentPrayerIndex = i;
      } else {
        break;
      }
    }

    // If we're before Fajr, we're still in Isha from yesterday
    if (currentPrayerIndex === -1) {
      const fajr = mainPrayers[0];
      const diff = fajr.time.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      // Calculate yesterday's Isha time
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const ishaYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 
        prayerTimes.isha.getHours(), prayerTimes.isha.getMinutes());

      return {
        current: {
          prayer: { name: 'Isha', time: ishaYesterday },
          timeRemaining: hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`,
        },
        next: fajr.name,
        nextTime: fajr.time,
      };
    }

    // Get current prayer and when it ends (next prayer time)
    const currentPrayer = mainPrayers[currentPrayerIndex];
    const nextPrayerIndex = currentPrayerIndex + 1;

    // If we're in Isha (last prayer), it ends at Fajr tomorrow
    if (nextPrayerIndex >= mainPrayers.length) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fajrTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 
        prayerTimes.fajr.getHours(), prayerTimes.fajr.getMinutes());
      
      const diff = fajrTomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return {
        current: {
          prayer: currentPrayer,
          timeRemaining: hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`,
        },
        next: 'Fajr',
        nextTime: fajrTomorrow,
      };
    }

    // Calculate time until next prayer (end of current prayer period)
    const nextPrayer = mainPrayers[nextPrayerIndex];
    const diff = nextPrayer.time.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      current: {
        prayer: currentPrayer,
        timeRemaining: hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`,
      },
      next: nextPrayer.name,
      nextTime: nextPrayer.time,
    };
  };

  const { current: currentPrayer, next: nextPrayer, nextTime } = getCurrentAndNextPrayer();

  // Calculate Tahajjud time (last third of night - typically 2 hours before Fajr)
  const getTahajjudTime = () => {
    const tahajjudDate = new Date(prayerTimes.fajr.getTime() - (2 * 60 * 60 * 1000)); // 2 hours before Fajr
    return formatPrayerTime(tahajjudDate, !is24Hour);
  };

  // Format prayers array
  const prayers = [
    { name: 'Fajr', time: formatPrayerTime(prayerTimes.fajr, !is24Hour) },
    { name: 'Dhuhr', time: formatPrayerTime(prayerTimes.dhuhr, !is24Hour) },
    { name: 'Asr', time: formatPrayerTime(prayerTimes.asr, !is24Hour) },
    { name: 'Maghrib', time: formatPrayerTime(prayerTimes.maghrib, !is24Hour) },
    { name: 'Isha', time: formatPrayerTime(prayerTimes.isha, !is24Hour) },
    { name: 'Tahajjud', time: getTahajjudTime() },
  ];

  const formattedSunrise = formatPrayerTime(prayerTimes.sunrise, !is24Hour);
  const formattedSunset = formatPrayerTime(prayerTimes.maghrib, !is24Hour);

  // Get dynamic card style based on current time
  const getTimeBasedCardStyle = () => {    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    const sunriseMinutes = prayerTimes.sunrise.getHours() * 60 + prayerTimes.sunrise.getMinutes();
    const sunsetMinutes = prayerTimes.maghrib.getHours() * 60 + prayerTimes.maghrib.getMinutes();
    
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
        return <CloudRain className="w-5 h-5" />;
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

  // Show loading state while fetching prayer times
  if (!prayerTimes || prayerTimesLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4"
          >
            <Clock className="w-16 h-16 text-primary" />
          </motion.div>
          <p className="text-foreground text-lg font-semibold">Loading Prayer Times...</p>
          <p className="text-muted-foreground text-sm mt-2">Getting your location</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-y-auto">{/* Header with elegant gradient and pattern */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative bg-gradient-to-br from-[#0a1612] via-[#0d1a15] to-[#0a1612] text-white p-4 sm:p-6 pb-12 sm:pb-16 overflow-hidden"
      >
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
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="text-center mb-4 sm:mb-6"
          >
            <p className="text-white/60 text-[10px] sm:text-xs font-semibold mb-2 uppercase tracking-widest">Prayer Times</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent mb-3 sm:mb-4">
              Assalamu Alaikum
            </h1>
            <motion.div 
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-white/90 bg-white/10 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border border-white/20 shadow-lg"
            >
              <MapPin className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-accent" />
              <span className="font-semibold">{cityName && countryName ? `${cityName}, ${countryName}` : 'Loading...'}</span>
            </motion.div>
          </motion.div>

          {/* Date info with elegant styling */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="mb-4 sm:mb-6 text-center"
          >
            <p className="text-white/95 font-semibold mb-1 text-sm sm:text-base">{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <div className="flex items-center justify-center gap-2">
              <div className="h-px w-6 sm:w-8 bg-gradient-to-r from-transparent to-accent/50" />
              <p className="text-accent/90 text-[10px] sm:text-xs font-medium">Islamic Calendar</p>
              <div className="h-px w-6 sm:w-8 bg-gradient-to-l from-transparent to-accent/50" />
            </div>
          </motion.div>

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
                  <p className="text-white font-bold text-[13px] sm:text-sm">{formattedSunrise}</p>
                </div>
              </div>
            </div>

            {/* Current Time - Center and larger */}
            <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl py-3 sm:py-4 px-2 sm:px-3 border border-white/20 shadow-2xl">
              <div className="flex flex-col items-center justify-center h-full w-full gap-0.5">
                {/* Time */}
                <div className="text-xl sm:text-2xl md:text-3xl font-light tracking-wide text-white text-center w-full">
                  {currentTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: !is24Hour
                  })}
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
                  <p className="text-white font-bold text-[13px] sm:text-sm">{formattedSunset}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Next Prayer Countdown - Enhanced */}
      <AnimatePresence mode="wait">
        {currentPrayer && (
          <motion.div 
            key={currentPrayer.prayer.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="mx-3 sm:mx-4 -mt-6 sm:-mt-8 mb-4 sm:mb-5 relative z-20"
          >
            <div className={`relative overflow-hidden bg-gradient-to-r ${timeStyle.gradient} rounded-2xl p-4 sm:p-5 shadow-xl transition-colors duration-1000`}>
              {/* Animated celestial body (sun/moon) */}
              <div 
                className="absolute top-4 transition-all duration-1000 ease-linear"
                style={{ 
                  left: `${timeStyle.progress}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {timeStyle.celestialBody === 'sun' && (
                  <motion.div
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity }
                    }}
                  >
                    <Sun className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.8)]" />
                  </motion.div>
                )}
                {timeStyle.celestialBody === 'moon' && (
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, 0, -10, 0]
                    }}
                    transition={{ 
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Moon className="w-8 h-8 sm:w-10 sm:h-10 text-blue-100 drop-shadow-[0_0_15px_rgba(219,234,254,0.8)]" />
                  </motion.div>
                )}
                {timeStyle.celestialBody === 'sunset' && (
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.8, 1, 0.8]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity
                    }}
                  >
                    <Sunset className="w-8 h-8 sm:w-10 sm:h-10 text-orange-300 drop-shadow-[0_0_20px_rgba(251,146,60,0.9)]" />
                  </motion.div>
                )}
              </div>

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
                    <p className={`${timeStyle.timeColor} text-sm sm:text-base font-medium`}>Started at {formatPrayerTime(currentPrayer.prayer.time, !is24Hour)}</p>
                  </div>
                </div>
                
                {/* Right side - Time remaining */}
                <div className="text-right flex-shrink-0">
                  <p className={`${timeStyle.labelColor} text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1`}>Ends In</p>
                  <div className={`${timeStyle.countdownColor} text-3xl sm:text-4xl font-bold leading-none drop-shadow-lg`}>
                    {currentPrayer.timeRemaining}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prayer Times List - Enhanced with gradients and icons */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="px-3 sm:px-4 mb-4 sm:mb-6"
      >
        <div className="text-center mb-4 sm:mb-5">
          <h3 className="text-foreground text-lg sm:text-xl font-bold tracking-tight mb-1">Today's Prayer Times</h3>
          <div className="flex items-center justify-center gap-2">
            <div className="h-0.5 w-10 sm:w-12 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
            <div className="w-1.5 h-1.5 bg-accent rounded-full" />
            <div className="h-0.5 w-10 sm:w-12 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
          </div>
        </div>
        
        {/* First row - 3 prayers */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3">
          {prayers.slice(0, 3).map((prayer, index) => {
            const isCurrent = currentPrayer?.prayer.name === prayer.name;
            
            return (
              <motion.div
                key={prayer.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="relative group"
              >
                {/* Glow effect for active prayer */}
                {isNext && (
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-primary/30 rounded-xl sm:rounded-2xl blur-md" />
                )}
                
                <div className={`relative bg-gradient-to-br ${
                  isNext 
                    ? 'from-card to-[#2a3142] border-2 border-accent/50' 
                    : 'from-card to-card/80 border border-white/5'
                } rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 text-center transition-all duration-300`}>
                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl mb-1.5 sm:mb-2 ${
                    isNext 
                      ? 'bg-gradient-to-br from-primary to-[#0A9E82] text-white shadow-lg' 
                      : 'bg-white/5 text-muted-foreground'
                  }`}>
                    {getPrayerIcon(prayer.name)}
                  </div>
                  
                  <h4 className={`text-xs sm:text-sm font-bold tracking-tight mb-1 sm:mb-1.5 ${
                    isCurrent ? 'text-primary' : 'text-foreground'
                  }`}>
                    {prayer.name}
                  </h4>
                  
                  <div className={`text-base sm:text-lg font-light tracking-wide ${
                    isCurrent ? 'text-accent' : 'text-foreground/90'
                  }`}>
                    {prayer.time}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Second row - 3 prayers (Maghrib, Isha, Tahajjud) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {prayers.slice(3, 6).map((prayer, index) => {
            const isCurrent = currentPrayer?.prayer.name === prayer.name;
            
            return (
              <motion.div
                key={prayer.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index + 3) * 0.1, duration: 0.3 }}
                className="relative group"
              >
                {/* Glow effect for active prayer */}
                {isCurrent && (
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-primary/30 rounded-xl sm:rounded-2xl blur-md" />
                )}
                
                <div className={`relative bg-gradient-to-br ${
                  isCurrent 
                    ? 'from-card to-[#2a3142] border-2 border-accent/50' 
                    : 'from-card to-card/80 border border-white/5'
                } rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 text-center transition-all duration-300`}>
                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl mb-1.5 sm:mb-2 ${
                    isCurrent 
                      ? 'bg-gradient-to-br from-primary to-[#0A9E82] text-white shadow-lg' 
                      : 'bg-white/5 text-muted-foreground'
                  }`}>
                    {getPrayerIcon(prayer.name)}
                  </div>
                  
                  <h4 className={`text-xs sm:text-sm font-bold tracking-tight mb-1 sm:mb-1.5 ${
                    isCurrent ? 'text-primary' : 'text-foreground'
                  }`}>
                    {prayer.name}
                  </h4>
                  
                  <div className={`text-base sm:text-lg font-light tracking-wide ${
                    isCurrent ? 'text-accent' : 'text-foreground/90'
                  }`}>
                    {prayer.time}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Quick Actions - Enhanced */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="px-3 sm:px-4 mb-4 sm:mb-6"
      >
        <div className="text-center mb-3 sm:mb-4">
          <h3 className="text-foreground text-lg sm:text-xl font-bold tracking-tight">Quick Access</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <motion.button
            onClick={() => onNavigate('calendar')}
            whileTap={{ scale: 0.95 }}
            className="relative group overflow-hidden"
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
          </motion.button>
          
          <motion.button
            onClick={() => onNavigate('qibla')}
            whileTap={{ scale: 0.95 }}
            className="relative group overflow-hidden"
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
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}