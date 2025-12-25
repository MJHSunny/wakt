import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Network } from '@capacitor/network';
import { SystemSettings } from '../../services/systemSettings';
import { preCacheFonts, applyFontCache } from '../../services/fontCacheService';

interface LocationSetupPageSimpleProps {
  onComplete: () => void;
}

export function LocationSetupPageSimple({ onComplete }: LocationSetupPageSimpleProps) {
  const { requestLocationPerm, requestLocation: requestLocationData } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [fontsCached, setFontsCached] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await Network.getStatus();
        setIsOnline(!!status.connected && navigator.onLine);
      } catch {
        setIsOnline(navigator.onLine);
      }
    };
    checkStatus();
    const listener = Network.addListener('networkStatusChange', (status) => {
      const online = !!status.connected && navigator.onLine;
      setIsOnline(online);
      
      // Pre-cache fonts when online and not yet cached
      if (online && !fontsCached) {
        preCacheFonts().then((success) => {
          if (success) {
            setFontsCached(true);
            console.log('Fonts cached successfully during location setup');
          }
        });
      }
    });
    return () => {
      listener.then(h => h.remove()).catch(() => {});
    };
  }, [fontsCached]);

  const handleDetectLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const permGranted = await requestLocationPerm();
      if (!permGranted) {
        setGranted(false);
        setIsLoading(false);
        setError('Location permission required. Please allow access.');
        return;
      }

      try {
        await requestLocationData();
        setGranted(true);
        setIsLoading(false);
        setTimeout(() => onComplete(), 800);
      } catch {
        setIsLoading(false);
        setError('Unable to get location. Please check your GPS.');
      }
    } catch {
      setIsLoading(false);
      setError('Failed to request location permission.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20 flex flex-col">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-primary via-[#0A6B5D] to-primary text-white p-6 pb-12 overflow-hidden page-header-safe text-center">
        <div className="absolute inset-0 opacity-[0.08]">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="location-simple-pattern" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
              <path d="M7.5 0 L10 5 L7.5 10 L5 5 Z" fill="white" />
              <circle cx="7.5" cy="7.5" r="1" fill="white" />
            </pattern>
            <rect width="100" height="100" fill="url(#location-simple-pattern)" />
          </svg>
        </div>
        <div className="relative z-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight">Location Access</h1>
          <p className="text-white/80 text-sm mt-1">Allow location to calculate prayer times</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center w-full max-w-md"
        >
          <motion.div
            animate={{
              scale: granted && !isLoading ? [1, 1.2, 1] : 1,
            }}
            transition={{
              scale: { duration: 0.5 },
            }}
            className={`relative w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-xl ${
              granted
                ? 'bg-gradient-to-br from-primary to-primary/80'
                : 'bg-gradient-to-br from-primary/20 to-primary/10'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : (
              <MapPin className="w-10 h-10 text-primary" />
            )}
          </motion.div>

          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isLoading ? 'Detecting Location...' : 'Allow Location Access'}
          </h2>

          <p className="text-sm text-muted-foreground mb-6">
            We use your location to calculate accurate prayer times.
          </p>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
              {error}
            </div>
          )}

          {isOnline === false && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
              Offline. Connect to detect your location.
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 w-full">
            <button
              onClick={handleDetectLocation}
              disabled={isOnline === false}
              className="py-3 px-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-xl font-semibold shadow-lg transition-all active:scale-95"
            >
              Enable & Detect
            </button>
            {isOnline === false && (
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={async () => { try { await SystemSettings.openWifiSettings(); } catch {} }}
                  className="py-3 px-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-semibold shadow-lg"
                >
                  Wi‑Fi Settings
                </button>
                <button
                  onClick={async () => { try { await SystemSettings.openMobileDataSettings(); } catch {} }}
                  className="py-3 px-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-semibold shadow-lg"
                >
                  Mobile Data
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
