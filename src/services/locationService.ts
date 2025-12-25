import { Geolocation, Position, PermissionStatus } from '@capacitor/geolocation';
import { Capacitor, registerPlugin } from '@capacitor/core';

// Native permission plugin interface
interface NativePermissionPlugin {
  requestLocationPermission(): Promise<{ granted: boolean }>;
}

const NativePermission = registerPlugin<NativePermissionPlugin>('NativePermission');

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  country?: string;
  timezone?: string;
}

// Check if running on native platform
const isNative = () => Capacitor.isNativePlatform();

// Request location permissions using native Android code
// This works even when GPS is OFF
export async function requestLocationPermission(): Promise<boolean> {
  try {
    console.log('[LocationService] Checking permission before request...');
    
    // Use native plugin to request permission
    if (Capacitor.isNativePlatform()) {
      console.log('[LocationService] Requesting permission via native plugin...');
      const result = await NativePermission.requestLocationPermission();
      console.log('[LocationService] Native permission result:', result.granted);
      return result.granted;
    } else {
      // Web fallback - use Capacitor Geolocation
      console.log('[LocationService] Web platform, using Capacitor Geolocation...');
      let perm = await Geolocation.checkPermissions();
      
      if (perm.location !== 'granted') {
        await Geolocation.requestPermissions();
      }
      
      perm = await Geolocation.checkPermissions();
      const granted = perm.location === 'granted';
      console.log('[LocationService] Permission granted?', granted);
      return granted;
    }
  } catch (error) {
    console.error('[LocationService] Permission flow failed:', error);
    return false;
  }
}

// Check location permissions
export async function checkLocationPermission(): Promise<PermissionStatus> {
  try {
    const permission = await Geolocation.checkPermissions();
    return permission;
  } catch (error) {
    console.error('Error checking location permission:', error);
    throw error;
  }
}

// Get current location
export async function getCurrentLocation(): Promise<LocationData> {
  try {
    const position: Position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    throw error;
  }
}

// Watch location changes
export async function watchLocation(
  callback: (location: LocationData) => void
): Promise<string> {
  try {
    const id = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
      (position, err) => {
        if (err) {
          console.error('Error watching location:', err);
          return;
        }
        if (position) {
          callback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        }
      }
    );
    return id;
  } catch (error) {
    console.error('Error watching location:', error);
    throw error;
  }
}

// Clear location watch
export async function clearLocationWatch(id: string): Promise<void> {
  try {
    await Geolocation.clearWatch({ id });
  } catch (error) {
    console.error('Error clearing location watch:', error);
    throw error;
  }
}

// Reverse geocoding (using browser API or external service)
export async function reverseGeocode(lat: number, lng: number): Promise<{ city?: string; country?: string }> {
  try {
    // Using OpenStreetMap Nominatim API (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    return {
      city: data.address?.city || data.address?.town || data.address?.village || 'Unknown',
      country: data.address?.country || 'Unknown',
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return { city: 'Unknown', country: 'Unknown' };
  }
}

// Forward geocoding (search by place name)
export async function searchLocationByName(query: string): Promise<LocationData | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`
    );

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0];
    // timezone lookup is optional; loaded dynamically to avoid bundling cost when unused
    let timezone: string | undefined;
    try {
      const { tzLookup } = await import('tz-lookup');
      timezone = tzLookup(Number(first.lat), Number(first.lon));
    } catch (_) {
      timezone = undefined;
    }
    return {
      latitude: Number(first.lat),
      longitude: Number(first.lon),
      city: first.address?.city || first.address?.town || first.address?.village || first.display_name?.split(',')[0]?.trim(),
      country: first.address?.country || first.display_name?.split(',').pop()?.trim(),
      timezone,
    };
  } catch (error) {
    console.error('Error searching location by name:', error);
    return null;
  }
}

// Multi-result forward geocoding with timezone suggestions
export interface LocationSuggestion {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  displayName: string;
  timezone?: string;
}

export async function searchLocations(query: string, limit: number = 8): Promise<LocationSuggestion[]> {
  console.log('[searchLocations] START - query:', query);
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=1`
    );
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    console.log('[searchLocations] Got', data.length, 'results from Nominatim');
    if (!Array.isArray(data) || data.length === 0) return [];

    // Import tz-lookup outside the map to avoid repeated imports
    let tzLookupFn: ((lat: number, lon: number) => string) | null = null;
    try {
      const tzModule = await import('tz-lookup');
      console.log('[searchLocations] tzModule:', tzModule);
      tzLookupFn = tzModule.tzLookup || tzModule.default;
      console.log('[searchLocations] tzLookupFn type:', typeof tzLookupFn, 'value:', tzLookupFn?.toString().substring(0, 50));
      if (!tzLookupFn) {
        console.log('[searchLocations] tzLookupFn is null/undefined after import');
      }
    } catch (e) {
      console.error('[searchLocations] Failed to import tz-lookup:', e);
      tzLookupFn = null;
    }

    const results = data.map((item: any) => {
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      const city = item.address?.city || item.address?.town || item.address?.village || item.display_name?.split(',')[0]?.trim() || 'Unknown';
      const country = item.address?.country || item.display_name?.split(',').pop()?.trim() || 'Unknown';
      const displayName = `${city}, ${country}`;
      let timezone: string | undefined;
      
      if (tzLookupFn) {
        try {
          timezone = tzLookupFn(lat, lon);
          console.log('[searchLocations] Timezone for', city, '(', lat, ',', lon, '):', timezone);
        } catch (tzError) {
          console.error('[searchLocations] tzLookup execution error for', city, ':', tzError);
          timezone = undefined;
        }
      } else {
        console.log('[searchLocations] tzLookupFn not available, skipping timezone for', city);
        timezone = undefined;
      }
      
      return { latitude: lat, longitude: lon, city, country, displayName, timezone };
    });
    
    console.log('[searchLocations] Returning', results.length, 'results with timezones');
    return results;
  } catch (error) {
    console.error('Error searching locations:', error);
    return [];
  }
}

// Save location to local storage
export function saveLocation(location: LocationData): void {
  localStorage.setItem('savedLocation', JSON.stringify(location));
}

// Get saved location from local storage
export function getSavedLocation(): LocationData | null {
  const saved = localStorage.getItem('savedLocation');
  return saved ? JSON.parse(saved) : null;
}

// Clear saved location
export function clearSavedLocation(): void {
  localStorage.removeItem('savedLocation');
}

// Check if GPS/Location Services are enabled by attempting to get position
export async function isGpsEnabled(): Promise<boolean> {
  try {
    console.log('[LocationService] Checking if GPS is enabled...');
    await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 2000,
      maximumAge: 0,
    });
    console.log('[LocationService] GPS is enabled');
    return true;
  } catch (error: any) {
    const message = (error?.message || '').toLowerCase();
    const gpsOff =
      message.includes('not enabled') ||
      message.includes('location services are not enabled') ||
      message.includes('location services are disabled') ||
      message.includes('location services off');
    
    if (gpsOff) {
      console.log('[LocationService] GPS is disabled');
      return false;
    }
    
    // Permission issue or other error - check permission status
    try {
      const permission = await checkLocationPermission();
      if (permission.location !== 'granted') {
        console.log('[LocationService] Permission not granted, cannot determine GPS status');
        return false;
      }
    } catch (permError) {
      console.error('[LocationService] Permission check failed:', permError);
    }
    
    console.log('[LocationService] GPS status uncertain, assuming disabled:', error);
    return false;
  }
}
