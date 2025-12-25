#!/usr/bin/env node

/**
 * Calculate today's prohibited times for The Hague, Netherlands
 * Using the clean prohibition logic
 */

import { PrayerTimeCalculator } from '@masaajid/prayer-times';

// The Hague coordinates
const LAT = 52.0705;
const LNG = 4.3007;
const LOCATION = 'The Hague, Netherlands';

// Buffers (in minutes)
const BUFFERS = {
  afterFajr: 15,      // Fajr + 15 min → Sunrise
  zenith: 5,          // SolarNoon ± 5 min
  afterAsr: 30,       // Asr + 30 min → Sunset
};

// Format time helper
function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// Calculate prayer times
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

// Main calculation
async function main() {
  const today = new Date();
  console.log(`\n📍 Location: ${LOCATION}`);
  console.log(`📅 Date: ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  console.log(`⏰ Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log('\n' + '='.repeat(80) + '\n');

  // Get prayer times
  const times = calculatePrayerTimes(LAT, LNG, today);
  if (!times) {
    console.error('Failed to calculate prayer times');
    return;
  }

  // Display prayer times
  console.log('🕌 PRAYER TIMES:');
  console.log('-'.repeat(80));
  console.log(`  Fajr:     ${formatTime(times.fajr)}`);
  console.log(`  Sunrise:  ${formatTime(times.sunrise)}`);
  console.log(`  Dhuhr:    ${formatTime(times.dhuhr)}`);
  console.log(`  Asr:      ${formatTime(times.asr)}`);
  console.log(`  Maghrib:  ${formatTime(times.maghrib)} (Sunset)`);
  console.log(`  Isha:     ${formatTime(times.isha)}`);
  console.log('\n' + '='.repeat(80) + '\n');

  // Calculate prohibited intervals
  console.log('🚫 PROHIBITED TIMES (Awaqat al-Nahy):');
  console.log('-'.repeat(80) + '\n');

  const prohibitions = [
    {
      name: '1. After Fajr Until Sunrise',
      start: new Date(times.fajr.getTime() + BUFFERS.afterFajr * 60000),
      end: times.sunrise,
      description: 'No voluntary prayers from Fajr + 15min until sunrise',
    },
    {
      name: '2. Sun at Zenith (Midday)',
      start: new Date(times.dhuhr.getTime() - BUFFERS.zenith * 60000),
      end: times.dhuhr, // End at Dhuhr, NOT extending into prayer time
      description: `No voluntary prayers from ${BUFFERS.zenith} minutes before Dhuhr until Dhuhr start`,
    },
    {
      name: '3. After Asr Until Sunset',
      start: new Date(times.asr.getTime() + BUFFERS.afterAsr * 60000),
      end: times.maghrib,
      description: 'No voluntary prayers from Asr + 30min until sunset (Maghrib)',
    },
  ];

  prohibitions.forEach((prob, index) => {
    const duration = (prob.end.getTime() - prob.start.getTime()) / (1000 * 60);
    console.log(`${prob.name}`);
    console.log(`  ⏱️  ${formatTime(prob.start)} → ${formatTime(prob.end)} (${duration.toFixed(0)} minutes)`);
    console.log(`  📝 ${prob.description}`);
    console.log();
  });

  console.log('='.repeat(80));
  console.log('\n✅ Calculation complete!');
  console.log('\nNote: These are the times when VOLUNTARY prayers are NOT allowed.');
  console.log('Obligatory prayers (Salah) can still be performed, but NO voluntary prayers.');
}

main().catch(console.error);
