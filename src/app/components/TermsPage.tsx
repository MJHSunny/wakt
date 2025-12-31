import React, { useEffect } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { setStatusBarTheme } from '../services/statusBarTheme';
import { useTheme } from '../context/ThemeContext';

export function TermsPage({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const effective = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Terms header uses the primary gradient
  useEffect(() => {
    setStatusBarTheme('primary');
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 overflow-y-auto">
      {/* Header */}
      <div className={`relative bg-gradient-to-br p-6 pb-12 overflow-hidden page-header-safe ${theme === 'light' ? 'from-primary via-[#0A6B5D] to-primary text-white' : 'from-primary via-[#0A6B5D] to-primary text-white'}`}>
        <div className="absolute inset-0 opacity-[0.08]">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="terms-pattern" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
              <path d="M7.5 0 L10 5 L7.5 10 L5 5 Z" fill="white" />
              <circle cx="7.5" cy="7.5" r="1" fill="white" />
            </pattern>
            <rect width="100" height="100" fill="url(#terms-pattern)" />
          </svg>
        </div>

        <div className="relative z-10">

          <div className="text-center">
            <h1 className="text-3xl font-light tracking-tight">Terms of Service</h1>
            <p className="text-white/80 text-sm mt-1">Effective {effective}</p>
          </div>
        </div>
      </div>

      <div className="p-4 page-first-row-offset space-y-4 mt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-lg p-5 space-y-3"
        >
          <h3 className="text-card-foreground font-bold tracking-tight">1. Acceptance of terms</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By downloading or using Wakt, you agree to these Terms. If you do not agree, do not use the app.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl shadow-lg p-5 space-y-3"
        >
          <h3 className="text-card-foreground font-bold tracking-tight">2. License</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We grant you a personal, non-transferable, non-exclusive license to use the app for its intended purpose.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl shadow-lg p-5 space-y-3"
        >
          <h3 className="text-card-foreground font-bold tracking-tight">3. User responsibilities</h3>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc ml-5 space-y-2">
            <li>Ensure permissions (location, notifications) are enabled if you want full functionality.</li>
            <li>Use the app in compliance with local laws and religious practices.</li>
            <li>Do not reverse engineer or misuse the service.</li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl shadow-lg p-5 space-y-3"
        >
          <h3 className="text-card-foreground font-bold tracking-tight">4. Disclaimer</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Wakt is provided on an "as is" basis. While we strive for accuracy, we do not guarantee error-free prayer times or uninterrupted service.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl shadow-lg p-5 space-y-3"
        >
          <h3 className="text-card-foreground font-bold tracking-tight">5. Limitation of liability</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To the maximum extent permitted by law, we shall not be liable for any indirect or consequential loss arising from the use of the app.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl shadow-lg p-5 space-y-3"
        >
          <h3 className="text-card-foreground font-bold tracking-tight">6. Changes</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update these Terms from time to time. Continued use of the app after changes constitutes acceptance.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl shadow-lg p-5 space-y-3"
        >
          <h3 className="text-card-foreground font-bold tracking-tight">7. Contact</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For questions, contact <a className="text-primary underline" href="mailto:support@theaark.xyz">support@theaark.xyz</a>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
