import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { 
  getCurrentLocation, 
  requestLocationPermission,
  checkLocationPermission,
  LocationData,
  saveLocation,
  getSavedLocation,
  reverseGeocode
} from '../../services/locationService';
import { 
  getPrayerTimes, 
  PrayerTimesData,
  formatPrayerTime,
  calculationMethods,
  setCalculationTimezone
} from '../../services/prayerService';
import {
  schedulePrayerNotifications,
  requestNotificationPermission,
  checkNotificationPermission,
  areNotificationsEnabled,
  NotificationSettings,
  getNotificationSettings,
  saveNotificationSettings,
  initNotifications,
} from '../../services/notificationService';

interface AppContextType {
  // Location
  location: LocationData | null;
  locationLoading: boolean;
  locationError: string | null;
  requestLocation: () => Promise<void>;
  setManualLocation: (loc: LocationData) => void;
  
  // Prayer Times
  prayerTimes: PrayerTimesData | null;
  prayerTimesLoading: boolean;
  refreshPrayerTimes: () => Promise<void>;
  
  // Permissions
  locationPermissionGranted: boolean;
  notificationPermissionGranted: boolean;
  requestLocationPerm: () => Promise<boolean>;
  requestNotificationPerm: () => Promise<boolean>;
  permissionsChecked: boolean;
  permissionsFlowCompleted: boolean;
  completePermissionsFlow: () => void;
  
  // Notifications
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  
  // Calculation method
  calculationMethod: string;
  setCalculationMethod: (method: string) => void;
  madhab: string;
  setMadhab: (madhab: string) => void;
  
  // Location name
  cityName: string;
  countryName: string;
  
  // Pre-calculated schedule data (calculated during splash screen)
  scheduleData: any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const validStoredCalculationMethod = (() => {
    const stored = localStorage.getItem('calculationMethod');
    return stored && calculationMethods.some(m => m.name === stored)
      ? stored
      : 'Muslim World League';
  })();

  const validStoredMadhab = (() => {
    const stored = localStorage.getItem('madhab');
    return stored === 'Hanafi' ? 'Hanafi' : 'Shafi';
  })();

