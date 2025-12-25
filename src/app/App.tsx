import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HomePage } from './components/HomePage';
import { PrayerSchedulePage } from './components/PrayerSchedulePage';
import { IslamicCalendarPage } from './components/IslamicCalendarPage';
import { QiblaPage } from './components/QiblaPage';
import { NotificationsPage } from './components/NotificationsPage';
import { SettingsPage } from './components/SettingsPage';
import { LocationSetupPage } from './components/LocationSetupPage';

import { DonationPage } from './components/DonationPage';
import { SupportPage } from './components/SupportPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsPage } from './components/TermsPage';
import { FloatingDonateButton } from './components/FloatingDonateButton';
import { BottomNav } from './components/BottomNav';
import { PermissionsPageSetup } from './components/PermissionsPageSetup';
import { TimeFormatProvider } from './context/TimeFormatContext';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/AppContext';
export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [showDonation, setShowDonation] = useState(false);

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
    permissionsFlowCompleted,
    notificationPermissionGranted,
    countryName
  } = useApp();
  
  const [showSplash, setShowSplash] = React.useState(true);
  const [showSetupFlow, setShowSetupFlow] = React.useState(false);
  const [forceGdprSetup, setForceGdprSetup] = React.useState(false);
  const [forceNotificationOnly, setForceNotificationOnly] = React.useState(false);

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
    try {
      const consent = localStorage.getItem('gdprConsent') === 'true';
      return isEUUser && !consent;
    } catch {
      return isEUUser; // if storage fails, default to requiring consent in EU
    }
  }, [isEUUser]);
  
  // Check if notifications are disabled (mandatory mode)
  const notificationsDisabled = permissionsChecked && !notificationPermissionGranted;
  
  // After initial permission check, decide whether to run setup
  React.useEffect(() => {
    if (!permissionsChecked) return;

    const timer = setTimeout(() => {
      setShowSplash(false);
      
      // Priority 1: Notifications disabled → show notification-only setup
      if (notificationsDisabled) {
        setForceNotificationOnly(true);
        setShowSetupFlow(true);
        return;
      }

      // Priority 2: GDPR missing → show GDPR-only setup
      const shouldForceGdpr = gdprConsentMissing && permissionsFlowCompleted;
      setForceGdprSetup(shouldForceGdpr);
      
      // Priority 3: Flow not completed → show full setup
      setShowSetupFlow(!permissionsFlowCompleted || shouldForceGdpr);
    }, 800);

    return () => clearTimeout(timer);
  }, [permissionsChecked, permissionsFlowCompleted, gdprConsentMissing, notificationsDisabled]);

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
          className="min-h-screen pb-20"
        >
          {/* Setup workflow */}
          {showSetupFlow && permissionsChecked && (
            <PermissionsPageSetup
              isEUUser={isEUUser}
              notificationOnly={forceNotificationOnly}
              startAtStep={forceGdprSetup ? 'gdpr' : 'welcome'}
              onComplete={() => {
                setShowSetupFlow(false);
                setForceNotificationOnly(false);
                setCurrentPage('home');
              }}
            />
          )}

          {/* Main app */}
          {!showSetupFlow && permissionsChecked && (
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

          {!permissionsChecked && (
            <div className="min-h-screen flex items-center justify-center text-muted-foreground">
              Preparing setup…
            </div>
          )}
        </motion.div>
      )}
    </>
  );
}