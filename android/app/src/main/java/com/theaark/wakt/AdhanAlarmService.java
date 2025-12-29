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
            // Check if notification is enabled for this prayer
            if (!isNotificationEnabled(prayerName)) {
                if (DEBUG) Log.d(TAG, "Notification is disabled for " + prayerName + ", skipping");
                return;
            }

            // Start foreground audio service (it will show the notification)
            startAdhanService(prayerName, intent.getStringExtra("prayerTimeWindow"));

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
    private void startAdhanService(String prayerName, String prayerTimeWindow) {
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
            svc.putExtra("prayerTimeWindow", prayerTimeWindow);
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

    /**
     * Check if notification is enabled for a specific prayer
     * Maps prayer name to the stored preference
     */
    private boolean isNotificationEnabled(String prayerName) {
        try {
            android.content.SharedPreferences prefs = getApplicationContext().getSharedPreferences(
                    "CapacitorStorage", MODE_PRIVATE);
            
            // Get the stored notification toggles JSON string
            String notificationToggles = prefs.getString("wakt_notification_toggles", "");
            if (notificationToggles.isEmpty()) {
                // If no preferences stored yet, default to true (enabled)
                return true;
            }

            // Parse the JSON to extract the prayer key
            // Prayer names from intent come as "Fajr", "Dhuhr", etc.
            // Storage keys are "fajr", "dhuhr", "asr", "maghrib", "isha", "tahajjud"
            String prayerKey = prayerName.toLowerCase()
                    .replace(" ", "")
                    .replace("(test)", "")
                    .trim();
            
            // Handle special case: "Fajr (Test)" -> "fajr"
            if (prayerKey.contains("(test)")) {
                prayerKey = prayerKey.replace("(test)", "").trim();
            }

            // Try to parse JSON - look for "prayerKey": true/false
            if (notificationToggles.contains("\"" + prayerKey + "\":")) {
                boolean isEnabled = notificationToggles.contains("\"" + prayerKey + "\":true");
                if (DEBUG) Log.d(TAG, "Notification for " + prayerKey + " is " + (isEnabled ? "enabled" : "disabled"));
                return isEnabled;
            }

            // If preference not found, default to true
            if (DEBUG) Log.d(TAG, "No preference found for " + prayerKey + ", defaulting to true");
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error checking notification preference", e);
            return true; // Default to enabled on error
        }
    }
}
