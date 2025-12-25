import React, { useState } from 'react';
import { Bell, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';

interface NotificationSetupPageProps {
  onComplete: () => void;
}

export function NotificationSetupPageSimple({ onComplete }: NotificationSetupPageProps) {
  const { requestNotificationPerm } = useApp();
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);

  const handleNotificationGrant = async () => {
    setError(null);
    setDetecting(true);

    try {
      console.log('[NotificationSetupPage] Requesting notification permission');
      const permGranted = await requestNotificationPerm();

      if (!permGranted) {
        setDetecting(false);
        setError('Notification permission required. Please try again.');
        return;
      }

      console.log('[NotificationSetupPage] Permission granted');
      setGranted(true);
      setDetecting(false);
      
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (err: any) {
      console.error('[NotificationSetupPage] Error:', err);
      setDetecting(false);
      setError(`Failed to enable notifications: ${err?.message || 'Unknown error'}. Try again.`);
    }
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
          animate={{ 
            y: detecting ? 0 : [0, -10, 0],
            scale: granted && !detecting ? [1, 1.2, 1] : 1
          }}
          transition={{ 
            y: { duration: 2, repeat: Infinity },
            scale: { duration: 0.5 }
          }}
          className={`relative w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-xl ${
            granted 
              ? 'bg-gradient-to-br from-primary to-primary/80' 
              : 'bg-gradient-to-br from-primary/20 to-primary/10'
          }`}
        >
          {granted && !detecting ? (
            <CheckCircle2 className="w-10 h-10 text-white" />
          ) : detecting ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : (
            <Bell className="w-10 h-10 text-primary" />
          )}
        </motion.div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          {detecting ? 'Enabling Notifications...' : granted ? 'Notifications Enabled' : 'Prayer Reminders'}
        </h2>
        
        <p className="text-sm text-muted-foreground">
          Get notified for each prayer time so you never miss a prayer
        </p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mt-6 flex gap-3 w-full max-w-md"
        >
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </motion.div>
      )}

      {!granted && !detecting && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleNotificationGrant}
          whileTap={{ scale: 0.95 }}
          className="w-full max-w-md mt-8 py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
        >
          <Bell className="w-5 h-5" />
          Enable Notifications
        </motion.button>
      )}
    </div>
  );
}