  const [location, setLocation] = useState<LocationData | null>(getSavedLocation());
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null);
  const [prayerTimesLoading, setPrayerTimesLoading] = useState(false);
  
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(false);
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [permissionsFlowCompleted, setPermissionsFlowCompleted] = useState(
    localStorage.getItem('permissionsFlowCompleted') === 'true'
  );
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(
    getNotificationSettings()
  );
  
  const [calculationMethod, setCalculationMethodState] = useState(validStoredCalculationMethod);
  const [madhab, setMadhabState] = useState(validStoredMadhab);
  
  const [cityName, setCityName] = useState('');
  const [countryName, setCountryName] = useState('');
  
  // Pre-calculated schedule (computed once during splash screen, then reused)
  const [scheduleData, setScheduleData] = useState<any>(null);

  // Check network connectivity
  const checkNetworkConnectivity = async () => {
    let networkConnected = false;
    try {
      const status = await Network.getStatus();
      networkConnected = !!status.connected;
    } catch (e) {
      networkConnected = false;
    }
    const browserOnline = typeof navigator !== 'undefined' ? !!navigator.onLine : false;
    return networkConnected && browserOnline;
  };

  // Check existing permissions on native platform (offline-safe and deterministic)
  const checkExistingPermissions = async () => {
    const savedLocation = getSavedLocation();
    let locationGranted = false;
    let notificationGranted = false;

    // Check location permission
    try {
      const locationPerm = await checkLocationPermission();
      locationGranted = locationPerm.location === 'granted';
      setLocationPermissionGranted(locationGranted);
    } catch (error) {
      console.error('Error checking location permission:', error);
      locationGranted = false;
      setLocationPermissionGranted(false);
    }

    // Check notification permission and OS-level enablement
    try {
      const notificationPerm = await checkNotificationPermission();
      const osEnabled = await areNotificationsEnabled();
      notificationGranted = notificationPerm.display === 'granted' && osEnabled;
      setNotificationPermissionGranted(notificationGranted);
    } catch (error) {
      console.error('Error checking notification permission/enabled:', error);
      notificationGranted = false;
      setNotificationPermissionGranted(false);
    }

    // Determine online status
    const isOnline = await checkNetworkConnectivity();
    console.log('[LocationGating] Online status:', isOnline);

    // Location handling:
    // If permission granted → fetch fresh location
    // If permission denied AND (online + GPS on) → don't use saved location (wait for permissions page to show)
    // If permission denied AND offline → use saved location fallback
    
    if (savedLocation) {
      console.log('[LocationGating] Using saved location (no fresh fetch)');
      setLocation(savedLocation);
      setCityName(savedLocation.city || '');
      setCountryName(savedLocation.country || '');
      if (savedLocation.timezone) {
        setCalculationTimezone(savedLocation.timezone);
      }
    } else if (locationGranted) {
      try {
        console.log('[LocationGating] No saved location, permission granted → fetching once');
        const freshLocation = await getCurrentLocation();
        const geocode = await reverseGeocode(freshLocation.latitude, freshLocation.longitude);
        const locationWithGeocode = {
          ...freshLocation,
          city: geocode.city,
          country: geocode.country,
        };
        saveLocation(locationWithGeocode);
        setLocation(locationWithGeocode);
        setCityName(geocode.city || '');
        setCountryName(geocode.country || '');
        // No timezone from reverse geocode; keep device timezone
        console.log('[LocationGating] Initial location saved');
      } catch (locError) {
        console.error('[LocationGating] Failed to fetch initial location and no saved fallback:', locError);
        setLocation(null);
        setCalculationTimezone(undefined);
      }
    } else if (!locationGranted && isOnline) {
      console.log('[LocationGating] Permission denied AND online → waiting for user to grant (no saved location)');
      setLocation(null);
      setCalculationTimezone(undefined);
    } else if (!locationGranted && !isOnline) {
      console.log('[LocationGating] Permission denied AND offline → no saved location available');
      setLocation(null);
      setCalculationTimezone(undefined);
    }

    // Flow completion: notifications mandatory; location required online,
    // offline allow with saved location fallback
    const hasSavedLocation = !!(savedLocation || getSavedLocation());
    if (notificationGranted && hasSavedLocation) {
      setPermissionsFlowCompleted(true);
      localStorage.setItem('permissionsFlowCompleted', 'true');
    } else {
      setPermissionsFlowCompleted(false);
      localStorage.removeItem('permissionsFlowCompleted');
    }

    setPermissionsChecked(true);
  };

  // Request location permission
  const requestLocationPerm = async (): Promise<boolean> => {
    try {
      console.log('[AppContext] requestLocationPerm - calling requestLocationPermission()');
      const granted = await requestLocationPermission();
      console.log('[AppContext] requestLocationPerm - granted:', granted);
      setLocationPermissionGranted(granted);
      return granted;
    } catch (error) {
      console.error('[AppContext] Failed to request location permission:', error);
      return false;
    }
  };

  // Request notification permission
  const requestNotificationPerm = async (): Promise<boolean> => {
    try {
      const permission = await requestNotificationPermission();
      const granted = permission.display === 'granted';
      setNotificationPermissionGranted(granted);
      return granted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  };

  // Get current location
  const requestLocation = async () => {
    console.log('[requestLocation] Starting location request');
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      console.log('[requestLocation] Calling getCurrentLocation()');
      const loc = await getCurrentLocation();
      console.log('[requestLocation] Got location:', loc);
      const geocode = await reverseGeocode(loc.latitude, loc.longitude);
      console.log('[requestLocation] Got geocode:', geocode);
      const locationWithGeocode = {
        ...loc,
        city: geocode.city,
        country: geocode.country
      };
      saveLocation(locationWithGeocode);
      setLocation(locationWithGeocode);
      setCityName(geocode.city || '');
      setCountryName(geocode.country || '');
      console.log('[requestLocation] Location state updated:', locationWithGeocode);
      setLocationLoading(false);
    } catch (error) {
      // If location fetch fails but we have saved location, use it
      const savedLoc = getSavedLocation();
      if (savedLoc) {
        console.log('[requestLocation] Using saved location due to location fetch error');
        setLocation(savedLoc);
        setCityName(savedLoc.city || '');
        setCountryName(savedLoc.country || '');
        if (savedLoc.timezone) setCalculationTimezone(savedLoc.timezone);
        setLocationLoading(false);
      } else {
        console.error('[requestLocation] Location error:', error);
        setLocationError('Failed to get location. Please enable location services.');
        setLocationLoading(false);
      }
    }
  };

  // Manually set location from a selected city suggestion
  // Clears all previous location/prayer data and forces fresh recalculation
  const setManualLocation = (loc: LocationData) => {
    try {
      console.log('[setManualLocation] RECEIVED location:', JSON.stringify(loc));
      
      setPrayerTimesLoading(true);
      
      // Save new location and update state
      const withNames = { ...loc };
      console.log('[setManualLocation] LOCATION WITH NAMES:', JSON.stringify(withNames));
      
      saveLocation(withNames);
      console.log('[setManualLocation] SAVED TO LOCALSTORAGE');
      
      setLocation(withNames);
      console.log('[setManualLocation] STATE UPDATED with location:', withNames.city, withNames.country, 'TZ:', withNames.timezone);
      
      setCityName(withNames.city || '');
      setCountryName(withNames.country || '');
      
      // Set timezone override BEFORE prayer calculation
      setCalculationTimezone(withNames.timezone);
      console.log('[setManualLocation] TIMEZONE OVERRIDE SET TO:', withNames.timezone);
      
      // Calculate prayer times immediately (synchronously)
      console.log('[setManualLocation] Calculating prayer times immediately');
      const times = getPrayerTimes(
        withNames.latitude,
        withNames.longitude,
        new Date(),
        calculationMethod,
        madhab
      );
      console.log('[setManualLocation] Prayer times calculated:', times);
      setPrayerTimes(times);
      setPrayerTimesLoading(false);
      
      // Mark flow complete if notifications are granted
      if (notificationPermissionGranted) {
        setPermissionsFlowCompleted(true);
        localStorage.setItem('permissionsFlowCompleted', 'true');
      }
    } catch (e) {
      console.error('Failed to set manual location:', e);
      setPrayerTimesLoading(false);
    }
  };

  // Calculate prayer times
  const refreshPrayerTimes = async () => {
    if (!location) {
      console.log('Cannot refresh prayer times: No location');
      return;
    }
    
    setPrayerTimesLoading(true);
    
    try {
      console.log('Calculating prayer times for:', location);
      const times = getPrayerTimes(
        location.latitude,
        location.longitude,
        new Date(),
        calculationMethod,
        madhab
      );
      console.log('Prayer times calculated:', times);
      setPrayerTimes(times);
      
      // Schedule notifications if enabled and permissions flow is complete
      if (notificationPermissionGranted && permissionsFlowCompleted) {
        await schedulePrayerNotifications(times, notificationSettings);
      }
      
      setPrayerTimesLoading(false);
    } catch (error) {
      console.error('Failed to calculate prayer times:', error);
      setPrayerTimesLoading(false);
      // Don't clear existing prayer times on error
    }
  };

  // Update notification settings
  const updateNotificationSettings = async (settings: NotificationSettings) => {
    setNotificationSettings(settings);
    saveNotificationSettings(settings);
    
    // Re-schedule notifications with new settings
    if (prayerTimes && notificationPermissionGranted && permissionsFlowCompleted) {
      await schedulePrayerNotifications(prayerTimes, settings);
    }
  };

  // Update calculation method
  const setCalculationMethod = (method: string) => {
    setCalculationMethodState(method);
    localStorage.setItem('calculationMethod', method);
  };

  // Update madhab
  const setMadhab = (madhabValue: string) => {
    setMadhabState(madhabValue);
    localStorage.setItem('madhab', madhabValue);
  };

  // Complete permissions flow - called when user clicks Continue button
  const completePermissionsFlow = () => {
    setPermissionsFlowCompleted(true);
    localStorage.setItem('permissionsFlowCompleted', 'true');
  };

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      console.log('AppContext initializing...');
      
      // Initialize notification action types and ensure plugin is ready
      try {
        await initNotifications();
        console.log('Notifications initialized');
      } catch (e) {
        console.error('Failed to initialize notifications:', e);
      }

      // Check existing permissions
      await checkExistingPermissions();
    };
    
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync timezone override whenever location changes
  useEffect(() => {
    console.log('[TZ_SYNC_EFFECT] Location changed:', JSON.stringify(location));
    if (location?.timezone) {
      console.log('[TZ_SYNC_EFFECT] Setting timezone override to:', location.timezone);
      setCalculationTimezone(location.timezone);
    } else {
      console.log('[TZ_SYNC_EFFECT] Clearing timezone override, location.timezone is:', location?.timezone);
      setCalculationTimezone(undefined);
    }
  }, [location]);

  // When location is available, calculate prayer times
  useEffect(() => {
    if (!location) {
      console.log('No location available');
      return;
    }
    
    console.log('Calculating prayer times for location:', location);
    const times = getPrayerTimes(
      location.latitude,
      location.longitude,
      new Date(),
      calculationMethod,
      madhab
    );
    console.log('Prayer times calculated:', times);
    setPrayerTimes(times);
    setPrayerTimesLoading(false);  // Clear loading flag when prayer times are set
    
    // Schedule notifications if permissions are granted and flow is complete
    if (notificationPermissionGranted && permissionsFlowCompleted) {
      schedulePrayerNotifications(times, notificationSettings);
    }
  }, [location, calculationMethod, madhab]);

  // Pre-calculate schedule data whenever prayer times change (do this once, not every render)
  useEffect(() => {
    if (!prayerTimes || !location) {
      setScheduleData(null);
      return;
    }

    try {
      // Import functions
      const { formatPrayerTime, calculateTahajjud, getPrayerTimes: getPrayerTimesFunc } = require('../../services/prayerService');
      
      // Calculate tomorrow's Fajr for Tahajjud
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowFajr = getPrayerTimesFunc(
        location.latitude,
        location.longitude,
        tomorrowDate,
        calculationMethod,
        madhab
      ).fajr;
      
      const tahajjud = calculateTahajjud(prayerTimes.isha, tomorrowFajr);

      // Create pre-calculated schedule object
      const schedule = {
        prayers: [
          { name: 'Fajr', time: formatPrayerTime(prayerTimes.fajr, false) },
          { name: 'Dhuhr', time: formatPrayerTime(prayerTimes.dhuhr, false) },
          { name: 'Asr', time: formatPrayerTime(prayerTimes.asr, false) },
          { name: 'Maghrib', time: formatPrayerTime(prayerTimes.maghrib, false) },
          { name: 'Isha', time: formatPrayerTime(prayerTimes.isha, false) },
        ],
        tahajjudStart: formatPrayerTime(tahajjud.start, false),
        tahajjudEnd: formatPrayerTime(tahajjud.end, false),
        sunrise: formatPrayerTime(prayerTimes.sunrise, false),
        sunset: formatPrayerTime(prayerTimes.maghrib, false),
      };

      setScheduleData(schedule);
      console.log('Schedule data pre-calculated and cached');
    } catch (error) {
      console.error('Error pre-calculating schedule data:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prayerTimes, location, calculationMethod, madhab]);

  // Schedule daily refresh at midnight
  useEffect(() => {
    if (!location) return;
    
    const scheduleNextRefresh = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      
      return setTimeout(() => {
        refreshPrayerTimes();
        scheduleNextRefresh();
      }, timeUntilMidnight);
    };
    
    const timeoutId = scheduleNextRefresh();
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, calculationMethod, madhab]);

  const value: AppContextType = {
    location,
    locationLoading,
    locationError,
    requestLocation,
    setManualLocation,
    prayerTimes,
    prayerTimesLoading,
    refreshPrayerTimes,
    locationPermissionGranted,
    notificationPermissionGranted,
    requestLocationPerm,
    requestNotificationPerm,
    permissionsChecked,
    permissionsFlowCompleted,
    completePermissionsFlow,
    notificationSettings,
    updateNotificationSettings,
    calculationMethod,
    setCalculationMethod,
    madhab,
    setMadhab,
    cityName,
    countryName,
    scheduleData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
