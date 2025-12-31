import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Network } from '@capacitor/network';
import { StatusBar } from '@capacitor/status-bar';
import { FourSquare } from 'react-loading-indicators';
import { applyFontCache } from '../services/fontCacheService';
import { HomePage } from './components/HomePage';
import { PrayerSchedulePage } from './components/PrayerSchedulePage';
import { IslamicCalendarPage } from './components/IslamicCalendarPage';
import { QiblaPage } from './components/QiblaPage';
import { NotificationsPage } from './components/NotificationsPage';
import { SettingsPage } from './components/SettingsPage';
import { LocationSetupPage } from './components/LocationSetupPage';
import { LocationSetupPageSimple } from './components/LocationSetupPageSimple';

import { SupportPage } from './components/SupportPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsPage } from './components/TermsPage';
import { BottomNav } from './components/BottomNav';
import { TimeFormatProvider } from './context/TimeFormatContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/AppContext';
import { NotificationSetupPageSimple } from './components/NotificationSetupPageSimple';
import { GdprSetupPageSimple } from './components/GdprSetupPageSimple';
import { InternetSetupPageSimple } from './components/InternetSetupPageSimple';
export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [navMode, setNavMode] = React.useState<'full-screen' | 'gesture' | '3-button' | 'unknown'>('unknown');
  const [hasScrolled, setHasScrolled] = React.useState(false);
  const [showSplash, setShowSplash] = React.useState(true);

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

  // Show the status bar overlay only after the user starts scrolling
  React.useEffect(() => {
    const target: any = document.getElementById('root') || window;

    const handleScroll = () => {
      const y = target === window
        ? (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0)
        : (target.scrollTop || 0);
      const scrolled = y > 0;
      setHasScrolled(prev => (prev === scrolled ? prev : scrolled));
    };

    handleScroll();
    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
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

  // Scroll to top when page changes
  React.useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [currentPage]);

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
        return <SettingsPage onNavigate={setCurrentPage} />;
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
      <ThemeProvider>
        <TimeFormatProvider>
          <MemoizedSplashScreen showSplash={showSplash} />
          {/* Fixed web-side backdrop behind the Android status bar - hidden during splash */}
          {!showSplash && (
            <div className={hasScrolled ? 'status-bar-overlay status-bar-overlay--visible' : 'status-bar-overlay'} />
          )}
          <PermissionsGate 
            setCurrentPage={setCurrentPage}
            currentPage={currentPage}
            renderPage={renderPage}
            showSplash={showSplash}
            setShowSplash={setShowSplash}
          />
        </TimeFormatProvider>
      </ThemeProvider>
    </AppProvider>
  );
}

function SplashScreenLayer({ showSplash }: { showSplash: boolean }) {
  const { theme } = useTheme();

  return (
    <AnimatePresence mode="wait">
      {showSplash && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden"
          style={{
            width: '100vw',
            height: '100vh',
            top: 0,
            left: 0,
            margin: 0,
            padding: 0,
            border: 'none',
            backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a',
            willChange: 'opacity',
            backfaceVisibility: 'hidden'
          }}
        >
          <motion.div 
            className="relative z-10 text-center"
            style={{ willChange: 'transform' }}
          >
            <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
              <FourSquare 
                color="#0D7C66" 
                size="large" 
                text="" 
                textColor={theme === 'light' ? '#000000' : '#ffffff'} 
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const MemoizedSplashScreen = React.memo(SplashScreenLayer);

function PermissionsGate({ setCurrentPage, currentPage, renderPage, showSplash, setShowSplash }: { 
  setCurrentPage: (v: string) => void;
  currentPage: string;
  renderPage: () => React.ReactElement;
  showSplash: boolean;
  setShowSplash: (v: boolean) => void;
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
  const { theme } = useTheme();
  
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

  // Hide splash after brief delay to allow native splash to show
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // Shows: native splash 500ms + React loader 2000ms
    return () => clearTimeout(timer);
  }, []);

  // Hide status bar during splash screen
  React.useEffect(() => {
    const handleStatusBar = async () => {
      try {
        if (showSplash) {
          await StatusBar.hide();
        } else {
          await StatusBar.show();
        }
      } catch (err) {
        // StatusBar API might not be available
        console.log('StatusBar API not available');
      }
    };
    
    handleStatusBar();
  }, [showSplash]);
  
  // After initial permission check, decide whether to run setup
  React.useEffect(() => {
    if (!permissionsChecked) return;
    if (showSetupFlow) return; // keep current flow steps stable once started

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
  }, [permissionsChecked, isOnline, location, notificationPermissionGranted, gdprConsentMissing, showSetupFlow]);

  return (
    <>
      {/* Main App Content */}
      {!showSplash && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="min-h-screen w-full max-w-full overflow-x-hidden"
          style={{ 
            paddingBottom: '4rem',
            willChange: 'opacity',
            backfaceVisibility: 'hidden'
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
          {!showSetupFlow && !showSplash && (
            <>
              {renderPage()}
              <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
            </>
          )}
        </motion.div>
      )}
    </>
  );
}