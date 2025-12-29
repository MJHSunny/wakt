import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Star, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { importantDates } from '../utils/prayerData';
import { getHijriCalendarService } from '../../services/hijriCalendarService';
import { setStatusBarTheme } from '../services/statusBarTheme';

export function IslamicCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(0); // 0 = current month, 1 = next, -1 = prev
  const [hijriData, setHijriData] = useState<{
    current: { year: number; month: number; day: number } | null;
    monthDays: { [day: number]: { gregorian: Date; hijri: any } };
  }>({ current: null, monthDays: {} });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('Loading...');
  const [manualFetching, setManualFetching] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const hijriService = getHijriCalendarService();

  // Use primary header theme
  useEffect(() => {
    setStatusBarTheme('primary');
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        setIsOnline(hijriService.isNetworkOnline());
        
        // Check if date has changed since last refresh
        if (hijriService.hasDateChanged()) {
          console.log('Calendar date has changed - triggering refresh');
          await hijriService.manualFetch();
        }
        
        const hijri = await hijriService.getCurrentHijriDate();
        if (!hijri) {
          console.error('No Hijri date available');
          setLoading(false);
          return;
        }

        const normalizedCurrent = {
          day: Number(hijri.day),
          month: Number(hijri.month),
          year: Number(hijri.year),
        };

        // Calculate target Hijri month/year based on offset
        let targetMonth = normalizedCurrent.month + currentMonth;
        let targetYear = normalizedCurrent.year;
        while (targetMonth > 12) { targetMonth -= 12; targetYear++; }
        while (targetMonth < 1) { targetMonth += 12; targetYear--; }

        const monthCalendar = await hijriService.getHijriMonth(targetMonth, targetYear);
        const monthDays: { [day: number]: { gregorian: Date; hijri: any } } = {};

        if (monthCalendar) {
          monthCalendar.forEach((entry: any) => {
            const h = entry.hijri;
            const g = entry.gregorian;
            monthDays[h.day] = {
              hijri: h,
              gregorian: new Date(g.year, g.month - 1, g.day),
            };
          });
        }

        setHijriData({ current: normalizedCurrent, monthDays });
        setLastUpdate(hijriService.getFormattedLastUpdate());
      } catch (error) {
        console.error('Error loading calendar:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const handleUpdate = () => {
      setIsOnline(hijriService.isNetworkOnline());
      loadData();
    };
    window.addEventListener('hijriDataUpdated', handleUpdate);
    return () => window.removeEventListener('hijriDataUpdated', handleUpdate);
  }, [currentMonth, hijriService]);

  const handleManualRefresh = useCallback(async () => {
    try {
      setManualFetching(true);
      const success = await hijriService.manualFetch();
      if (success) {
        // Force reload data after successful refresh
        setIsOnline(hijriService.isNetworkOnline());
        setLastUpdate(hijriService.getFormattedLastUpdate());
        
        // Reload current month data
        const hijri = await hijriService.getCurrentHijriDate();
        if (hijri) {
          const normalizedCurrent = {
            day: Number(hijri.day),
            month: Number(hijri.month),
            year: Number(hijri.year),
          };

          let targetMonth = normalizedCurrent.month + currentMonth;
          let targetYear = normalizedCurrent.year;
          while (targetMonth > 12) { targetMonth -= 12; targetYear++; }
          while (targetMonth < 1) { targetMonth += 12; targetYear--; }

          const monthCalendar = await hijriService.getHijriMonth(targetMonth, targetYear);
          const monthDays: { [day: number]: { gregorian: Date; hijri: any } } = {};

          if (monthCalendar) {
            monthCalendar.forEach((entry: any) => {
              const h = entry.hijri;
              const g = entry.gregorian;
              monthDays[h.day] = {
                hijri: h,
                gregorian: new Date(g.year, g.month - 1, g.day),
              };
            });
          }

          setHijriData({ current: normalizedCurrent, monthDays });
        }
      }
    } catch (error) {
      console.error('Error during manual refresh:', error);
    } finally {
      setManualFetching(false);
    }
  }, [hijriService, currentMonth]);

  if (loading || !hijriData.current) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 text-primary">
            <RefreshCw className="w-12 h-12 animate-spin" />
          </div>
          <p className="text-foreground font-semibold">Loading Islamic Calendar...</p>
        </div>
      </div>
    );
  }

  const todayHijri = hijriData.current;
  let targetMonth = todayHijri.month + currentMonth;
  let targetYear = Number(todayHijri.year);
  
  while (targetMonth > 12) {
    targetMonth -= 12;
    targetYear++;
  }
  while (targetMonth < 1) {
    targetMonth += 12;
    targetYear--;
  }

  const currentMonthIndex = targetMonth - 1; // 0-based
  const hijriMonths = hijriService.getMonthNames();
  const monthDays = hijriData.monthDays;
  
  // Calculate days in month
  const daysInMonth = Object.keys(monthDays).length > 0 
    ? Math.max(...Object.keys(monthDays).map(Number))
    : 30;
  
  const handlePrevMonth = () => {
    setCurrentMonth(prev => prev - 1);
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => prev + 1);
  };

  const isImportantDate = (day: number) => {
    return importantDates.find((d) => d.date === day && d.month === currentMonthIndex);
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const firstDayOfWeek = monthDays[1]?.gregorian.getDay() ?? 0;
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  return (
    <div className="min-h-screen bg-background pb-20 overflow-y-auto">
      {/* Header - Muslim Pro style */}
      <div className="relative bg-gradient-to-br from-primary via-[#0A6B5D] to-primary text-white p-6 pb-8 overflow-hidden page-header-safe">
        {/* Islamic pattern overlay */}
        <div className="absolute inset-0 opacity-[0.08]">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="cal-pattern" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
              <path d="M7.5 0 L10 5 L7.5 10 L5 5 Z" fill="white" />
              <circle cx="7.5" cy="7.5" r="1" fill="white" />
            </pattern>
            <rect width="100" height="100" fill="url(#cal-pattern)" />
          </svg>
        </div>
        
        <div className="relative z-10 text-center">
          <p className="text-white/70 text-xs font-medium mb-1 uppercase tracking-wider">Hijri Calendar</p>
          <h1 className="text-3xl font-light tracking-tight">Islamic Calendar</h1>
          <p className="text-white/80 text-sm mt-1">{targetYear} AH</p>
          <div className="flex items-center gap-2 text-white/50 text-[10px] mt-2 w-fit mx-auto">
            <span className="flex items-center gap-1">
              {isOnline ? (
                <><Wifi className="w-3 h-3" /> Online</>
              ) : (
                <><WifiOff className="w-3 h-3" /> Offline</>
              )}
            </span>
            <span>• {lastUpdate}</span>
            <button
              onClick={handleManualRefresh}
              disabled={manualFetching || !isOnline}
              className="px-1.5 py-[2px] rounded-full border border-white/25 bg-white/10 text-white/80 text-[9px] hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
              title={isOnline ? 'Refresh now' : 'Go online to refresh'}
            >
              {manualFetching ? '…' : '↺'}
            </button>
          </div>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="p-4 page-first-row-offset">
        <div className="bg-card rounded-2xl shadow-lg p-5 mb-5">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePrevMonth}
              className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-primary" />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-bold text-card-foreground tracking-tight">{hijriMonths[currentMonthIndex]}</h2>
              <p className="text-sm text-muted-foreground font-medium">{targetYear} AH</p>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-primary" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Week day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
              <div key={day} className={`text-center p-2 text-xs font-semibold ${
                index === 5 ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {day}
              </div>
            ))}

            {/* Empty days */}
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}

            {/* Calendar days */}
              {days.map((day) => {
              const importantDate = isImportantDate(day);
              const isToday =
                day === todayHijri.day &&
                currentMonthIndex === todayHijri.month - 1 &&
                targetYear === todayHijri.year;

              // Find gregorian date for this hijri day from monthDays
              const dayData = monthDays[day];
              const gregorianDay = dayData?.gregorian.getDate() || '';
              const gregorianMonth = dayData?.gregorian.toLocaleDateString('en-US', { month: 'short' }) || '';

              return (
                <div
                  key={day}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg relative p-1 ${
                    isToday
                      ? 'bg-primary text-white ring-2 ring-offset-2 ring-primary/60'
                      : importantDate
                      ? importantDate.type === 'eid'
                        ? 'bg-accent text-accent-foreground'
                        : importantDate.type === 'ramadan'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-primary/10 text-primary'
                      : 'text-card-foreground hover:bg-muted'
                  } transition-colors cursor-pointer`}
                >
                  <span className="text-sm font-bold">{day}</span>
                  {gregorianDay && (
                    <span className={`text-[9px] ${isToday ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {gregorianDay} {gregorianMonth}
                    </span>
                  )}
                  {importantDate && (
                    <Star className="w-3 h-3 absolute top-0.5 right-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Important Islamic Dates */}
        <div className="bg-card rounded-2xl shadow-lg p-5 mb-5">
          <h3 className="text-card-foreground font-bold tracking-tight mb-4 text-lg">Important Dates This Month</h3>
          
          <div className="space-y-3">
            {importantDates
              .filter((d) => d.month === currentMonthIndex)
              .map((date, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-l-4 ${
                    date.type === 'eid'
                      ? 'bg-accent/10 border-accent'
                      : date.type === 'ramadan'
                      ? 'bg-primary/10 border-primary'
                      : 'bg-muted/50 border-muted-foreground'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-foreground font-semibold mb-1">{date.event}</h4>
                      <p className="text-sm text-muted-foreground">
                        {date.date} {hijriMonths[date.month]}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        date.type === 'eid'
                          ? 'bg-accent text-white'
                          : date.type === 'ramadan'
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {date.type === 'eid' ? 'Eid' : date.type === 'ramadan' ? 'Ramadan' : 'Special'}
                    </div>
                  </div>
                </div>
              ))}

            {importantDates.filter((d) => d.month === currentMonthIndex).length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No special dates this month
              </p>
            )}
          </div>
        </div>

        {/* All Important Dates */}
        <div className="bg-card rounded-2xl shadow-lg p-5">
          <h3 className="text-card-foreground font-bold tracking-tight mb-4 text-lg">Annual Islamic Events</h3>
          
          <div className="space-y-2">
            {importantDates.map((date, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      date.type === 'eid'
                        ? 'bg-accent'
                        : date.type === 'ramadan'
                        ? 'bg-primary'
                        : 'bg-muted-foreground'
                    }`}
                  />
                  <div>
                    <p className="text-sm text-foreground font-medium">{date.event}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {date.date} {hijriMonths[date.month]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}