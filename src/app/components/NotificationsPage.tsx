import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Volume2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { adhanNotificationService } from '../../services/adhanNotificationService';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getTodayPrayerTimes } from '../utils/prayerData';
import { formatPrayerTime, getPrayerWindows } from '../../services/prayerService';
import { setStatusBarTheme } from '../services/statusBarTheme';

export function NotificationsPage() {
  const { prayerTimes, location, calculationMethod, madhab } = useApp();
  const { theme } = useTheme();

  // Use the standard teal primary status bar like other pages
  useEffect(() => {
    setStatusBarTheme('primary');
  }, []);

  const STORAGE_KEY = 'wakt_notification_toggles';
  const ADHAN_STORAGE_KEY = 'wakt_adhan_toggles';

  const loadSavedToggles = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          fajr: parsed.fajr ?? true,
          dhuhr: parsed.dhuhr ?? true,
          asr: parsed.asr ?? true,
          maghrib: parsed.maghrib ?? true,
          isha: parsed.isha ?? true,
        } as typeof notifications;
      }
    } catch (err) {
      console.error('Failed to load notification toggles', err);
    }
    return {
      fajr: true,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: true,
    } as const;
  };

  const loadSavedAdhanToggles = () => {
    try {
      const raw = localStorage.getItem(ADHAN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          fajr: parsed.fajr ?? false,
          dhuhr: parsed.dhuhr ?? false,
          asr: parsed.asr ?? false,
          maghrib: parsed.maghrib ?? false,
          isha: parsed.isha ?? false,
        } as typeof adhanEnabled;
      }
    } catch (err) {
      console.error('Failed to load adhan toggles', err);
    }
    return {
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false,
    } as const;
  };

  const [notifications, setNotifications] = useState(loadSavedToggles);
  const [adhanEnabled, setAdhanEnabled] = useState(loadSavedAdhanToggles);

  const [adhanSound, setAdhanSound] = useState(() => {
    try {
      return localStorage.getItem('adhanSound') || 'athan_makkah';
    } catch {
      return 'athan_makkah';
    }
  });

  // Initialize default sound on first load
  useEffect(() => {
    try {
      if (!localStorage.getItem('adhanSound')) {
        localStorage.setItem('adhanSound', 'athan_makkah');
      }
    } catch (err) {
      console.error('Failed to set default sound', err);
    }
  }, []);

  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [batteryOptDisabled, setBatteryOptDisabled] = useState<boolean | null>(null);

  // Keep native (Android) CapacitorStorage in sync with in-app toggles so
  // AdhanAlarmService/AdhanService can read the latest values.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const sync = async () => {
      try {
        await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(notifications) });
      } catch (err) {
        console.error('Failed to sync notification toggles to native storage', err);
      }
    };

    sync();
  }, [notifications]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const sync = async () => {
      try {
        await Preferences.set({ key: ADHAN_STORAGE_KEY, value: JSON.stringify(adhanEnabled) });
      } catch (err) {
        console.error('Failed to sync adhan toggles to native storage', err);
      }
    };

    sync();
  }, [adhanEnabled]);

  // Persist selected Adhan sound into CapacitorStorage so the
  // native notification channel and services can read it.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const syncSound = async () => {
      try {
        await Preferences.set({ key: 'adhanSound', value: adhanSound });
      } catch (err) {
        console.error('Failed to sync adhan sound to native storage', err);
      }
    };

    syncSound();
  }, [adhanSound]);

  const mainPrayers = useMemo(() => {
    // Build from real prayer times when available; fallback to mock data
    if (prayerTimes && location) {
      const windows = getPrayerWindows(
        location.latitude,
        location.longitude,
        new Date(),
        calculationMethod || 'Muslim World League',
        madhab || 'Shafi'
      );

      const use12h = localStorage.getItem('use12hFormat') === 'true';
      const ordered = [
        { key: 'fajr' as const, name: 'Fajr', date: prayerTimes.fajr },
        { key: 'dhuhr' as const, name: 'Dhuhr', date: prayerTimes.dhuhr },
        { key: 'asr' as const, name: 'Asr', date: prayerTimes.asr },
        { key: 'maghrib' as const, name: 'Maghrib', date: prayerTimes.maghrib },
        { key: 'isha' as const, name: 'Isha', date: prayerTimes.isha },
      ];

      return ordered.map((p, idx) => {
        const time24 = formatPrayerTime(p.date, false); // HH:mm 24h for scheduling
        const window = windows[p.name];
        
        let timeWindowStr = '';
        if (window) {
          const startStr = formatPrayerTime(window.start, use12h);
          const endStr = formatPrayerTime(window.end, use12h);
          timeWindowStr = `${startStr} - ${endStr}`;
        }
        
        return {
          key: p.key,
          name: p.name,
          time24,
          timeWindow: timeWindowStr,
          requestCode: 100 + idx,
        };
      });
    }

    const fallback = getTodayPrayerTimes();
    return fallback.prayers
      .filter((p) => ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(p.name))
      .map((p, idx) => ({
        key: p.name.toLowerCase() as keyof typeof notifications,
        name: p.name,
        time24: p.time,
        timeWindow: '',
        requestCode: 100 + idx,
      }));
  }, [prayerTimes, location, calculationMethod, madhab]);

  const toggleNotification = (prayer: keyof typeof notifications) => {
    const nextEnabled = !notifications[prayer];
    setNotifications((prev) => {
      const updated = {
        ...prev,
        [prayer]: nextEnabled,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to persist notification toggles', err);
      }
      return updated;
    });

    // If turning off notification, also disable adhan
    if (!nextEnabled && adhanEnabled[prayer]) {
      setAdhanEnabled((prev) => {
        const updated = {
          ...prev,
          [prayer]: false,
        };
        try {
          localStorage.setItem(ADHAN_STORAGE_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to persist adhan toggles', err);
        }
        return updated;
      });
    }

    const prayerMeta = mainPrayers.find((p) => p.key === prayer);
    if (!prayerMeta) return;

    if (!Capacitor.isNativePlatform()) return;

    if (nextEnabled) {
      // Turning on: schedule for today at listed time
      adhanNotificationService
        .schedulePrayerAlarm(prayerMeta.name, prayerMeta.time24, prayerMeta.requestCode, prayerMeta.timeWindow)
        .catch((err) => console.error('Failed to schedule alarm', err));
    } else {
      // Turning off: cancel existing alarm
      adhanNotificationService
        .cancelPrayerAlarm(prayerMeta.name, prayerMeta.requestCode)
        .catch((err) => console.error('Failed to cancel alarm', err));
    }
  };

  const toggleAdhan = (prayer: keyof typeof adhanEnabled) => {
    // Only allow toggling adhan if notification is enabled
    if (!notifications[prayer]) return;

    const nextEnabled = !adhanEnabled[prayer];
    setAdhanEnabled((prev) => {
      const updated = {
        ...prev,
        [prayer]: nextEnabled,
      };
      try {
        localStorage.setItem(ADHAN_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to persist adhan toggles', err);
      }
      return updated;
    });
  };

  // Re-schedule alarms if times change while toggles remain on (e.g., after refresh/location change)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    mainPrayers.forEach((prayer) => {
      if (notifications[prayer.key]) {
        adhanNotificationService
          .schedulePrayerAlarm(prayer.name, prayer.time24, prayer.requestCode, prayer.timeWindow)
          .catch((err) => console.error('Failed to schedule alarm', err));
      } else {
        // Ensure cancelled if user turned it off and times changed
        adhanNotificationService
          .cancelPrayerAlarm(prayer.name, prayer.requestCode)
          .catch((err) => console.error('Failed to cancel alarm', err));
      }
    });
  }, [mainPrayers, notifications]);
  
  // Check battery optimization status on mount
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      adhanNotificationService.isBatteryOptimizationDisabled()
        .then(isDisabled => setBatteryOptDisabled(isDisabled))
        .catch(err => console.error('Failed to check battery optimization', err));
    }

    // Recheck battery status when page becomes visible (user might have changed permission)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Capacitor.isNativePlatform()) {
        adhanNotificationService.isBatteryOptimizationDisabled()
          .then(isDisabled => setBatteryOptDisabled(isDisabled))
          .catch(err => console.error('Failed to recheck battery optimization', err));
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Auto-refresh prayer times at midnight to show next day
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 1, 0);

      const timeUntilMidnight = tomorrow.getTime() - now.getTime();

      const timer = setTimeout(() => {
        console.log('Refreshing prayer times for new day');
        // Trigger refresh by calling refreshPrayerTimes from context
        window.location.reload(); // Simple refresh - you can optimize this
      }, timeUntilMidnight);

      return timer;
    };

    const timer = checkMidnight();
    return () => clearTimeout(timer);
  }, []);
  
  const handleRequestBatteryOptimization = async () => {
    try {
      await adhanNotificationService.requestDisableBatteryOptimization();
      alert(
        'Battery optimization settings screen opened. Please set Wakt to "Don\'t optimize" or "Unrestricted" and then return to the app.'
      );
      // Recheck after a longer delay to allow system to register the change
      setTimeout(async () => {
        const isDisabled = await adhanNotificationService.isBatteryOptimizationDisabled();
        setBatteryOptDisabled(isDisabled);
      }, 2000);
    } catch (err) {
      console.error('Failed to request battery optimization', err);
      alert(
        'Could not open the battery optimization settings automatically. Please go to System Settings → Apps → Wakt → Battery and set it to "Don\'t optimize" / "Unrestricted".'
      );
    }
  };

  const adhanSounds = [
    { value: 'adhan', label: 'Default Adhan' },
    { value: 'athan_abed_albase6', label: 'Abed Albasset' },
    { value: 'athan_ahmad_nuyne3', label: 'Ahmad Nuyne' },
    { value: 'athan_alfajer_malek_chebae', label: 'Al-Fajer - Malek Chebae' },
    { value: 'athan_hamad_deghreri', label: 'Hamad Deghreri' },
    { value: 'athan_hamdan_almalki', label: 'Hamdan Al-Malki' },
    { value: 'athan_ibrahim_alarkani', label: 'Ibrahim Al-Arkani' },
    { value: 'athan_majed_alhamathani', label: 'Majed Al-Hamathani' },
    { value: 'athan_makkah', label: 'Makkah Adhan' },
    { value: 'athan_mansoor_azzahrani', label: 'Mansoor Al-Zahrani' },
    { value: 'athan_mishary_alafasi', label: 'Mishary Al-Afasi' },
    { value: 'athan_mohammad_almenshawy', label: 'Mohammad Al-Menshawy' },
    { value: 'athan_mohammad_ref3at', label: 'Mohammad Refaat' },
    { value: 'athan_nasser_alqatami', label: 'Nasser Al-Qatami' },
    { value: 'athan_suhaib_khatba', label: 'Suhaib Khatba' },
  ];

  const handleSoundChange = async (value: string) => {
    setAdhanSound(value);
    try {
      localStorage.setItem('adhanSound', value);
      // Update notification channel with new sound
      if (Capacitor.isNativePlatform()) {
        await adhanNotificationService.updateNotificationSound();
      }
    } catch (err) {
      console.error('Failed to save sound preference', err);
    }
  };

  const playPreview = async () => {
    if (isPlayingPreview) {
      try {
        await adhanNotificationService.stopPreview();
      } catch (err) {
        console.error('Failed to stop preview:', err);
      }
      setIsPlayingPreview(false);
      return;
    }

    setIsPlayingPreview(true);
    try {
      await adhanNotificationService.previewAdhan(adhanSound);
    } catch (err) {
      console.error('Preview playback failed:', err);
      alert('Failed to play preview. Please try again.');
      setIsPlayingPreview(false);
    }
  };

  // Show loading if no prayer times yet
  if (!prayerTimes) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <Bell className="w-16 h-16 text-primary mx-auto mb-4" />
          <p className="text-foreground">Loading prayer times...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-y-auto">
      <div className={`bg-gradient-to-br text-center p-6 page-header-safe ${theme === 'light' ? 'from-primary via-[#0A6B5D] to-primary text-white' : 'from-primary to-primary/80 text-white'}`}>
        <h1 className="text-3xl mb-2 font-light text-white">Notifications & Settings</h1>
        <p className="text-sm text-white/80">Manage prayer alerts and preferences</p>
      </div>

      <div className="p-4 page-first-row-offset space-y-6">
        {/* Battery Optimization Warning - CRITICAL */}
        {Capacitor.isNativePlatform() && batteryOptDisabled === false && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-red-600 text-lg mt-0.5">🚨</div>
              <div className="flex-1">
                <h4 className="font-bold text-red-900 mb-1 text-lg">
                  CRITICAL: Alarms Won't Trigger When App is Closed
                </h4>
                <p className="text-sm text-red-800 mb-3">
                  Battery optimization is preventing alarms from working in the background. Your prayer alarms will NOT trigger unless you disable battery optimization right now.
                </p>
                <button
                  onClick={handleRequestBatteryOptimization}
                  className="bg-red-700 text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-red-800 w-full"
                >
                  🔥 DISABLE BATTERY OPTIMIZATION NOW
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-card rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-6 h-6 text-primary" />
            <h3 className="text-card-foreground font-semibold">Prayer Notifications</h3>
          </div>

          <div className="space-y-4">
            {mainPrayers.map((prayer) => (
              <div
                key={prayer.key}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 gap-3"
              >
                <div>
                  <p className="text-foreground font-medium">{prayer.name}</p>
                  <p className="text-xs text-muted-foreground">{prayer.time24}</p>
                </div>
                <div className="flex gap-2">
                  {/* Notification Toggle */}
                  <button
                    onClick={() => toggleNotification(prayer.key)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                      notifications[prayer.key]
                        ? 'bg-blue-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                    title="Toggle notification alert"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="text-xs font-medium">Notify</span>
                  </button>

                  {/* Adhan Toggle - Only visible if notification is on */}
                  {notifications[prayer.key] && (
                    <button
                      onClick={() => toggleAdhan(prayer.key)}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                        adhanEnabled[prayer.key]
                          ? 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
                      }`}
                      title="Toggle adhan sound"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span className="text-xs font-medium">Adhan</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Volume2 className="w-6 h-6 text-primary" />
            <h3 className="text-card-foreground font-semibold">Adhan Sound</h3>
          </div>

          <select
            value={adhanSound}
            onChange={(e) => handleSoundChange(e.target.value)}
            className="w-full p-3 bg-input-background rounded-lg border border-border text-foreground mb-3"
          >
            {adhanSounds.map((sound) => (
              <option key={sound.value} value={sound.value}>
                {sound.label}
              </option>
            ))}
          </select>

          <button
            onClick={playPreview}
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Volume2 className="w-5 h-5" />
            {isPlayingPreview ? 'Stop Preview' : 'Play Sound Preview'}
          </button>
        </div>
      </div>
    </div>
  );
}
