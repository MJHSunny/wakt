import React, { useRef, useState } from 'react';
import { MapPin, Bell, Check, ChevronRight, Shield, CheckCircle2, Info, Loader2, Radio, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';
import { SystemSettings } from '../../services/systemSettings';
import { isGpsEnabled } from '../../services/locationService';
import { useApp } from '../context/AppContext';
// Removed alert-dialog for GPS enable to avoid conflicting popup

interface PermissionsPageSetupProps {
  isEUUser: boolean;
  onComplete: () => void;
  startAtStep?: 'welcome' | 'gdpr';
  notificationOnly?: boolean; // When true, show only notification setup (mandatory blocking mode)
}

export function PermissionsPageSetup({ isEUUser, onComplete, startAtStep = 'welcome', notificationOnly = false }: PermissionsPageSetupProps) {
  const {
    location,
    cityName,
    countryName,
    locationLoading,
    requestLocation,
    requestLocationPerm,
    requestNotificationPerm,
    locationPermissionGranted,
    notificationPermissionGranted,
  } = useApp();

  const [currentStep, setCurrentStep] = useState(startAtStep === 'gdpr' ? 3 : 0);
  const [locationGranted, setLocationGranted] = useState(locationPermissionGranted);
  const [notificationGranted, setNotificationGranted] = useState(notificationPermissionGranted);
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [locationDeniedLocked, setLocationDeniedLocked] = useState(false);
  // Removed GPS dialog states
  const [online, setOnline] = useState<boolean | null>(null);
  const initializedStepRef = useRef(false);

  // Live online/offline detection
  React.useEffect(() => {
    const init = async () => {
      try {
        const status = await Network.getStatus();
        const browserOnline = typeof navigator !== 'undefined' ? !!navigator.onLine : false;
        setOnline(!!status.connected && browserOnline);
      } catch {
        // Fallback to browser online if Network fails
        const browserOnline = typeof navigator !== 'undefined' ? !!navigator.onLine : false;
        setOnline(browserOnline);
      }
    };

    init();

    const handler = Network.addListener('networkStatusChange', (status) => {
      const browserOnline = typeof navigator !== 'undefined' ? !!navigator.onLine : false;
      setOnline(!!status.connected && browserOnline);
    });

    return () => {
      handler.then(h => h.remove()).catch(() => {});
    };
  }, []);

  const handleLocationGrant = async () => {
    setError(null);
    setDetecting(true);

    // If we already detected a locked denial, go straight to app settings
    if (locationDeniedLocked) {
      setDetecting(false);
      try {
        await App.openUrl({ url: 'app-settings:' });
      } catch {
        try { await App.openUrl({ url: 'android-app://com.android.settings/com.android.settings.Settings' }); } catch {}
      }
      return;
    }

    try {
      const gpsOn = await isGpsEnabled();
      if (!gpsOn) {
        try {
          await App.openUrl({ url: 'android-app://com.android.settings/com.android.settings.Settings$LocationSourceSettingsActivity' });
        } catch (e1) {
          try { await App.openUrl({ url: 'android-app://com.android.settings/com.android.settings.Settings' }); } catch {}
        }
        setDetecting(false);
        return;
      }

      const granted = await requestLocationPerm();

      if (!granted) {
        setLocationGranted(false);
        setDetecting(false);
        setLocationDeniedLocked(true);
        setError('Location permission required. The dialog may be blocked; open App Settings.');
        return;
      }

      try {
        await requestLocation();
        setLocationGranted(true);
        setLocationDeniedLocked(false);
        setDetecting(false);
        setTimeout(() => setCurrentStep((s) => s + 1), 800);
      } catch (locError) {
        setDetecting(false);
        setError('Unable to get location. Please check your GPS.');
      }
    } catch (err) {
      setDetecting(false);
      setError('Failed to request location permission.');
    }
  };

  const handleNotificationGrant = async () => {
    setNotificationError(null);
    setDetecting(true);
    const granted = await requestNotificationPerm();
    setNotificationGranted(granted);
    
    if (!granted) {
      setDetecting(false);
      setNotificationError('Notification permission is required to continue.');
      return;
    }

    setTimeout(() => {
      setDetecting(false);
      if (notificationOnly) {
        // In notification-only mode, complete immediately after enabling
        setTimeout(() => {
          onComplete();
        }, 800);
      } else {
        // In full flow, continue to next step
        setTimeout(() => {
          setCurrentStep(currentStep + 1);
        }, 800);
      }
    }, 1200);
  };

  const handleGdprAccept = () => {
    localStorage.setItem('gdprConsent', 'true');
    setGdprAccepted(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  // Build steps array based on notificationOnly mode
  const buildSteps = () => {
    if (notificationOnly) {
      // Notification-only flow: show only notification setup card
      return [
        {
          id: 'notification',
          component: (
            <NotificationStep 
              online={online}
              granted={notificationGranted}
              detecting={detecting}
              error={notificationError}
              onGrant={handleNotificationGrant}
            />
          )
        }
      ];
    }

    // Full flow
    if (online === false) {
      return [
        {
          id: 'internet',
          component: <InternetStep onWifi={async () => {
            try {
              await SystemSettings.openWifiSettings();
            } catch {
              try { await App.openUrl({ url: 'android-app://com.android.settings/com.android.settings.Settings' }); } catch {}
            }
          }} onMobileData={async () => {
            try {
              await SystemSettings.openMobileDataSettings();
            } catch {
              try { await App.openUrl({ url: 'android-app://com.android.settings/com.android.settings.Settings' }); } catch {}
            }
          }} />
        },
        {
          id: 'welcome',
          component: <WelcomeStep online={online} onNext={() => setCurrentStep(currentStep + 1)} />
        },
        {
          id: 'location',
          component: (
            <LocationStep 
              online={online}
              granted={locationGranted}
              detecting={detecting}
              error={error}
              deniedLocked={locationDeniedLocked}
              onGrant={handleLocationGrant}
              cityName={cityName}
              countryName={countryName}
            />
          )
        },
        {
          id: 'notification',
          component: (
            <NotificationStep 
              online={online}
              granted={notificationGranted}
              detecting={detecting}
              error={notificationError}
              onGrant={handleNotificationGrant}
            />
          )
        },
        {
          id: 'gdpr',
          component: (
            <GDPRStep 
              online={online}
              accepted={gdprAccepted}
              isEUUser={isEUUser}
              onAccept={handleGdprAccept}
            />
          )
        }
      ];
    }

    return [
      {
        id: 'welcome',
        component: <WelcomeStep online={online} onNext={() => setCurrentStep(1)} />
      },
      {
        id: 'location',
        component: (
          <LocationStep 
            online={online}
            granted={locationGranted}
            detecting={detecting}
            error={error}
            deniedLocked={locationDeniedLocked}
            onGrant={handleLocationGrant}
            cityName={cityName}
            countryName={countryName}
          />
        )
      },
      {
        id: 'notification',
        component: (
          <NotificationStep 
            online={online}
            granted={notificationGranted}
            detecting={detecting}
            error={notificationError}
            onGrant={handleNotificationGrant}
          />
        )
      },
      {
        id: 'gdpr',
        component: (
          <GDPRStep 
            online={online}
            accepted={gdprAccepted}
            isEUUser={isEUUser}
            onAccept={handleGdprAccept}
          />
        )
      }
    ];
  };

  const steps = buildSteps();

  // Removed auto-resume location retry to avoid repeated dialogs after denial

  // If we are on Internet step and connectivity becomes online, auto-advance to next step
  React.useEffect(() => {
    if (steps[currentStep]?.id === 'internet' && online === true) {
      setTimeout(() => setCurrentStep(currentStep + 1), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // Initialize to GDPR step when requested, accounting for dynamic steps
  React.useEffect(() => {
    if (!initializedStepRef.current) {
      if (startAtStep === 'gdpr') {
        const idx = steps.findIndex(s => s.id === 'gdpr');
        if (idx >= 0) setCurrentStep(idx);
      }
      initializedStepRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, startAtStep]);

  return (
    <div className="h-screen max-h-screen bg-background overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {steps[currentStep].component}
        </motion.div>
      </AnimatePresence>

      {/* Progress Indicator */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-2 z-50">
        {steps.map((_, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentStep 
                ? 'w-8 bg-primary' 
                : index < currentStep 
                ? 'w-2 bg-primary/60' 
                : 'w-2 bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Removed GPS AlertDialog to avoid conflicting popup */}
    </div>
  );
}
// Internet Step
function InternetStep({ onWifi, onMobileData }: { onWifi: () => Promise<void>; onMobileData: () => Promise<void> }) {
  return (
    <div className="h-screen max-h-screen flex flex-col items-center justify-center p-6 py-10 bg-gradient-to-br from-background via-background to-primary/5 text-center">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center shadow-xl bg-gradient-to-br from-primary/20 to-primary/10"
        >
          <Radio className="w-10 h-10 text-primary" />
        </motion.div>

        <h2 className="text-2xl font-bold text-foreground mb-2">Connect to Internet</h2>
        <p className="text-sm text-muted-foreground mt-2">Enable Wi‑Fi or Mobile Data to continue</p>
      </motion.div>

      <div className="w-full grid grid-cols-2 gap-3">
        <button onClick={onWifi} className="py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-bold shadow-lg">Wi‑Fi Settings</button>
        <button onClick={onMobileData} className="py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-bold shadow-lg">Mobile Data</button>
      </div>
    </div>
  );
}

// Welcome Step
function WelcomeStep({ online, onNext }: { online: boolean | null; onNext: () => void }) {
  return (
    <div className="h-screen max-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background px-6 py-12 relative overflow-hidden text-center">
      <div className="absolute inset-0 opacity-[0.06]">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id="mesh-pattern" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="currentColor" />
          </pattern>
          <rect width="100" height="100" fill="url(#mesh-pattern)" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-xl">
        {online === false && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive inline-flex">
            Offline. Connect to continue.
          </div>
        )}
        {online === true && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary inline-flex">
            Online
          </div>
        )}

        <div className="grid gap-6 md:gap-8 bg-card/60 backdrop-blur-xl rounded-3xl border border-border/40 p-8 shadow-2xl">
          <div className="flex flex-col gap-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-sm tracking-[0.3em] uppercase text-primary/80"
            >
              Wakt
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl font-light text-foreground"
            >
              Wakt – Prayer Times
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base md:text-lg text-muted-foreground"
            >
              Thin, calm, and precise. Your daily companion for Adhan reminders, Qibla, and Hijri calendar.
            </motion.p>
          </div>

          <div className="grid gap-3 justify-center">
            {[
              'Accurate prayer times with your location',
              'Minimal Qibla compass for focus',
              'Hijri calendar at a glance',
              'Subtle notifications for each prayer'
            ].map((text, idx) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 + idx * 0.05 }}
                className="flex items-center gap-3 text-sm text-muted-foreground justify-center"
              >
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">{idx + 1}</div>
                <span>{text}</span>
              </motion.div>
            ))}
          </div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            onClick={onNext}
            whileTap={{ scale: 0.97 }}
            className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-2xl font-semibold text-lg shadow-lg flex items-center justify-center gap-2"
          >
            Get Started
            <motion.div animate={{ x: [0, 6, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
              <ChevronRight className="w-5 h-5" />
            </motion.div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// Location Step
function LocationStep({ 
  online,
  granted, 
  detecting, 
  error,
  deniedLocked,
  onGrant, 
  cityName,
  countryName
}: { 
  online: boolean | null;
  granted: boolean; 
  detecting: boolean;
  error: string | null;
  deniedLocked: boolean;
  onGrant: () => void;
  cityName: string;
  countryName: string;
}) {
  return (
    <div className="h-screen max-h-screen flex flex-col items-center justify-center p-6 py-10 bg-gradient-to-br from-background via-background to-primary/5 text-center">
      {online === false && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          Offline: reverse geocoding may be unavailable.
        </div>
      )}
      {online === true && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary">
          Online
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6"
      >
        <motion.div
          animate={{ 
            y: detecting ? 0 : [0, -10, 0],
            scale: granted && !detecting ? [1, 1.2, 1] : 1
          }}
          transition={{ 
            y: { duration: 2, repeat: Infinity },
            scale: { duration: 0.5 }
          }}
          className={`relative w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center shadow-xl ${
            granted 
              ? 'bg-gradient-to-br from-primary to-primary/80' 
              : 'bg-gradient-to-br from-primary/20 to-primary/10'
          }`}
        >
          {granted && !detecting ? (
            <CheckCircle2 className="w-10 h-10 text-white" />
          ) : detecting ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : (
            <MapPin className="w-10 h-10 text-primary" />
          )}
        </motion.div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          {detecting ? 'Detecting Location...' : granted ? 'Location Enabled' : 'Enable Location'}
        </h2>
        
        {granted && cityName && (
          <p className="text-primary font-semibold">{cityName}, {countryName}</p>
        )}
        
        <p className="text-sm text-muted-foreground mt-2">
          {detecting ? 'Finding your location for accurate prayer times...' : 'We use your location to calculate accurate prayer times'}
        </p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6 flex gap-3"
        >
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </motion.div>
      )}

      {/* Centered layout: remove spacer to keep content in middle */}

      {!granted && !detecting && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onGrant}
          whileTap={{ scale: 0.95 }}
          className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
        >
          <MapPin className="w-5 h-5" />
          Enable Location
        </motion.button>
      )}

      {(!granted && !detecting && deniedLocked) && (
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={async () => {
            try {
              await App.openUrl({ url: 'app-settings:' });
            } catch {
              try { await App.openUrl({ url: 'android-app://com.android.settings/com.android.settings.Settings' }); } catch {}
            }
          }}
          whileTap={{ scale: 0.95 }}
          className="w-full mt-3 py-3 bg-muted text-foreground rounded-xl font-semibold flex items-center justify-center gap-2 border border-border"
        >
          Open App Settings
        </motion.button>
      )}
    </div>
  );
}

// Notification Step
function NotificationStep({ 
  online,
  granted, 
  detecting, 
  error,
  onGrant 
}: { 
  online: boolean | null;
  granted: boolean; 
  detecting: boolean;
  error: string | null;
  onGrant: () => void;
}) {
  return (
    <div className="h-screen max-h-screen flex flex-col items-center justify-center p-6 py-10 bg-gradient-to-br from-background via-background to-primary/5 text-center">
      {online === false && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          Offline: notifications scheduling will resume when online.
        </div>
      )}
      {online === true && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary">
          Online
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6"
      >
        <motion.div
          animate={{ 
            y: detecting ? 0 : [0, -10, 0],
            scale: granted && !detecting ? [1, 1.2, 1] : 1
          }}
          transition={{ 
            y: { duration: 2, repeat: Infinity },
            scale: { duration: 0.5 }
          }}
          className={`relative w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center shadow-xl ${
            granted 
              ? 'bg-gradient-to-br from-primary to-primary/80' 
              : 'bg-gradient-to-br from-primary/20 to-primary/10'
          }`}
        >
          {granted && !detecting ? (
            <CheckCircle2 className="w-10 h-10 text-white" />
          ) : detecting ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : (
            <Bell className="w-10 h-10 text-primary" />
          )}
        </motion.div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          {detecting ? 'Enabling Notifications...' : granted ? 'Notifications Enabled' : 'Prayer Reminders'}
        </h2>
        
        <p className="text-sm text-muted-foreground mt-2">
          Get notified for each prayer time so you never miss a prayer
        </p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6 flex gap-3"
        >
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </motion.div>
      )}

      {/* Centered layout: remove spacer to keep content in middle */}

      {!granted && !detecting && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onGrant}
          whileTap={{ scale: 0.95 }}
          className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
        >
          <Bell className="w-5 h-5" />
          Enable Notifications
        </motion.button>
      )}
    </div>
  );
}

// GDPR Step
function GDPRStep({ 
  online,
  accepted, 
  isEUUser,
  onAccept 
}: { 
  online: boolean | null;
  accepted: boolean;
  isEUUser: boolean;
  onAccept: () => void;
}) {
  return (
    <div className="h-screen max-h-screen flex flex-col items-center justify-center p-6 py-10 bg-gradient-to-br from-background via-background to-primary/5 text-center">
      {online === false && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          You are offline.
        </div>
      )}
      {online === true && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary">
          Online
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`relative w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center shadow-xl ${
            accepted 
              ? 'bg-gradient-to-br from-primary to-primary/80' 
              : 'bg-gradient-to-br from-primary/20 to-primary/10'
          }`}
        >
          {accepted ? (
            <CheckCircle2 className="w-10 h-10 text-white" />
          ) : (
            <Shield className="w-10 h-10 text-primary" />
          )}
        </motion.div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          {accepted ? 'All Set!' : 'Privacy & Terms'}
        </h2>
        
        <p className="text-sm text-muted-foreground mt-2">
          {isEUUser 
            ? 'Please review and accept our privacy policy' 
            : 'We respect your privacy'}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border/50 mb-6 flex-1"
      >
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <Check className="w-5 h-5 text-primary flex-shrink-0" />
            <span>Location is stored locally for prayer calculations only</span>
          </li>
          <li className="flex gap-3">
            <Check className="w-5 h-5 text-primary flex-shrink-0" />
            <span>Notifications are used solely for prayer reminders</span>
          </li>
          <li className="flex gap-3">
            <Check className="w-5 h-5 text-primary flex-shrink-0" />
            <span>You can change preferences anytime in Settings</span>
          </li>
        </ul>
      </motion.div>

      {!accepted && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onAccept}
          whileTap={{ scale: 0.95 }}
          className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
        >
          Accept & Continue
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  );
}
