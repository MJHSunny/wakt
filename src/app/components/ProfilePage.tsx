import React, { useState } from 'react';
import { User, Settings, MapPin, Volume2, Info } from 'lucide-react';
import { motion } from 'motion/react';

export function SettingsPage() {
  const [userName, setUserName] = useState('Abdullah Khan');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20 overflow-y-auto">{/* Header - Muslim Pro styled */}
      <div className="relative bg-gradient-to-br from-primary via-[#0A6B5D] to-primary text-white p-6 pb-12 overflow-hidden page-header-safe text-center">
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
          <p className="text-white/70 text-xs font-medium mb-1 uppercase tracking-wider">Settings</p>
          <h1 className="text-3xl font-light tracking-tight">Settings</h1>
          <p className="text-white/80 text-sm mt-1">Manage your preferences</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-4 -mt-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-[#0A6B5D] flex items-center justify-center shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full p-2 bg-input-background rounded-lg border border-border text-foreground mb-2"
                  autoFocus
                />
              ) : (
                <h2 className="text-xl text-card-foreground font-bold tracking-tight mb-1">{userName}</h2>
              )}
              <p className="text-sm text-muted-foreground">New York, United States</p>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="w-full py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-semibold"
          >
            {isEditing ? 'Save Profile' : 'Edit Profile'}
          </button>
        </motion.div>
      </div>

      {/* Preferences */}
      <div className="p-4 page-first-row-offset space-y-4 mt-6">
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
            <h3 className="text-card-foreground font-bold tracking-tight">Calculation Method</h3>
          </div>

          <select className="w-full p-3 bg-input-background rounded-xl border border-border text-foreground">
            <option>Islamic Society of North America (ISNA)</option>
            <option>Muslim World League (MWL)</option>
            <option>Egyptian General Authority</option>
            <option>Umm Al-Qura University, Makkah</option>
            <option>University of Islamic Sciences, Karachi</option>
            <option>Institute of Geophysics, Tehran</option>
          </select>

          <div className="mt-4 p-4 bg-primary/5 rounded-xl">
            <p className="text-xs text-muted-foreground">
              Different calculation methods may result in slight variations in prayer times.
              ISNA is commonly used in North America.
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
            <h3 className="text-card-foreground font-bold tracking-tight">Location</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div>
                <p className="text-foreground font-medium">New York, United States</p>
                <p className="text-xs text-muted-foreground mt-0.5">Current location</p>
              </div>
              <span className="text-xs text-primary px-3 py-1.5 bg-primary/10 rounded-full font-semibold">Active</span>
            </div>

            <button className="w-full p-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors font-medium">
              + Add New Location
            </button>
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

        {/* Sign Out */}
        <motion.button 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors font-semibold"
        >
          Sign Out
        </motion.button>
      </div>
    </div>
  );
}