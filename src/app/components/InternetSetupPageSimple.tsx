import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wifi, Radio } from 'lucide-react';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { SystemSettings } from '../../services/systemSettings';

interface InternetSetupPageProps {
  onComplete: () => void;
}

export function InternetSetupPageSimple({ onComplete }: InternetSetupPageProps) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  // Monitor network connectivity and auto-advance when online
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await Network.getStatus();
        const connected = !!status.connected && navigator.onLine;
        setIsOnline(connected);
        
        if (connected) {
          // Auto-advance after 1s if connection established
          setTimeout(() => {
            onComplete();
          }, 1000);
        }
      } catch {
        setIsOnline(navigator.onLine);
      }
    };

    checkStatus();

    // Listen for network changes
    const unsubscribe = Network.addListener('networkStatusChange', (status) => {
      const connected = !!status.connected && navigator.onLine;
      setIsOnline(connected);
      
      if (connected) {
        setTimeout(() => {
          onComplete();
        }, 1000);
      }
    });

    return () => {
      unsubscribe.then(handler => handler.remove()).catch(() => {});
    };
  }, [onComplete]);

  const handleWifiSettings = async () => {
    try {
      await SystemSettings.openWifiSettings();
    } catch {
      try { await App.openUrl({ url: 'app-settings:' }); } catch {}
    }
  };

  const handleMobileDataSettings = async () => {
    try {
      await SystemSettings.openMobileDataSettings();
    } catch {
      try { await App.openUrl({ url: 'app-settings:' }); } catch {}
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20 flex flex-col">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-primary via-[#0A6B5D] to-primary text-white p-6 pb-12 overflow-hidden page-header-safe text-center">
        <div className="absolute inset-0 opacity-[0.08]">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="internet-pattern" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
              <circle cx="7.5" cy="7.5" r="1.5" fill="white" />
              <path d="M7.5 3 A4.5 4.5 0 0 1 12 7.5" stroke="white" strokeWidth="0.5" fill="none" />
            </pattern>
            <rect width="100" height="100" fill="url(#internet-pattern)" />
          </svg>
        </div>
        <div className="relative z-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight">Internet Connection</h1>
          <p className="text-white/80 text-sm mt-1">Connect to get started</p>
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
              scale: isOnline ? [1, 1.2, 1] : [1, 1.05, 1],
            }}
            transition={{
              duration: isOnline ? 0.5 : 2,
              repeat: isOnline ? 0 : Infinity,
            }}
            className={`relative w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-xl ${
              isOnline
                ? 'bg-gradient-to-br from-primary to-primary/80'
                : 'bg-gradient-to-br from-primary/20 to-primary/10'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-10 h-10 text-white" />
            ) : (
              <Radio className="w-10 h-10 text-primary" />
            )}
          </motion.div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isOnline ? 'Connected!' : 'Internet Required'}
          </h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-8">
            {isOnline 
              ? 'You are connected. Proceeding...'
              : 'Enable Wi‑Fi or Mobile Data to continue'}
          </p>

          {/* Connection Status Badge */}
          {isOnline === false && (
            <div className="mb-6 px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive inline-block">
              📡 Offline – Enable connection to proceed
            </div>
          )}

          {isOnline === true && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary inline-block"
            >
              ✓ Connected to Internet
            </motion.div>
          )}

          {/* Buttons - only show if not connected */}
          {isOnline !== true && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid grid-cols-2 gap-3 w-full"
            >
              <button
                onClick={handleWifiSettings}
                className="py-3 px-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-xl font-semibold shadow-lg transition-all active:scale-95"
              >
                Wi‑Fi Settings
              </button>
              <button
                onClick={handleMobileDataSettings}
                className="py-3 px-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-xl font-semibold shadow-lg transition-all active:scale-95"
              >
                Mobile Data
              </button>
            </motion.div>
          )}

          {/* Success message */}
          {isOnline === true && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground mt-6"
            >
              Continuing in a moment...
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
