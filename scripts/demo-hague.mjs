import { PrayerTimeCalculator } from '@masaajid/prayer-times';

function fmt(date, tz = 'Europe/Amsterdam', use24 = true) {
  return date.toLocaleTimeString('en-GB', {
    hour: use24 ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: !use24,
    timeZone: tz,
  });
}

// The Hague, Netherlands
const lat = 52.0705;
const lng = 4.3007;
const timezone = 'Europe/Amsterdam';
const method = 'MWL';
const asrSchool = 'Standard'; // Shafi default

// Use the date requested: Dec 23, 2025
const date = new Date('2025-12-23T00:00:00+01:00');

const calc = new PrayerTimeCalculator({
  method,
  asrSchool,
  location: [lat, lng],
  timezone,
});

const times = calc.calculate(date);
const sunnah = calc.getSunnahTimes(date);

// Tomorrow for Isha end-at Fajr
const tomorrow = new Date(date);
const tzOffsetMs = 24 * 60 * 60 * 1000;
 tomorrow.setTime(tomorrow.getTime() + tzOffsetMs);
const tomorrowTimes = calc.calculate(tomorrow);

// Prohibited windows
const sunrise = times.sunrise;
const sunset = times.maghrib;
const asr = times.asr;
const sunriseBufferMinutes = 15;
const zenithBufferMinutes = 5;
const sunriseEnd = new Date(sunrise.getTime() + sunriseBufferMinutes * 60000);
// Model zenith prohibition as a short window ending exactly at Dhuhr
const zenithEnd = times.dhuhr;
const zenithStart = new Date(zenithEnd.getTime() - zenithBufferMinutes * 60000);

const lines = [];
lines.push('Full-Day Demo: The Hague, NL (Europe/Amsterdam) - 23 Dec 2025');
lines.push('');
lines.push(`Fajr:      ${fmt(times.fajr)}  (Ends: Sunrise ${fmt(times.sunrise)})`);
lines.push(`Sunrise:   ${fmt(times.sunrise)}`);
lines.push(`Dhuhr:     ${fmt(times.dhuhr)}  (Ends: Asr ${fmt(times.asr)})`);
lines.push(`Asr:       ${fmt(times.asr)}  (Ends: Maghrib ${fmt(times.maghrib)})`);
lines.push(`Maghrib:   ${fmt(times.maghrib)}  (Ends: Isha ${fmt(times.isha)})`);
lines.push(`Isha:      ${fmt(times.isha)}  (Ends: Fajr ${fmt(tomorrowTimes.fajr)})`);
lines.push('');
lines.push('Descriptions:');
lines.push("- Asr (Afternoon): Begins when an object's shadow reaches a specific length relative to its height.");
lines.push('- Maghrib (Sunset): Begins immediately after the sun sets below the horizon.');
lines.push('');
lines.push('Prohibited Times:');
lines.push(`- After Fajr until Sunrise: Sunrise to ~${sunriseBufferMinutes} min after → ends ${fmt(sunriseEnd)}`);
lines.push(`- At Zenith (Midday): ${fmt(zenithStart)} → ${fmt(zenithEnd)} (ends at Dhuhr)`);
lines.push(`- From Asr until Sunset: ${fmt(asr)} → ${fmt(sunset)}`);
lines.push('');

console.log(lines.join('\n'));
