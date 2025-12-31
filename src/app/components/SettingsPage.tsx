import React, { useState, useMemo, useEffect } from 'react';
import { Settings, MapPin, Volume2, Info, Heart, Clock, HelpCircle } from 'lucide-react';
import { useTimeFormat } from '../context/TimeFormatContext';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { calculationMethods } from '../../services/prayerService';
import { setStatusBarTheme } from '../services/statusBarTheme';

export function SettingsPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { is24Hour, toggleTimeFormat } = useTimeFormat();
  const { calculationMethod, setCalculationMethod, madhab, setMadhab, location, cityName, countryName } = useApp();
  const { theme } = useTheme();
  const calculationOptions = useMemo(() => calculationMethods.map((m) => m.name), []);
  const [consentActive, setConsentActive] = useState<boolean>(false);
  const [isEUUser, setIsEUUser] = useState<boolean>(false);

  // Settings header uses the primary gradient
  useEffect(() => {
    setStatusBarTheme('primary');
  }, []);

  useEffect(() => {
    try {
      setConsentActive(localStorage.getItem('gdprConsent') === 'true');
    } catch {
      setConsentActive(false);
    }
  }, []);

  useEffect(() => {
    const detectEU = () => {
      const euCountries = [
        'Austria','Belgium','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Ireland','Italy','Latvia','Lithuania','Luxembourg','Malta','Netherlands','Poland','Portugal','Romania','Slovakia','Slovenia','Spain','Sweden','Iceland','Liechtenstein','Norway','Switzerland'
      ];

      if (countryName && euCountries.some(c => countryName.toLowerCase().includes(c.toLowerCase()))) {
        setIsEUUser(true);
        return;
      }

      let timeZone = '';
      try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch {
        timeZone = '';
      }

      const euTimezones = ['Europe/', 'Atlantic/Canary', 'Atlantic/Faeroe', 'Atlantic/Faroe', 'Atlantic/Madeira', 'Africa/Ceuta'];
      setIsEUUser(euTimezones.some(prefix => timeZone.startsWith(prefix)));
    };

    detectEU();
  }, [countryName]);

  const consentTitle = isEUUser ? 'GDPR Consent' : 'Privacy Consent';
  
  return (
    <div className="min-h-screen bg-background pb-20 overflow-y-auto">{/* Header - Muslim Pro styled */}
      <div className={`relative bg-gradient-to-br p-6 pb-12 overflow-hidden page-header-safe text-center ${theme === 'light' ? 'from-primary via-[#0A6B5D] to-primary text-white' : 'from-primary via-[#0A6B5D] to-primary text-white'}`}>
        {/* Islamic pattern overlay */}
        <div className="absolute inset-0 opacity-[0.08]">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="profile-pattern" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
              <path d="M7.5 0 L10 5 L7.5 10 L5 5 Z" fill="white" />
              <circle cx="7.5" cy="7.5" r="1" fill="white" />
            </pattern>
            <rect width="100" height="100" fill="url(#profile-pattern)" />
          </svg>
        </div>

        <div className="relative z-10">
          <h1 className="text-3xl font-light tracking-tight text-white">Settings</h1>
          <p className="text-sm mt-1 text-white/80">Manage your preferences</p>
        </div>
      </div>

      {/* Preferences */}
      <div className="p-4 page-first-row-offset space-y-4">
        {/* Time Format */}
        <div className="bg-card rounded-2xl shadow-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground font-bold tracking-tight">Time Format</h3>
          </div>

          <div className="flex gap-2 bg-muted/30 rounded-xl p-1.5">
            <button
              onClick={toggleTimeFormat}
              className={`flex-1 py-3 px-4 rounded-lg transition-all font-semibold ${
                is24Hour 
                  ? 'bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              24 Hour
            </button>
            <button
              onClick={toggleTimeFormat}
              className={`flex-1 py-3 px-4 rounded-lg transition-all font-semibold ${
                !is24Hour 
                  ? 'bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              12 Hour
            </button>
          </div>

          <div className="mt-4 p-4 bg-primary/5 rounded-xl">
            <p className="text-xs text-muted-foreground">
              {is24Hour 
                ? 'Prayer times will be displayed in 24-hour format (e.g., 18:00)'
                : 'Prayer times will be displayed in 12-hour format with AM/PM (e.g., 6:00 PM)'}
            </p>
          </div>
        </div>

        {/* Calculation Method */}
        <div className="bg-card rounded-2xl shadow-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-card-foreground font-bold tracking-tight">Calculation & Juristic Method</h3>
              <p className="text-xs text-muted-foreground">Affects prayer time angles and Asr school.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5 font-medium">Calculation Method</label>
              <select
                value={calculationMethod}
                onChange={(e) => setCalculationMethod(e.target.value)}
                className="w-full p-3 bg-input-background rounded-xl border border-border text-foreground"
              >
                {calculationOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1.5 font-medium">Juristic Method (Asr)</label>
              <select
                value={madhab}
                onChange={(e) => setMadhab(e.target.value)}
                className="w-full p-3 bg-input-background rounded-xl border border-border text-foreground"
              >
                <option value="Shafi">Shafi, Maliki, Hanbali</option>
                <option value="Hanafi">Hanafi</option>
              </select>
            </div>
          </div>

          <div className="mt-4 p-4 bg-primary/5 rounded-xl">
            <p className="text-xs text-muted-foreground">
              Changes here update prayer calculations app-wide. Hanafi uses the later Asr time.
            </p>
          </div>
        </div>

        {/* Location Preference */}
        <div className="bg-card rounded-2xl shadow-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-card-foreground font-bold tracking-tight">Location</h3>
              <p className="text-xs text-muted-foreground">Last fetched location from device.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-4">
            <p className="text-foreground font-medium">
              {cityName || countryName ? `${cityName || ''}${cityName && countryName ? ', ' : ''}${countryName || ''}` : 'Unknown location'}
            </p>
            {location && (
              <p className="text-xs text-muted-foreground mt-1">{location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°</p>
            )}
          </div>

          <button
            onClick={() => onNavigate?.('location-setup')}
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-primary to-primary/90 text-white font-semibold hover:shadow-lg transition-all active:scale-95"
          >
            Change Location
          </button>
        </div>

        {/* App Info */}
        <div className="bg-card rounded-2xl shadow-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground font-bold tracking-tight">App Information</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">App Name</span>
              <span className="text-foreground font-medium">Wakt</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="text-foreground font-medium">1.0.7</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Update</span>
              <span className="text-foreground font-medium">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

      {/* About & Legal */}
      <div className="bg-card rounded-2xl shadow-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-card-foreground font-bold tracking-tight">About Wakt</h3>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Wakt helps you stay on top of daily prayers with accurate prayer times, a beautiful Qibla compass, subtle notifications (Adhan), and an Islamic calendar. Designed for reliability and privacy.
        </p>

        <div className="grid grid-cols-1 gap-2">
          <button 
            onClick={() => onNavigate?.('privacy')}
            className="w-full p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors text-left"
          >
            <p className="text-foreground font-medium">Privacy Policy</p>
            <p className="text-xs text-muted-foreground mt-0.5">How we handle your data</p>
          </button>

          <button 
            onClick={() => onNavigate?.('terms')}
            className="w-full p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors text-left"
          >
            <p className="text-foreground font-medium">Terms of Service</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your rights and responsibilities</p>
          </button>

          <button 
            onClick={() => onNavigate?.('support')}
            className="w-full p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors text-left"
          >
            <p className="text-foreground font-medium">Customer Support</p>
            <p className="text-xs text-muted-foreground mt-0.5">Get help or contact us</p>
          </button>
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground font-medium">{consentTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage your data processing consent</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                  {consentActive ? 'Active' : 'Not Granted'}
                </span>
              </div>
            <div className="mt-3 flex gap-2">
              {consentActive ? (
                <button
                  onClick={() => { 
                    try { 
                      localStorage.removeItem('gdprConsent'); 
                      setConsentActive(false);
                    } catch {} 
                    // EU-only: force onboarding to GDPR step and reload
                    if (isEUUser) {
                      try { localStorage.removeItem('permissionsFlowCompleted'); } catch {}
                    }
                    window.location.reload();
                  }}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-muted/30 text-sm"
                >
                  Withdraw Consent
                </button>
              ) : (
                <button
                  onClick={() => { 
                    try { 
                      localStorage.setItem('gdprConsent', 'true'); 
                      setConsentActive(true);
                    } catch {} 
                  }}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-muted/30 text-sm"
                >
                  Grant Consent
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

        {/* Support - Hidden for now, will be used in future updates
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-2xl shadow-lg p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground font-bold tracking-tight">Support</h3>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => onNavigate?.('support')}
              className="w-full p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors text-left"
            >
              <p className="text-foreground font-medium">Help & Support</p>
              <p className="text-xs text-muted-foreground mt-0.5">Get assistance with the app</p>
            </button>
            
            <button 
              onClick={onDonate}
              className="w-full p-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-white hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="font-semibold">Support Development</p>
                  <p className="text-xs text-white/80 mt-0.5">Help us improve the app</p>
                </div>
                <Heart className="w-5 h-5" />
              </div>
            </button>
          </div>
        </motion.div>
        */}
      </div>
    </div>
  );
}
