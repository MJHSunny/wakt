package com.theaark.wakt;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.util.Log;

/**
 * BroadcastReceiver that handles:
 * 1. ADHAN_ALARM - Wakes at prayer time to send notification
 * 2. DISMISS_ADHAN - User dismisses the notification
 * 3. BOOT_COMPLETED - Restore alarms after device restart
 */
public class AdhanBroadcastReceiver extends BroadcastReceiver {

    private static final String TAG = "AdhanReceiver";
    private static final String CHANNEL_ID = "adhan_notifications";
    private static final int NOTIFICATION_ID = 2000;
    private static final boolean DEBUG = false;

    @Override
    public void onReceive(Context context, Intent intent) {
        // Acquire wake lock to ensure device wakes up
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "wakt::AdhanAlarmWakeLock"
        );
        wakeLock.acquire(60000); // 1 minute timeout
        
        try {
            String action = intent.getAction();
            if (DEBUG) {
                Log.d(TAG, "======================================");
                Log.d(TAG, "onReceive called with action: " + action);
                Log.d(TAG, "Time: " + new java.util.Date().toString());
                Log.d(TAG, "======================================");
            }

            if (action == null) {
                Log.w(TAG, "Received null action");
                return;
            }

            switch (action) {
                case "com.theaark.wakt.ADHAN_ALARM":
                    // Wake up and send notification at prayer time
                    String prayerName = intent.getStringExtra("prayerName");
                    int requestCode = intent.getIntExtra("requestCode", 100);
                    if (DEBUG) Log.d(TAG, "⏰ Adhan alarm triggered for: " + prayerName);
                    
                    // Start service to handle the alarm
                    Intent serviceIntent = new Intent(context, AdhanAlarmService.class);
                    serviceIntent.putExtra("prayerName", prayerName);
                    serviceIntent.putExtra("requestCode", requestCode);
                    context.startService(serviceIntent);
                    break;

                case "com.theaark.wakt.DISMISS_ADHAN":
                    // User tapped dismiss button - stop audio and clear notification
                    if (DEBUG) Log.d(TAG, "Dismiss action received");
                    dismissAdhanNotification(context);
                    stopAdhanService(context);
                    break;

                case Intent.ACTION_BOOT_COMPLETED:
                case Intent.ACTION_LOCKED_BOOT_COMPLETED:
                    // Device rebooted - need to restore alarms
                    if (DEBUG) Log.d(TAG, "Boot completed - alarms need to be rescheduled");
                    handleBootCompleted(context);
                    break;

                default:
                    Log.w(TAG, "Unknown action: " + action);
            }
        } finally {
            // Always release wake lock
            if (wakeLock.isHeld()) {
                wakeLock.release();
            }
        }
    }

    /**
     * Send high-priority Adhan notification with sound
     * The sound plays from the NotificationChannel (set in AdhanNotificationPlugin)
     */
    private void sendAdhanNotification(Context context, String prayerName) {
        if (prayerName == null) {
            prayerName = "Prayer";
        }
        
        if (DEBUG) Log.d(TAG, "Creating notification for: " + prayerName);
        
        // Reschedule this prayer for tomorrow (24 hours from now)
        rescheduleAlarmForTomorrow(context, prayerName);

        try {
            // Intent to open full-screen Adhan Activity when notification is tapped
            Intent openIntent = new Intent(context, AdhanActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            openIntent.putExtra("openFrom", "adhan_notification");
            openIntent.putExtra("prayerName", prayerName);

            PendingIntent openPendingIntent = PendingIntent.getActivity(
                    context,
                    0,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Dismiss action - stops the notification
            Intent dismissIntent = new Intent(context, AdhanBroadcastReceiver.class);
            dismissIntent.setAction("com.theaark.wakt.DISMISS_ADHAN");
            
            PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(
                    context,
                    1001,
                    dismissIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

                // Build high-priority notification
            // Sound is set in the channel (IMPORTANCE_HIGH + custom sound URI)
            androidx.core.app.NotificationCompat.Builder builder =
                    new androidx.core.app.NotificationCompat.Builder(context, CHANNEL_ID)
                            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                            .setContentTitle("🕌 Time for " + prayerName)
                            .setContentText("Allahu Akbar - The Adhan is playing")
                            .setContentIntent(openPendingIntent)
                        .setFullScreenIntent(openPendingIntent, true)
                            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_MAX)
                            .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
                            .setAutoCancel(true)
                            .setOngoing(false)
                            .setVibrate(new long[]{0, 1000, 500, 1000})
                            .setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PUBLIC)
                            .addAction(
                                    android.R.drawable.ic_menu_close_clear_cancel,
                                    "Dismiss",
                                    dismissPendingIntent
                            )
                            .addAction(
                                    android.R.drawable.ic_menu_view,
                                    "Open",
                                    openPendingIntent
                            );

            NotificationManager notificationManager =
                    (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            
            if (notificationManager != null) {
                notificationManager.notify(NOTIFICATION_ID, builder.build());
                if (DEBUG) Log.d(TAG, "✅ Adhan notification displayed successfully for " + prayerName);
            } else {
                Log.e(TAG, "NotificationManager is null");
            }

        } catch (Exception e) {
            Log.e(TAG, "❌ Error sending Adhan notification", e);
        }
    }

    /**
     * Dismiss the Adhan notification
     */
    private void dismissAdhanNotification(Context context) {
        try {
            NotificationManager notificationManager =
                    (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            
            if (notificationManager != null) {
                notificationManager.cancel(NOTIFICATION_ID);
                if (DEBUG) Log.d(TAG, "Adhan notification dismissed");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error dismissing notification", e);
        }
    }

    /**
     * Stop the Adhan audio service
     */
    private void stopAdhanService(Context context) {
        try {
            Intent serviceIntent = new Intent(context, AdhanService.class);
            context.stopService(serviceIntent);
            if (DEBUG) Log.d(TAG, "Adhan service stopped");
        } catch (Exception e) {
            Log.e(TAG, "Error stopping adhan service", e);
        }
    }

    /**
     * Reschedule alarm for tomorrow (24 hours from now)
     * This ensures daily prayer alarms keep working
     */
    private void rescheduleAlarmForTomorrow(Context context, String prayerName) {
        try {
            // Get request code for this prayer
            int requestCode = getRequestCodeForPrayer(prayerName);
            
            // Calculate time 24 hours from now
            long tomorrowTime = System.currentTimeMillis() + (24 * 60 * 60 * 1000);
            
            Intent intent = new Intent(context, AdhanBroadcastReceiver.class);
            intent.setAction("com.theaark.wakt.ADHAN_ALARM");
            intent.putExtra("prayerName", prayerName);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            android.app.AlarmManager alarmManager = 
                    (android.app.AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            
            if (alarmManager != null) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                    if (alarmManager.canScheduleExactAlarms()) {
                        alarmManager.setExactAndAllowWhileIdle(
                                android.app.AlarmManager.RTC_WAKEUP,
                                tomorrowTime,
                                pendingIntent
                        );
                        Log.d(TAG, "✅ Rescheduled " + prayerName + " for tomorrow");
                    } else {
                        Log.w(TAG, "Cannot schedule exact alarms - permission missing");
                    }
                } else {
                    alarmManager.setExactAndAllowWhileIdle(
                            android.app.AlarmManager.RTC_WAKEUP,
                            tomorrowTime,
                            pendingIntent
                    );
                    Log.d(TAG, "✅ Rescheduled " + prayerName + " for tomorrow");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Error rescheduling alarm for " + prayerName, e);
        }
    }
    
    /**
     * Get request code for a prayer name
     */
    private int getRequestCodeForPrayer(String prayerName) {
        if (prayerName == null) return 100;
        switch (prayerName.toLowerCase()) {
            case "fajr": return 100;
            case "dhuhr": return 101;
            case "asr": return 102;
            case "maghrib": return 103;
            case "isha": return 104;
            default: return 100;
        }
    }

    /**
     * Handle device boot - need to reschedule all prayer alarms
     * This is critical: without this, alarms disappear after phone restart
     */
    private void handleBootCompleted(Context context) {
        Log.d(TAG, "Device booted - prayer alarms need to be rescheduled");
        Log.d(TAG, "App should reschedule alarms when opened");
        
        // The actual rescheduling should happen when the app is opened
        // because we need to recalculate today's prayer times
        // This just logs that boot was detected
        
        // You could send a notification reminding user to open the app
        // or trigger a background service to recalculate and reschedule
    }
}
