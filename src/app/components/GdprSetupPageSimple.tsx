import React, { useState } from 'react';
import { Shield, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

interface GdprSetupPageProps {
  onComplete: () => void;
}

export function GdprSetupPageSimple({ onComplete }: GdprSetupPageProps) {
  const [accepted, setAccepted] = useState(false);

  const handleGdprAccept = () => {
    localStorage.setItem('gdprConsent', 'true');
    setAccepted(true);
    setTimeout(() => {
      onComplete();
    }, 800);
  };

  return (
    <div className="min-h-screen max-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center w-full max-w-md"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`relative w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-xl ${
            accepted 
              ? 'bg-gradient-to-br from-primary to-primary/80' 
              : 'bg-gradient-to-br from-primary/20 to-primary/10'
          }`}
        >
          {accepted ? (
            <CheckCircle2 className="w-10 h-10 text-white" />
          ) : (
            <Shield className="w-10 h-10 text-primary" />
          )}
        </motion.div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          {accepted ? 'All Set!' : 'Privacy & Terms'}
        </h2>
        
        <p className="text-sm text-muted-foreground mt-2">
          Please review and accept our privacy policy
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border/50 mt-6 w-full max-w-md flex-1"
      >
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <Check className="w-5 h-5 text-primary flex-shrink-0" />
            <span>We collect your location only to calculate accurate prayer times</span>
          </li>
          <li className="flex gap-3">
            <Check className="w-5 h-5 text-primary flex-shrink-0" />
            <span>Your data is never sold or shared with third parties</span>
          </li>
          <li className="flex gap-3">
            <Check className="w-5 h-5 text-primary flex-shrink-0" />
            <span>Notifications are sent only when you enable them</span>
          </li>
          <li className="flex gap-3">
            <Check className="w-5 h-5 text-primary flex-shrink-0" />
            <span>You can change settings anytime</span>
          </li>
        </ul>
      </motion.div>

      {!accepted && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleGdprAccept}
          whileTap={{ scale: 0.95 }}
          className="w-full max-w-md mt-6 py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-bold shadow-lg"
        >
          Accept & Continue
        </motion.button>
      )}
    </div>
  );
}
