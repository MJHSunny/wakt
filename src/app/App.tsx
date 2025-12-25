import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Network } from '@capacitor/network';
import { applyFontCache } from '../services/fontCacheService';
import { HomePage } from './components/HomePage';
import { PrayerSchedulePage } from './components/PrayerSchedulePage';
import { IslamicCalendarPage } from './components/IslamicCalendarPage';
import { QiblaPage } from './components/QiblaPage';
import { NotificationsPage } from './components/NotificationsPage';
import { SettingsPage } from './components/SettingsPage';
import { LocationSetupPage } from './components/LocationSetupPage';
import { LocationSetupPageSimple } from './components/LocationSetupPageSimple';

import { DonationPage } from './components/DonationPage';
import { SupportPage } from './components/SupportPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsPage } from './components/TermsPage';
import { FloatingDonateButton } from './components/FloatingDonateButton';
import { BottomNav } from './components/BottomNav';
import { TimeFormatProvider } from './context/TimeFormatContext';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/AppContext';
import { NotificationSetupPageSimple } from './components/NotificationSetupPageSimple';
import { GdprSetupPageSimple } from './components/GdprSetupPageSimple';
import { InternetSetupPageSimple } from './components/InternetSetupPageSimple';
export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [showDonation, setShowDonation] = useState(false);
  const [navMode, setNavMode] = React.useState<'full-screen' | 'gesture' | '3-button' | 'unknown'>('unknown');

  // Detect navigation mode based on system inset value
  React.useEffect(() => {
    const detectNavMode = () => {
      const insetValue = getComputedStyle(document.documentElement).getPropertyValue('--android-system-bottom');
      const insetPx = parseInt(insetValue) || 0;
      
      let mode: 'full-screen' | 'gesture' | '3-button' | 'unknown' = 'unknown';
      
      if (insetPx === 0) {
        mode = 'full-screen';
      } else if (insetPx > 0 && insetPx <= 30) {
        mode = 'gesture';
      } else if (insetPx > 30) {
        mode = '3-button';
      }
      
      setNavMode(mode);
      console.log(`🔍 Navigation Mode Detected: ${mode} (${insetPx}px)`);
      
      // Store in DOM for CSS access
      document.documentElement.setAttribute('data-nav-mode', mode);
    };
    
    // Detect immediately and on interval
    detectNavMode();
    const interval = setInterval(detectNavMode, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute and set bottom safe-area inset for Android/iOS (polyfill via VisualViewport)
  React.useEffect(() => {
    const updateInset = () => {
      try {
        const vv = (window as any).visualViewport as VisualViewport | undefined;
        if (vv) {
          const bottom = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
          document.documentElement.style.setProperty('--safe-area-bottom', `${bottom}px`);
        } else {
          // Fallback to CSS env on platforms that support it
          document.documentElement.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom)');
        }
      } catch {
        document.documentElement.style.setProperty('--safe-area-bottom', '0px');
      }
    };

    updateInset();
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    vv?.addEventListener('resize', updateInset);
    vv?.addEventListener('scroll', updateInset);
    window.addEventListener('orientationchange', updateInset);
    return () => {
      vv?.removeEventListener('resize', updateInset);
      vv?.removeEventListener('scroll', updateInset);
      window.removeEventListener('orientationchange', updateInset);
    };
  }, []);

  function renderPage() {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'schedule':
        return <PrayerSchedulePage />;
      case 'calendar':
        return <IslamicCalendarPage />;
      case 'qibla':
        return <QiblaPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'settings':
        return <SettingsPage onDonate={() => setShowDonation(true)} onNavigate={setCurrentPage} />;
      case 'location-setup':
        return <LocationSetupPage onBack={() => setCurrentPage('settings')} />;
      case 'support':
        return <SupportPage onBack={() => setCurrentPage('settings')} />;
      case 'privacy':
        return <PrivacyPolicyPage onBack={() => setCurrentPage('settings')} />;
      case 'terms':
        return <TermsPage onBack={() => setCurrentPage('settings')} />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  }

  return (
    <AppProvider>
      <TimeFormatProvider>
        <PermissionsGate 
          showDonation={showDonation} 
          setShowDonation={setShowDonation} 
          setCurrentPage={setCurrentPage}
          currentPage={currentPage}
          renderPage={renderPage}
        />
      </TimeFormatProvider>
    </AppProvider>
  );
}

function PermissionsGate({ showDonation, setShowDonation, setCurrentPage, currentPage, renderPage }: { 
  showDonation: boolean; 
  setShowDonation: (v: boolean) => void; 
  setCurrentPage: (v: string) => void;
  currentPage: string;
  renderPage: () => JSX.Element;
}) {
  const { 
    permissionsChecked,
    notificationPermissionGranted,
    locationPermissionGranted,
    countryName,
    completePermissionsFlow,
    location,
    prayerTimes
  } = useApp();
  
  const [showSplash, setShowSplash] = React.useState(true);
  const [showSetupFlow, setShowSetupFlow] = React.useState(false);
  const [currentSetupStep, setCurrentSetupStep] = React.useState(0);
  const [isOnline, setIsOnline] = React.useState<boolean | null>(null);
  const [stepsToRun, setStepsToRun] = React.useState<Array<'internet' | 'location' | 'notification' | 'gdpr'>>([]);
  const [gdprConsent, setGdprConsent] = React.useState(() => {
    try {
      return localStorage.getItem('gdprConsent') === 'true';
    } catch {
      return false;
    }
  });

  const isEUUser = useMemo(() => {
    const euCountries = [
      'Austria','Belgium','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Ireland','Italy','Latvia','Lithuania','Luxembourg','Malta','Netherlands','Poland','Portugal','Romania','Slovakia','Slovenia','Spain','Sweden','Iceland','Liechtenstein','Norway','Switzerland'
    ];

    if (countryName && euCountries.some(c => countryName.toLowerCase().includes(c.toLowerCase()))) return true;

    let timeZone = '';
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      timeZone = '';
    }

    const euTimezones = ['Europe/', 'Atlantic/Canary', 'Atlantic/Faeroe', 'Atlantic/Faroe', 'Atlantic/Madeira', 'Africa/Ceuta'];
    return euTimezones.some(prefix => timeZone.startsWith(prefix));
  }, [countryName]);
  
  // Determine if GDPR consent is required and missing (EU-only)
  const gdprConsentMissing = useMemo(() => {
    return isEUUser && !gdprConsent;
  }, [isEUUser, gdprConsent]);
  
  // Monitor network connectivity
  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await Network.getStatus();
        const connected = !!status.connected && navigator.onLine;
        setIsOnline(connected);
      } catch {
        setIsOnline(navigator.onLine);
      }
    };

    checkStatus();

    // Listen for network changes
    const unsubscribe = Network.addListener('networkStatusChange', (status) => {
      const connected = !!status.connected && navigator.onLine;
      setIsOnline(connected);
    });

    return () => {
      unsubscribe.then(handler => handler.remove()).catch(() => {});
    };
  }, []);

  // Apply cached fonts on startup (if available)
  React.useEffect(() => {
    applyFontCache().catch(() => {
      // Silently fail if cache is not available
    });
  }, []);
  
  // Check if notifications are disabled (mandatory mode)
  // After initial permission check, decide whether to run setup
  React.useEffect(() => {
    if (!permissionsChecked) return;
    if (showSetupFlow) return; // keep current flow steps stable once started

    const timer = setTimeout(() => {
      setShowSplash(false);
      const missing: Array<'internet' | 'location' | 'notification' | 'gdpr'> = [];
      // Skip location entirely if a saved location exists; no permission or internet check
      if (!location) {
        if (isOnline === false) missing.push('internet');
        missing.push('location');
      }
      if (!notificationPermissionGranted) missing.push('notification');
      if (gdprConsentMissing) missing.push('gdpr');

      setStepsToRun(missing);
      setShowSetupFlow(missing.length > 0);
    }, 800);

    return () => clearTimeout(timer);
  }, [permissionsChecked, isOnline, location, notificationPermissionGranted, gdprConsentMissing, showSetupFlow]);

  const splashLoaderCss = `
    .splash-loader {
      height: 60px;
      aspect-ratio: 2;
      border-bottom: 3px solid transparent;
      background:
        linear-gradient(90deg, #ffffff 50%, transparent 0) -25% 100%/50% 3px repeat-x border-box;
      position: relative;
      animation: l3-0 .75s linear infinite;
    }
    .splash-loader:before {
      content: '';
      position: absolute;
      inset: auto 42.5% 0;
      aspect-ratio: 1;
      border-radius: 50%;
      background: #D4AF37;
      animation: l3-1 .75s cubic-bezier(0, 900, 1, 900) infinite;
    }
    @keyframes l3-0 { to { background-position: -125% 100%; } }
    @keyframes l3-1 {
      0%, 2% { bottom: 0%; }
      98%, to { bottom: .1%; }
    }
  `;

  return (
    <>
      <style>{splashLoaderCss}</style>
      {/* Splash Screen Overlay */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            style={{ 
              willChange: 'opacity',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
              perspective: 1000
            }}
            className="fixed inset-0 z-50 bg-background flex items-center justify-center overflow-hidden"
          >
          <div className="relative z-10 text-center">
            <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
              <div className="splash-loader" />
            </div>

            {/* App name */}
            <h1 className="text-white text-4xl font-light tracking-[0.2em] mb-2">WAKT</h1>

            {/* Tagline */}
            <p className="text-white/70 text-sm uppercase tracking-[0.12em]">Your Prayer Time Companion</p>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Main App Content - shown after splash */}
      {!showSplash && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen"
          style={{ 
            paddingBottom: '4rem'
          }}
        >
          {/* Setup workflow - show one page at a time based on missing permissions */}
          {showSetupFlow && permissionsChecked && stepsToRun.length > 0 && (
            <>
              {stepsToRun[currentSetupStep] === 'internet' && (
                <InternetSetupPageSimple 
                  onComplete={() => {
                    if (currentSetupStep < stepsToRun.length - 1) {
                      setCurrentSetupStep(currentSetupStep + 1);
                    } else {
                      completePermissionsFlow();
                      setShowSetupFlow(false);
                      setCurrentPage('home');
                    }
                  }}
                />
              )}
              
              {stepsToRun[currentSetupStep] === 'location' && (
                <LocationSetupPageSimple 
                  onComplete={() => {
                    if (currentSetupStep < stepsToRun.length - 1) {
                      setCurrentSetupStep(currentSetupStep + 1);
                    } else {
                      completePermissionsFlow();
                      setShowSetupFlow(false);
                      setCurrentPage('home');
                    }
                  }}
                />
              )}
              
              {stepsToRun[currentSetupStep] === 'notification' && (
                <NotificationSetupPageSimple 
                  onComplete={() => {
                    // Move to next step or complete
                    if (currentSetupStep < stepsToRun.length - 1) {
                      setCurrentSetupStep(currentSetupStep + 1);
                    } else {
                      // Last step - complete setup
                      completePermissionsFlow();
                      setShowSetupFlow(false);
                      setCurrentPage('home');
                    }
                  }}
                />
              )}
              
              {stepsToRun[currentSetupStep] === 'gdpr' && (
                <GdprSetupPageSimple 
                  onComplete={() => {
                    setGdprConsent(true);
                    // This is the last step, complete setup
                    completePermissionsFlow();
                    setShowSetupFlow(false);
                    setCurrentPage('home');
                  }}
                />
              )}
            </>
          )}

          {/* Main app */}
          {!showSetupFlow && (
            <>
              {showDonation && <DonationPage onBack={() => setShowDonation(false)} />}
              {!showDonation && (
                <>
                  {renderPage()}
                  {/* <FloatingDonateButton onClick={() => setShowDonation(true)} /> */}
                  <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
                </>
              )}
            </>
          )}
        </motion.div>
      )}
    </>
  );
}