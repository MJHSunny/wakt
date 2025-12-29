import React, { useEffect } from 'react';
import { ArrowLeft, Shield, MapPin, Bell, Radio, Volume2, Database, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { setStatusBarTheme } from '../services/statusBarTheme';

export function PrivacyPolicyPage({ onBack }: { onBack: () => void }) {
  const effective = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Privacy header uses the primary gradient
  useEffect(() => {
    setStatusBarTheme('primary');
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 overflow-y-auto">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-primary via-[#0A6B5D] to-primary text-white p-6 pb-12 overflow-hidden page-header-safe">
        <div className="absolute inset-0 opacity-[0.08]">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="privacy-pattern" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
              <path d="M7.5 0 L10 5 L7.5 10 L5 5 Z" fill="white" />
              <circle cx="7.5" cy="7.5" r="1" fill="white" />
            </pattern>
            <rect width="100" height="100" fill="url(#privacy-pattern)" />
          </svg>
        </div>

        <div className="relative z-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Settings</span>
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-light tracking-tight">Privacy Policy</h1>
            <p className="text-white/80 text-sm mt-1">Effective {effective}</p>
          </div>
        </div>
      </div>

      <div className="p-4 page-first-row-offset space-y-4 mt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-lg p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground font-bold tracking-tight">Our commitment</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Wakt is designed with privacy in mind. We collect only what is necessary for core features like prayer time calculation, Qibla compass, and Adhan notifications. We do not sell your data.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl shadow-lg p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground font-bold tracking-tight">Data we access</h3>
          </div>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-3">
            <li className="flex items-start gap-3"><MapPin className="w-4 h-4 mt-0.5 text-primary" />
              <span><span className="text-foreground font-medium">Location</span> (approximate or precise): used to compute accurate prayer times and Qibla direction. Location never leaves your device.
              </span>
            </li>
            <li className="flex items-start gap-3"><Radio className="w-4 h-4 mt-0.5 text-primary" />
              <span><span className="text-foreground font-medium">Device sensors</span> (magnetometer/accelerometer): used locally for the Qibla compass. Sensor data is not stored or transmitted.
              </span>
            </li>
            <li className="flex items-start gap-3"><Bell className="w-4 h-4 mt-0.5 text-primary" />
              <span><span className="text-foreground font-medium">Notifications</span>: we schedule local notifications and optionally play Adhan at prayer times.
              </span>
            </li>
            <li className="flex items-start gap-3"><Volume2 className="w-4 h-4 mt-0.5 text-primary" />
              <span><span className="text-foreground font-medium">Audio playback</span>: used to play the Adhan locally on your device.
              </span>
            </li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl shadow-lg p-5 space-y-4"
        >
          <h3 className="text-card-foreground font-bold tracking-tight">How we process data</h3>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc ml-5 space-y-2">
            <li>Prayer time and Qibla calculations run on-device.</li>
            <li>No analytics SDKs or advertising identifiers are used.</li>
            <li>We do not sell or share personal data with third parties.</li>
            <li>Data is retained only as needed for functionality (e.g., your selected method or saved city).</li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl shadow-lg p-5 space-y-4"
        >
          <h3 className="text-card-foreground font-bold tracking-tight">Permissions</h3>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc ml-5 space-y-2">
            <li>Location: to compute prayer times and Qibla.</li>
            <li>Notifications: to alert you at prayer times.</li>
            <li>Foreground service / media playback (Android): to play Adhan reliably when triggered.</li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl shadow-lg p-5 space-y-3"
        >
          <h3 className="text-card-foreground font-bold tracking-tight">Children’s privacy</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Wakt is a general audience app and does not knowingly collect personal information from children.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl shadow-lg p-5 space-y-3"
        >
          <h3 className="text-card-foreground font-bold tracking-tight">Contact</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For questions or requests, contact us at <a className="text-primary underline" href="mailto:support@theaark.xyz">support@theaark.xyz</a>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
