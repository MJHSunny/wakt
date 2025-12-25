import React, { useState, useMemo } from 'react';
import { Settings, MapPin, Volume2, Info, Heart, Clock, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useTimeFormat } from '../context/TimeFormatContext';
import { useApp } from '../context/AppContext';
import { calculationMethods } from '../../services/prayerService';

export function SettingsPage({ onDonate, onNavigate }: { onDonate?: () => void; onNavigate?: (page: string) => void }) {
  const { is24Hour, toggleTimeFormat } = useTimeFormat();
  const { calculationMethod, setCalculationMethod, madhab, setMadhab, location, cityName, countryName } = useApp();
  const calculationOptions = useMemo(() => calculationMethods.map((m) => m.name), []);
  
  return (
    <div className="min-h-screen bg-background pb-20 overflow-y-auto">{/* Header - Muslim Pro styled */}
      <div className="relative bg-gradient-to-br from-primary via-[#0A6B5D] to-primary text-white p-6 pb-12 overflow-hidden">
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
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-white/80 text-sm mt-1">Manage your preferences</p>
        </div>
      </div>

      {/* Preferences */}
      <div className="p-4 space-y-4 mt-6">
        {/* Time Format */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl shadow-lg p-5"
        >
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
        </motion.div>

        {/* Calculation Method */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl shadow-lg p-5"
        >
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
        </motion.div>

        {/* Location Preference */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl shadow-lg p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-card-foreground font-bold tracking-tight">Location</h3>
              <p className="text-xs text-muted-foreground">Use device location or set a custom city.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-foreground font-medium">
                {cityName || countryName ? `${cityName || ''}${cityName && countryName ? ', ' : ''}${countryName || ''}` : 'Unknown location'}
              </p>
              {location && (
                <p className="text-xs text-muted-foreground mt-1">{location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={requestLocation}
                  className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Use current device location
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
              <label className="block text-sm text-muted-foreground font-medium">Add custom location</label>
              <div className="flex gap-2">
                <input
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder="City or Country"
                  className="flex-1 p-3 rounded-lg border border-border bg-background text-foreground"
                />
                <button
                  onClick={handleManualLocation}
                  disabled={manualLoading}
                  className="px-4 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {manualLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
              </div>
              {manualError && <p className="text-xs text-red-500">{manualError}</p>}
              {manualSuccess && <p className="text-xs text-green-600">{manualSuccess}</p>}
              <p className="text-[11px] text-muted-foreground">We’ll look up the coordinates and use them for prayer times.</p>
            </div>
          </div>
        </motion.div>

        {/* Adhan Sound */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-2xl shadow-lg p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground font-bold tracking-tight">Adhan Sound</h3>
          </div>

          <div className="space-y-2">
            {[
              { value: 'makkah', label: 'Makkah Adhan', description: 'Traditional call from Haram' },
              { value: 'madinah', label: 'Madinah Adhan', description: "Prophet's Mosque style" },
              { value: 'egypt', label: 'Egyptian Adhan', description: 'Classic Egyptian recitation' },
            ].map((adhan) => (
              <div
                key={adhan.value}
                className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-foreground font-medium text-sm">{adhan.label}</p>
                  <p className="text-xs text-muted-foreground">{adhan.description}</p>
                </div>
                <button className="p-2 hover:bg-primary/10 rounded-lg transition-colors">
                  <Volume2 className="w-4 h-4 text-primary" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* App Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-2xl shadow-lg p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground font-bold tracking-tight">App Information</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="text-foreground font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="text-foreground font-medium">Dec 22, 2024</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prayer Times Database</span>
              <span className="text-foreground font-medium">Updated daily</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <button className="w-full text-left text-sm text-foreground hover:text-primary transition-colors font-medium">
              Privacy Policy
            </button>
            <button className="w-full text-left text-sm text-foreground hover:text-primary transition-colors font-medium">
              Terms of Service
            </button>
            <button className="w-full text-left text-sm text-foreground hover:text-primary transition-colors font-medium">
              About Us
            </button>
          </div>
        </motion.div>

        {/* Donation Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-card rounded-2xl shadow-lg p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground font-bold tracking-tight">Support Us</h3>
          </div>

          <button
            className="w-full p-4 bg-primary text-white rounded-xl font-medium hover:bg-primary/80 transition-colors"
            onClick={onDonate}
          >
            Donate
          </button>
        </motion.div>

        {/* Help & Support */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-card rounded-2xl shadow-lg p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground font-bold tracking-tight">Help & Support</h3>
          </div>

          <button
            className="w-full p-4 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl font-medium hover:from-primary/90 hover:to-primary/80 transition-all shadow-lg"
            onClick={() => onNavigate?.('support')}
          >
            Contact Support
          </button>
        </motion.div>
      </div>
    </div>
  );
}