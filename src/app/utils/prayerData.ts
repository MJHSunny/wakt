// Prayer times data and utilities

export interface PrayerTime {
  name: string;
  time: string;
}

export interface DaySchedule {
  date: string;
  hijriDate: string;
  prayers: PrayerTime[];
  sunrise: string;
  sunset: string;
}

// Get current day's prayer times (mock data)
export function getTodayPrayerTimes(): DaySchedule {
  return {
    date: new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    hijriDate: '20 Jumada Al-Thani 1446',
    prayers: [
      { name: 'Fajr', time: '05:55' },
      { name: 'Dhuhr', time: '11:58' },
      { name: 'Asr', time: '14:23' },
      { name: 'Maghrib', time: '16:35' },
      { name: 'Isha', time: '18:00' },
      { name: 'Tahajjud', time: '03:00' },
    ],
    sunrise: '07:14',
    sunset: '16:35',
  };
}

// Calculate time until next prayer
export function getNextPrayer(): { prayer: PrayerTime; timeRemaining: string } | null {
  const schedule = getTodayPrayerTimes();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const prayer of schedule.prayers) {
    const [hours, minutes] = prayer.time.split(':').map(Number);
    const prayerMinutes = hours * 60 + minutes;

    if (prayerMinutes > currentMinutes) {
      const diff = prayerMinutes - currentMinutes;
      const hoursLeft = Math.floor(diff / 60);
      const minutesLeft = diff % 60;
      
      return {
        prayer,
        timeRemaining: `${hoursLeft}h ${minutesLeft}m`,
      };
    }
  }

  // If no prayer left today, return Fajr tomorrow
  const fajr = schedule.prayers[0];
  const [hours, minutes] = fajr.time.split(':').map(Number);
  const fajrMinutes = hours * 60 + minutes;
  const diff = (24 * 60) - currentMinutes + fajrMinutes;
  const hoursLeft = Math.floor(diff / 60);
  const minutesLeft = diff % 60;

  return {
    prayer: fajr,
    timeRemaining: `${hoursLeft}h ${minutesLeft}m`,
  };
}

// Get current prayer period and when it ends
export function getCurrentPrayer(): { prayer: PrayerTime; endsAt: string; timeRemaining: string } | null {
  const schedule = getTodayPrayerTimes();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Only consider the 5 daily prayers (exclude Tahajjud for current prayer logic)
  const mainPrayers = schedule.prayers.slice(0, 5);
  
  // Find which prayer period we're currently in
  let currentPrayerIndex = -1;
  
  for (let i = 0; i < mainPrayers.length; i++) {
    const [hours, minutes] = mainPrayers[i].time.split(':').map(Number);
    const prayerMinutes = hours * 60 + minutes;

    if (currentMinutes >= prayerMinutes) {
      currentPrayerIndex = i;
    } else {
      break;
    }
  }

  // If we're before Fajr, we're still in Isha from yesterday
  if (currentPrayerIndex === -1) {
    const fajr = mainPrayers[0];
    const [hours, minutes] = fajr.time.split(':').map(Number);
    const fajrMinutes = hours * 60 + minutes;
    const diff = fajrMinutes - currentMinutes;
    const hoursLeft = Math.floor(diff / 60);
    const minutesLeft = diff % 60;

    return {
      prayer: { name: 'Isha', time: mainPrayers[4].time },
      endsAt: fajr.time,
      timeRemaining: `${hoursLeft}h ${minutesLeft}m`,
    };
  }

  // Get current prayer and when it ends
  const currentPrayer = mainPrayers[currentPrayerIndex];
  const nextPrayerIndex = currentPrayerIndex + 1;

  // If we're in Isha (last prayer), it ends at Fajr tomorrow
  if (nextPrayerIndex >= mainPrayers.length) {
    const fajr = mainPrayers[0];
    const [hours, minutes] = fajr.time.split(':').map(Number);
    const fajrMinutes = hours * 60 + minutes;
    const diff = (24 * 60) - currentMinutes + fajrMinutes;
    const hoursLeft = Math.floor(diff / 60);
    const minutesLeft = diff % 60;

    return {
      prayer: currentPrayer,
      endsAt: fajr.time,
      timeRemaining: `${hoursLeft}h ${minutesLeft}m`,
    };
  }

  // Calculate time until next prayer (end of current prayer period)
  const nextPrayer = mainPrayers[nextPrayerIndex];
  const [hours, minutes] = nextPrayer.time.split(':').map(Number);
  const nextPrayerMinutes = hours * 60 + minutes;
  const diff = nextPrayerMinutes - currentMinutes;
  const hoursLeft = Math.floor(diff / 60);
  const minutesLeft = diff % 60;

  return {
    prayer: currentPrayer,
    endsAt: nextPrayer.time,
    timeRemaining: `${hoursLeft}h ${minutesLeft}m`,
  };
}

// Get weekly prayer schedule
export function getWeeklySchedule(): DaySchedule[] {
  const days = [];
  const baseDate = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + i);
    
    days.push({
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      hijriDate: `${20 + i} Jumada Al-Thani 1446`,
      prayers: [
        { name: 'Fajr', time: '05:55' },
        { name: 'Dhuhr', time: '11:58' },
        { name: 'Asr', time: '14:23' },
        { name: 'Maghrib', time: '16:35' },
        { name: 'Isha', time: '18:00' },
      ],
      sunrise: '07:14',
      sunset: '16:35',
    });
  }
  
  return days;
}

// Hijri calendar months
export const hijriMonths = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  'Shaban',
  'Ramadan',
  'Shawwal',
  'Dhul-Qadah',
  'Dhul-Hijjah',
];

// Important Islamic dates
export interface IslamicDate {
  date: number;
  month: number;
  event: string;
  type: 'eid' | 'special' | 'ramadan';
}

export const importantDates: IslamicDate[] = [
  { date: 1, month: 0, event: 'Islamic New Year', type: 'special' },
  { date: 10, month: 0, event: 'Day of Ashura', type: 'special' },
  { date: 12, month: 2, event: 'Mawlid al-Nabi', type: 'special' },
  { date: 27, month: 6, event: 'Isra and Miraj', type: 'special' },
  { date: 1, month: 8, event: 'Start of Ramadan', type: 'ramadan' },
  { date: 27, month: 8, event: 'Laylat al-Qadr', type: 'ramadan' },
  { date: 1, month: 9, event: 'Eid al-Fitr', type: 'eid' },
  { date: 9, month: 11, event: 'Day of Arafah', type: 'special' },
  { date: 10, month: 11, event: 'Eid al-Adha', type: 'eid' },
];