package com.theaark.wakt;

import android.app.IntentService;
import android.app.NotificationManager;
import android.content.Intent;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * Service that handles Adhan alarm and shows notification
 * This service runs even when app is closed
 */
public class AdhanAlarmService extends IntentService {
    private static final String TAG = "AdhanAlarmService";
    private static final String CHANNEL_ID = "adhan_notifications";
    private static final int NOTIFICATION_ID = 2000;
    private static final boolean DEBUG = false;

    public AdhanAlarmService() {
        super("AdhanAlarmService");
    }

    @Override
    protected void onHandleIntent(Intent intent) {
        if (intent == null) {
            Log.e(TAG, "Intent is null");
            return;
        }

        String prayerName = intent.getStringExtra("prayerName");
        if (prayerName == null) {
            prayerName = "Prayer";
        }

        if (DEBUG) Log.d(TAG, "=== AdhanAlarmService handling: " + prayerName + " ===");

        try {
            // Start foreground audio service (it will show the notification)
            startAdhanService(prayerName);

            // Reschedule for tomorrow
            rescheduleAlarmForTomorrow(prayerName, intent.getIntExtra("requestCode", 100));

            if (DEBUG) Log.d(TAG, "✅ Adhan service completed for " + prayerName);
        } catch (Exception e) {
            Log.e(TAG, "❌ Error in AdhanAlarmService", e);
        }
    }

    /**
     * Start Adhan service (it will handle notification)
     */
    private void startAdhanService(String prayerName) {
        try {
            String soundName = "";
            try {
                android.content.SharedPreferences prefs = getApplicationContext().getSharedPreferences(
                        "CapacitorStorage", MODE_PRIVATE);
                soundName = prefs.getString("adhanSound", "athan_makkah");
            } catch (Exception ignored) {}

            Intent svc = new Intent(this, AdhanService.class);
            svc.putExtra("prayerName", prayerName);
            svc.putExtra("soundName", soundName);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                startForegroundService(svc);
            } else {
                startService(svc);
            }
            if (DEBUG) Log.d(TAG, "AdhanService started with sound: " + soundName);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start AdhanService", e);
        }
    }

    /**
     * Reschedule for tomorrow
     */
    private void rescheduleAlarmForTomorrow(String prayerName, int requestCode) {
        try {
            // Just log - actual rescheduling happens in app when it starts
            if (DEBUG) Log.d(TAG, "Will reschedule " + prayerName + " for tomorrow when app opens");
        } catch (Exception e) {
            Log.e(TAG, "Error rescheduling", e);
        }
    }
}
