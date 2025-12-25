import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTimeFormat } from '../context/TimeFormatContext';
import { useApp } from '../context/AppContext';
import { getPrayerTimes, formatPrayerTime } from '../../services/prayerService';

export function PrayerSchedulePage() {
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [dailyDayIndex, setDailyDayIndex] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const { is24Hour, formatTime } = useTimeFormat();
  const { 
    location, 
    prayerTimes, 
    calculationMethod, 
    madhab
  } = useApp();

  // Generate weekly schedule
  const [weeklySchedule, setWeeklySchedule] = useState<any[]>([]);
  const [monthlySchedule, setMonthlySchedule] = useState<any[]>([]);

  useEffect(() => {
    if (!location) return;

    const schedule = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dayPrayers = getPrayerTimes(
        location.latitude,
        location.longitude,
        date,
        calculationMethod,
        madhab
      );

      schedule.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        fullDate: date,
        isToday: date.toDateString() === today.toDateString(),
        sunrise: formatPrayerTime(dayPrayers.sunrise, false),
        sunset: formatPrayerTime(dayPrayers.maghrib, false),
        prayers: [
          { name: 'Fajr', time: formatPrayerTime(dayPrayers.fajr, false) },
          { name: 'Dhuhr', time: formatPrayerTime(dayPrayers.dhuhr, false) },
          { name: 'Asr', time: formatPrayerTime(dayPrayers.asr, false) },
          { name: 'Maghrib', time: formatPrayerTime(dayPrayers.maghrib, false) },
          { name: 'Isha', time: formatPrayerTime(dayPrayers.isha, false) },
        ]
      });
    }

    setWeeklySchedule(schedule);
    // Default daily view to today (index 0 after shift)
    setDailyDayIndex(0);
  }, [location, calculationMethod, madhab, is24Hour]);

  // Generate monthly schedule
  useEffect(() => {
    if (!location) return;

    const schedule = [];
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      
      const dayPrayers = getPrayerTimes(
        location.latitude,
        location.longitude,
        date,
        calculationMethod,
        madhab
      );

      schedule.push({
        day: i,
        date: date,
        isToday: date.toDateString() === today.toDateString(),
        fajr: formatPrayerTime(dayPrayers.fajr, false),
        dhuhr: formatPrayerTime(dayPrayers.dhuhr, false),
        asr: formatPrayerTime(dayPrayers.asr, false),
        maghrib: formatPrayerTime(dayPrayers.maghrib, false),
        isha: formatPrayerTime(dayPrayers.isha, false),
      });
    }

    setMonthlySchedule(schedule);
  }, [location, calculationMethod, madhab, is24Hour, monthOffset]);

  return (
    <div className="min-h-screen bg-background pb-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/90 text-white p-6 page-header-safe">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-light tracking-tight">Prayer Schedule</h1>
        </div>

        {/* View toggle */}
        <div className="flex gap-2 bg-white/10 rounded-xl p-1.5 backdrop-blur-sm">
          {['daily', 'weekly', 'monthly'].map((viewType) => (
            <button
              key={viewType}
              onClick={() => setView(viewType as any)}
              className={`flex-1 py-2.5 px-4 rounded-lg transition-all font-medium ${
                view === viewType ? 'bg-white text-primary shadow-lg' : 'text-white'
              }`}
            >
              {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule Content */}
      <div className="p-4 page-first-row-offset">
        {view === 'weekly' && weeklySchedule.length > 0 && (
          <div className="space-y-4">
            {weeklySchedule.map((day, index) => (
              <div
                key={index}
                className={`rounded-2xl shadow-md overflow-hidden transition-all ${
                  day.isToday 
                    ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-l-4 border-primary' 
                    : 'bg-card'
                }`}
              >
                  <div className={`p-5 border-b border-border ${
                    day.isToday ? 'bg-primary/10' : 'bg-muted/30'
                  }`}>
                    <h4 className={`font-semibold text-lg tracking-tight ${
                      day.isToday ? 'text-primary font-bold' : 'text-card-foreground'
                    }`}>
                      {day.date}
                      {day.isToday && ' •'}
                    </h4>
                  </div>
                  
                  <div className="p-5">
                    <div className="grid grid-cols-5 gap-4">
                      {day.prayers.map((prayer, pIndex) => (
                        <div
                          key={prayer.name}
                          className="text-center"
                        >
                          <p className="text-xs text-muted-foreground mb-2 font-medium">{prayer.name}</p>
                          <p className="text-sm text-card-foreground font-semibold">{formatTime(prayer.time)}</p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-border/50 flex justify-between text-sm text-muted-foreground font-medium">
                      <span>Sunrise: {formatTime(day.sunrise)}</span>
                      <span>Sunset: {formatTime(day.sunset)}</span>
                    </div>
                  </div>
              </div>
            ))}
          </div>
        )}

        {view === 'daily' && weeklySchedule.length > 0 && (
          <div className="bg-gradient-to-br from-card to-card/80 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setDailyDayIndex(Math.max(0, dailyDayIndex - 1))}
                disabled={dailyDayIndex === 0}
                className="p-3 rounded-xl transition-colors disabled:opacity-30 active:scale-95"
              >
                <ChevronLeft className="w-6 h-6 text-foreground" />
              </button>
              <div className="text-center">
                <h3 className="text-card-foreground font-bold text-xl tracking-tight">{weeklySchedule[dailyDayIndex]?.date}</h3>
              </div>
              <button
                onClick={() => setDailyDayIndex(Math.min(weeklySchedule.length - 1, dailyDayIndex + 1))}
                disabled={dailyDayIndex === weeklySchedule.length - 1}
                className="p-3 rounded-xl transition-colors disabled:opacity-30 active:scale-95"
              >
                <ChevronRight className="w-6 h-6 text-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              {weeklySchedule[dailyDayIndex]?.prayers.map((prayer, index) => (
                <div
                  key={prayer.name}
                  className="flex items-center justify-between p-5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl"
                >
                    <div>
                      <h4 className="text-card-foreground font-semibold text-lg tracking-tight">{prayer.name}</h4>
                    </div>
                    <div className="text-2xl text-card-foreground font-bold tracking-tight">{formatTime(prayer.time)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {view === 'monthly' && monthlySchedule.length > 0 && (
          <div className="bg-gradient-to-br from-card to-card/80 rounded-2xl shadow-xl overflow-hidden">
              {/* Month Header */}
              <div className="bg-primary/10 p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setMonthOffset(monthOffset - 1)}
                    className="p-2 rounded-xl hover:bg-primary/10 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-foreground" />
                  </button>
                  <div className="text-center">
                    <h3 className="text-card-foreground font-bold text-2xl tracking-tight">
                      {monthlySchedule[0]?.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setMonthOffset(monthOffset + 1)}
                    className="p-2 rounded-xl hover:bg-primary/10 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-foreground" />
                  </button>
                </div>
              </div>

              {/* Prayer Times List */}
              <div className="p-4 sm:p-6 space-y-2">
                {/* Header */}
                <div className="grid grid-cols-6 gap-2 pb-3 border-b-2 border-border px-3">
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Date</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Fajr</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Dhuhr</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Asr</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Maghrib</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Isha</p>
                  </div>
                </div>

                {/* Rows */}
                {monthlySchedule.map((dayData, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-6 gap-2 p-3 rounded-xl transition-colors relative ${
                      dayData.isToday
                        ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-l-4 border-primary font-bold' 
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    {dayData.isToday && (
                      <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-primary rounded-full"></div>
                    )}
                    <div className="text-left flex items-center">
                      <p className={`text-sm font-semibold ${dayData.isToday ? 'text-primary' : 'text-foreground'}`}>
                        {dayData.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {dayData.isToday && ' •'}
                      </p>
                    </div>
                    <div className="text-center flex items-center justify-center">
                      <p className={`text-sm font-medium ${dayData.isToday ? 'text-primary' : 'text-foreground'}`}>{formatTime(dayData.fajr)}</p>
                    </div>
                    <div className="text-center flex items-center justify-center">
                      <p className={`text-sm font-medium ${dayData.isToday ? 'text-primary' : 'text-foreground'}`}>{formatTime(dayData.dhuhr)}</p>
                    </div>
                    <div className="text-center flex items-center justify-center">
                      <p className={`text-sm font-medium ${dayData.isToday ? 'text-primary' : 'text-foreground'}`}>{formatTime(dayData.asr)}</p>
                    </div>
                    <div className="text-center flex items-center justify-center">
                      <p className={`text-sm font-medium ${dayData.isToday ? 'text-primary' : 'text-foreground'}`}>{formatTime(dayData.maghrib)}</p>
                    </div>
                    <div className="text-center flex items-center justify-center">
                      <p className={`text-sm font-medium ${dayData.isToday ? 'text-primary' : 'text-foreground'}`}>{formatTime(dayData.isha)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}