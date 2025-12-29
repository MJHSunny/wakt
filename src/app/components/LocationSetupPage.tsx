import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { searchLocations, LocationSuggestion } from '../../services/locationService';
import { Network } from '@capacitor/network';
import { SystemSettings } from '../../services/systemSettings';
import { useApp } from '../context/AppContext';
import { setStatusBarTheme } from '../services/statusBarTheme';

interface LocationSetupPageProps {
  onBack: () => void;
  onComplete?: () => void;
}

export function LocationSetupPage({ onBack, onComplete }: LocationSetupPageProps) {
  const { requestLocationPerm, requestLocation: requestLocationData, setManualLocation } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  // Location setup header uses the primary gradient
  useEffect(() => {
    setStatusBarTheme('primary');
  }, []);

  // Debounced search
  useEffect(() => {
    // Monitor network connectivity
    const setupNet = async () => {
      try {
        const status = await Network.getStatus();
        setIsOnline(!!status.connected && navigator.onLine);
      } catch {
        setIsOnline(navigator.onLine);
      }
    };
    setupNet();
    const listener = Network.addListener('networkStatusChange', (status) => {
      setIsOnline(!!status.connected && navigator.onLine);
    });

    // Debounced search below
    const handler = setTimeout(async () => {
      const q = query.trim();
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      if (isOnline === false) {
        setSuggestions([]);
        return;
      }
      setSearchLoading(true);
      const results = await searchLocations(q, 8);
      setSuggestions(results);
      setSearchLoading(false);
    }, 300);
    return () => {
      clearTimeout(handler);
      listener.then(h => h.remove()).catch(() => {});
    };
  }, [query, isOnline]);

  const handleUpdateLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Request permission
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
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          } else {
            onBack();
          }
        }, 800);
      } catch (locError) {
        setIsLoading(false);
        setError('Unable to get location. Please check your GPS.');
      }
    } catch (err) {
      setIsLoading(false);
      setError('Failed to request location permission.');
    }
  }, [requestLocationPerm, requestLocationData, onBack, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20 flex flex-col">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-primary via-[#0A6B5D] to-primary text-white p-6 pb-12 overflow-hidden page-header-safe text-center">
        <div className="absolute inset-0 opacity-[0.08]">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="profile-pattern" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
              <path d="M7.5 0 L10 5 L7.5 10 L5 5 Z" fill="white" />
              <circle cx="7.5" cy="7.5" r="1" fill="white" />
            </pattern>
            <rect width="100" height="100" fill="url(#profile-pattern)" />
          </svg>
        </div>
        <div className="relative z-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight">Precise Location</h1>
          <p className="text-white/80 text-sm mt-1">Set your prayer location</p>
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
          {/* Animated Icon */}
          <motion.div
            animate={{
              y: isLoading ? 0 : [0, -10, 0],
              scale: granted && !isLoading ? [1, 1.2, 1] : 1,
            }}
            transition={{
              y: { duration: 2, repeat: Infinity },
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

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isLoading ? 'Detecting Location...' : 'Precise Location'}
          </h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-8">
            {isLoading
              ? 'Finding your location for accurate prayer times...'
              : 'Allow access to your location so we can calculate accurate prayer times for your area.'}
          </p>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </motion.div>
          )}

          {/* Manual city search */}
          <div className="w-full max-w-md mx-auto mb-6">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type city or place"
                disabled={isOnline === false}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />)
              }
            </div>
            {isOnline === false && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                Offline. Connect to search or detect location.
              </div>
            )}
            {suggestions.length > 0 && (
              <div className="mt-2 rounded-lg border border-border bg-background shadow-sm overflow-hidden">
                {suggestions.map((s, idx) => (
                  <button
                    key={`${s.latitude}-${s.longitude}-${idx}`}
                    className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-center justify-between"
                    onClick={() => {
                      setManualLocation({
                        latitude: s.latitude,
                        longitude: s.longitude,
                        city: s.city,
                        country: s.country,
                        timezone: s.timezone,
                      });
                      setTimeout(() => {
                        if (onComplete) {
                          onComplete();
                        } else {
                          onBack();
                        }
                      }, 400);
                    }}
                  >
                    <span className="text-sm font-medium">{s.displayName}</span>
                    <span className="text-xs text-muted-foreground">{s.timezone || ''}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">Select a suggestion to set your location.</p>
          </div>

          {/* Request button */}
          {!granted && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleUpdateLocation}
              disabled={isLoading || isOnline === false}
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-primary to-primary/90 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <MapPin className="w-5 h-5" />
              <span>Precise Location</span>
            </motion.button>
          )}

          {isOnline === false && (
            <div className="grid grid-cols-2 gap-3 w-full mt-3">
              <button
                onClick={async () => {
                  try { await SystemSettings.openWifiSettings(); } catch {}
                }}
                className="py-3 px-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-semibold shadow-lg"
              >
                Wi‑Fi Settings
              </button>
              <button
                onClick={async () => {
                  try { await SystemSettings.openMobileDataSettings(); } catch {}
                }}
                className="py-3 px-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-semibold shadow-lg"
              >
                Mobile Data
              </button>
            </div>
          )}

          {/* Cancel button */}
          {!granted && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={onBack}
              disabled={isLoading}
              className="w-full mt-3 py-3 px-4 rounded-lg bg-muted/30 text-foreground font-semibold hover:bg-muted/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </motion.button>
          )}

          {/* Info text */}
          <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
            Your location is used only to calculate prayer times and is never shared with third parties.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
