/**
 * Qibla Direction Calculator
 * Calculates the direction to the Kaaba in Mecca from any location on Earth
 */

// Kaaba coordinates (Mecca, Saudi Arabia)
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculates the haversine distance between two coordinates
 * Returns distance in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the initial bearing (azimuth) from point A to point B
 * Returns bearing in degrees (0-360, where 0 is North, 90 is East, etc.)
 */
export function calculateQiblaDirection(userLat: number, userLng: number): number {
  const lat1 = toRadians(userLat);
  const lat2 = toRadians(KAABA_LAT);
  const dLng = toRadians(KAABA_LNG - userLng);

  const x = Math.sin(dLng) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let bearing = toDegrees(Math.atan2(x, y));

  // Normalize to 0-360 range
  bearing = (bearing + 360) % 360;

  return Math.round(bearing);
}

/**
 * Converts bearing to compass direction (N, NE, E, SE, S, SW, W, NW, etc.)
 */
export function bearingToCompassDirection(bearing: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

/**
 * Get distance from user location to Kaaba
 */
export function getDistanceToKaaba(userLat: number, userLng: number): number {
  return calculateDistance(userLat, userLng, KAABA_LAT, KAABA_LNG);
}

/**
 * Get full Qibla information
 */
export function getQiblaInfo(userLat: number, userLng: number) {
  const qiblaDirection = calculateQiblaDirection(userLat, userLng);
  const direction = bearingToCompassDirection(qiblaDirection);
  const distance = getDistanceToKaaba(userLat, userLng);

  return {
    bearing: qiblaDirection,
    direction,
    distance: Math.round(distance),
    kaaba: {
      latitude: KAABA_LAT,
      longitude: KAABA_LNG,
      name: 'Kaaba, Mecca',
    },
  };
}
