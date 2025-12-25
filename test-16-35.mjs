#!/usr/bin/env node

/**
 * Test the card display logic at exactly 16:35 in The Hague
 */

import { PrayerTimeCalculator } from '@masaajid/prayer-times';

// The Hague coordinates
const LAT = 52.0705;
const LNG = 4.3007;

// Buffers (in minutes)
const BUFFERS = {
  afterFajr: 15,      // Fajr + 15 min → Sunrise
  zenith: 5,          // SolarNoon ± 5 min
  afterAsr: 30,       // Asr + 30 min → Sunset
  afterMaghrib: 15,   // Maghrib + 15 min (optional)
};

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function calculatePrayerTimes(lat, lng, date) {
  try {
    const calculator = new PrayerTimeCalculator({
      method: 'MWL',
      asrSchool: 'Standard',
      location: [lat, lng],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    const times = calculator.calculate(date);
    return times;
  } catch (error) {
    console.error('Error calculating prayer times:', error);
    return null;
  }
}

function getProhibitedIntervalsClean(times) {
  const intervals = [];

  // 1) After Fajr prohibition
  intervals.push({
    start: new Date(times.fajr.getTime() + BUFFERS.afterFajr * 60000),
    end: times.sunrise,
    label: 'After Fajr',
  });

  // 2) Zenith prohibition
  intervals.push({
    start: new Date(times.dhuhr.getTime() - BUFFERS.zenith * 60000),
    end: times.dhuhr,
    label: 'Zenith',
  });

  // 3) After Asr prohibition
  intervals.push({
    start: new Date(times.asr.getTime() + BUFFERS.afterAsr * 60000),
    end: times.maghrib,
    label: 'After Asr',
  });

  // 4) After Maghrib prohibition
  intervals.push({
    start: new Date(times.maghrib.getTime() + BUFFERS.afterMaghrib * 60000),
    end: times.isha,
    label: 'After Maghrib',
  });

  return intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function getProhibitedTimeInfoClean(now, intervals) {
  const activeInterval = intervals.find(i => now >= i.start && now < i.end);
  
  if (activeInterval) {
    return {
      isProhibited: true,
      label: activeInterval.label,
      endsAt: activeInterval.end,
    };
  }

  return { isProhibited: false };
}

// Main test
async function main() {
  const today = new Date();
  
  // Set time to 16:35
  const testTime = new Date(today);
  testTime.setHours(16, 35, 0, 0);

  console.log(`\n📍 Location: The Hague, Netherlands`);
  console.log(`📅 Date: ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  console.log(`🕐 Test Time: ${formatTime(testTime)}\n`);
  console.log('='.repeat(80) + '\n');

  // Get prayer times
  const times = calculatePrayerTimes(LAT, LNG, today);
  if (!times) {
    console.error('Failed to calculate prayer times');
    return;
  }

  console.log('🕌 PRAYER TIMES:');
  console.log(`  Maghrib:  ${formatTime(times.maghrib)}`);
  console.log(`  Isha:     ${formatTime(times.isha)}`);
  console.log();

  // Get prohibited intervals
  const intervals = getProhibitedIntervalsClean(times);
  console.log('🚫 PROHIBITION INTERVALS:');
  intervals.forEach((i) => {
    const duration = (i.end.getTime() - i.start.getTime()) / (1000 * 60);
    console.log(`  ${i.label}: ${formatTime(i.start)} → ${formatTime(i.end)} (${duration.toFixed(0)} min)`);
  });
  console.log();

  // Check prohibition status at 16:35
  const prohibitedInfo = getProhibitedTimeInfoClean(testTime, intervals);
  console.log('='.repeat(80));
  console.log('\n🔍 AT 16:35:00\n');
  console.log(`isProhibited: ${prohibitedInfo.isProhibited}`);
  if (prohibitedInfo.isProhibited) {
    console.log(`Label: ${prohibitedInfo.label}`);
    console.log(`Ends At: ${formatTime(prohibitedInfo.endsAt)}`);
  } else {
    console.log('✅ NOT prohibited - should show prayer card');
    
    // Check what prayer window should be active
    const maghribEnd = new Date(times.asr.getTime() + BUFFERS.afterAsr * 60000);
    const nextProhibitionStart = new Date(times.maghrib.getTime() + BUFFERS.afterMaghrib * 60000);
    
    console.log(`\nMaghrib starts at: ${formatTime(times.maghrib)}`);
    console.log(`Next prohibition starts at: ${formatTime(nextProhibitionStart)}`);
    console.log(`Prayer window ends at (MIN of both): ${formatTime(new Date(Math.min(nextProhibitionStart.getTime())))}`);
    
    const diffToProhibition = nextProhibitionStart.getTime() - testTime.getTime();
    const minsToProhibition = Math.floor(diffToProhibition / (1000 * 60));
    console.log(`\nTime until prohibition: ${minsToProhibition} minutes`);
    console.log(`Expected card: Maghrib - Ends In ${Math.floor(minsToProhibition / 60)}h ${minsToProhibition % 60}m`);
  }
  
  console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
