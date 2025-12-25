package com.theaark.wakt;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Calendar;

@CapacitorPlugin(name = "AdhanNotificationPlugin")
public class AdhanNotificationPlugin extends Plugin {

    private static final String TAG = "AdhanNotificationPlugin";
    private static final String CHANNEL_ID = "adhan_notifications";
    private static final boolean DEBUG = true;
    private AlarmManager alarmManager;
    private Context context;
    private MediaPlayer mediaPlayer;

    @Override
    public void load() {
        super.load();
        context = getContext();
        alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        createNotificationChannel();
        if (DEBUG) Log.d(TAG, "AdhanNotificationPlugin loaded successfully");
    }

    /**
     * Get selected Adhan sound from SharedPreferences
     */
    private String getSelectedAdhanSound() {
        android.content.SharedPreferences prefs = context.getSharedPreferences(
                "CapacitorStorage", Context.MODE_PRIVATE);
        return prefs.getString("adhanSound", "athan_makkah");
    }

    /**
     * Get resource ID for sound name
     */
    private int getSoundResourceId(String soundName) {
        if (soundName == null || soundName.isEmpty()) {
            soundName = "athan_makkah";
        }
        int resId = context.getResources().getIdentifier(soundName, "raw", context.getPackageName());
        if (resId == 0) {
            // Fallback to default
            resId = context.getResources().getIdentifier("athan_makkah", "raw", context.getPackageName());
        }
        return resId;
    }

    /**
     * Create notification channel with selected Adhan sound
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager =
                    (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

            // Delete old channel to recreate with new sound
            notificationManager.deleteNotificationChannel(CHANNEL_ID);

            // Get selected sound
            String selectedSound = getSelectedAdhanSound();
            int soundResId = getSoundResourceId(selectedSound);

            // Audio attributes for the Adhan sound
                android.media.AudioAttributes audioAttributes = new android.media.AudioAttributes.Builder()
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                    .build();

            // URI for the selected Adhan sound file
            android.net.Uri soundUri = android.net.Uri.parse(
                    "android.resource://" + context.getPackageName() + "/" + soundResId);

            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Prayer Adhan Notifications",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("High-priority notifications with Adhan sound for prayer times");
            channel.setSound(soundUri, audioAttributes);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 250, 500});
            channel.setShowBadge(true);
            channel.setBypassDnd(true);
            channel.enableLights(true);
            channel.setLightColor(android.graphics.Color.GREEN);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

            notificationManager.createNotificationChannel(channel);
            Log.d(TAG, "Notification channel created with sound: " + selectedSound);
        }
    }

    /**
     * Trigger Adhan notification immediately (for testing)
     */
    @PluginMethod
    public void triggerAdhanImmediately(PluginCall call) {
        String prayerName = call.getString("prayerName");
        Log.d(TAG, "=== triggerAdhanImmediately called ===");
        Log.d(TAG, "Prayer name: " + prayerName);

        if (prayerName == null) {
            Log.e(TAG, "prayerName is null!");
            call.reject("Missing prayerName parameter");
            return;
        }

        try {
            if (DEBUG) Log.d(TAG, "About to show notification...");
            showAdhanNotification(prayerName);
            if (DEBUG) Log.d(TAG, "Notification shown successfully");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Exception in triggerAdhanImmediately: " + e.getMessage(), e);
            call.reject("Failed to trigger Adhan: " + e.getMessage());
        }
    }

    /**
     * Show high-priority Adhan notification
     */
    private void showAdhanNotification(String prayerName) {
        if (DEBUG) {
            Log.d(TAG, "=== showAdhanNotification START ===");
            Log.d(TAG, "Prayer: " + prayerName);
        }
        
        try {
            // Get notification manager
            NotificationManager notificationManager =
                    (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (DEBUG) Log.d(TAG, "Got NotificationManager");

            // Intent to open activity when notification is tapped
            Intent fullScreenIntent = new Intent(context, AdhanActivity.class);
            fullScreenIntent.putExtra("prayerName", prayerName);
            fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                    context,
                    0,
                    fullScreenIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            if (DEBUG) Log.d(TAG, "Created PendingIntent");

            // Sound URI
            android.net.Uri soundUri = android.net.Uri.parse(
                    "android.resource://" + context.getPackageName() + "/" + R.raw.adhan);
            if (DEBUG) Log.d(TAG, "Sound URI: " + soundUri);

                // Build notification
            androidx.core.app.NotificationCompat.Builder builder =
                    new androidx.core.app.NotificationCompat.Builder(context, CHANNEL_ID)
                            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                            .setContentTitle("🕌 Time for " + prayerName)
                            .setContentText("The Adhan is playing... Tap to view")
                        .setContentIntent(fullScreenPendingIntent)
                        .setFullScreenIntent(fullScreenPendingIntent, true)
                            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_MAX)
                            .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
                            .setAutoCancel(true)
                            .setVibrate(new long[]{0, 500, 250, 500})
                            .setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PUBLIC);

            if (DEBUG) Log.d(TAG, "Builder created");

            // Set sound for pre-Android 8 devices
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                builder.setSound(soundUri);
                if (DEBUG) Log.d(TAG, "Set sound for pre-Android 8");
            } else {
                if (DEBUG) Log.d(TAG, "Using channel sound (Android 8+)");
            }

            // Show notification
            int notificationId = 2000;
            notificationManager.notify(notificationId, builder.build());
            if (DEBUG) Log.d(TAG, "=== Notification posted with ID: " + notificationId + " ===");
            
        } catch (Exception e) {
            Log.e(TAG, "=== ERROR in showAdhanNotification ===");
            Log.e(TAG, "Error: " + e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Schedule a prayer alarm
     */
    @PluginMethod
    public void schedulePrayerAlarm(PluginCall call) {
        String prayerName = call.getString("prayerName");
        String prayerTime = call.getString("prayerTime");
        Integer requestCode = call.getInt("requestCode");

        if (prayerName == null || prayerTime == null || requestCode == null) {
            call.reject("Missing required parameters");
            return;
        }

        try {
            // Parse time
            String[] timeParts = prayerTime.split(":");
            int hour = Integer.parseInt(timeParts[0]);
            int minute = Integer.parseInt(timeParts[1]);

            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, hour);
            calendar.set(Calendar.MINUTE, minute);
            calendar.set(Calendar.SECOND, 0);

            if (calendar.getTimeInMillis() < System.currentTimeMillis()) {
                calendar.add(Calendar.DAY_OF_MONTH, 1);
            }

            Intent intent = new Intent(context, AdhanBroadcastReceiver.class);
            intent.setAction("com.theaark.wakt.ADHAN_ALARM");
            intent.putExtra("prayerName", prayerName);
            // Explicitly set the component to ensure it works when app is closed
            intent.setComponent(new android.content.ComponentName(
                    context.getPackageName(),
                    "com.theaark.wakt.AdhanBroadcastReceiver"
            ));

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Log.d(TAG, "Scheduling alarm for " + prayerName + " at " + prayerTime + " (request code: " + requestCode + ")");
            Log.d(TAG, "Calendar time: " + calendar.getTime());
            Log.d(TAG, "Current time: " + new java.util.Date());

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP,
                            calendar.getTimeInMillis(),
                            pendingIntent
                    );
                    Log.d(TAG, "✅ Scheduled EXACT alarm for " + prayerName + " at " + calendar.getTime());
                } else {
                    Log.w(TAG, "⚠️ Cannot schedule exact alarms - falling back to inexact");
                    alarmManager.setAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP,
                            calendar.getTimeInMillis(),
                            pendingIntent
                    );
                    Log.d(TAG, "⚠️ Scheduled INEXACT alarm for " + prayerName);
                }
            } else {
                Log.d(TAG, "Android < 12, using setExactAndAllowWhileIdle");
                alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        calendar.getTimeInMillis(),
                        pendingIntent
                );
                Log.d(TAG, "✅ Scheduled alarm for " + prayerName + " at " + calendar.getTime());
            }

            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling alarm", e);
            call.reject("Failed to schedule alarm: " + e.getMessage());
        }
    }

    /**
     * Cancel a prayer alarm
     */
    @PluginMethod
    public void cancelPrayerAlarm(PluginCall call) {
        String prayerName = call.getString("prayerName");
        Integer requestCode = call.getInt("requestCode");

        if (prayerName == null || requestCode == null) {
            call.reject("Missing required parameters");
            return;
        }

        try {
            Intent intent = new Intent(context, AdhanBroadcastReceiver.class);
            intent.setAction("com.theaark.wakt.ADHAN_ALARM");
            intent.putExtra("prayerName", prayerName);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            alarmManager.cancel(pendingIntent);
            Log.d(TAG, "Cancelled alarm for " + prayerName);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling alarm", e);
            call.reject("Failed to cancel alarm: " + e.getMessage());
        }
    }

    /**
     * Preview an Adhan sound
     */
    @PluginMethod
    public void previewAdhan(PluginCall call) {
        String soundName = call.getString("soundName");
        
        if (soundName == null || soundName.isEmpty()) {
            soundName = "adhan";
        }
        
        try {
            // Stop any currently playing preview
            if (mediaPlayer != null) {
                mediaPlayer.stop();
                mediaPlayer.release();
                mediaPlayer = null;
            }
            
            // Get resource ID for the sound
            int resId = context.getResources().getIdentifier(soundName, "raw", context.getPackageName());
            
            if (resId == 0) {
                call.reject("Sound file not found: " + soundName);
                return;
            }
            
            mediaPlayer = MediaPlayer.create(context, resId);
            mediaPlayer.setOnCompletionListener(mp -> {
                mp.release();
                mediaPlayer = null;
            });
            mediaPlayer.start();
            
            Log.d(TAG, "Playing preview: " + soundName);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error playing preview", e);
            call.reject("Failed to play preview: " + e.getMessage());
        }
    }
    
    /**
     * Stop preview playback
     */
    @PluginMethod
    public void stopPreview(PluginCall call) {
        try {
            if (mediaPlayer != null) {
                mediaPlayer.stop();
                mediaPlayer.release();
                mediaPlayer = null;
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop preview: " + e.getMessage());
        }
    }
    
    /**
     * Update notification channel sound when user changes selection
     */
    @PluginMethod
    public void updateNotificationSound(PluginCall call) {
        try {
            createNotificationChannel();
            Log.d(TAG, "Notification channel sound updated");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to update notification sound", e);
            call.reject("Failed to update sound: " + e.getMessage());
        }
    }

    /**
     * Check if device can schedule exact alarms
     */
    @PluginMethod
    public void canScheduleExactAlarms(PluginCall call) {
        JSObject result = new JSObject();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            result.put("canSchedule", alarmManager.canScheduleExactAlarms());
        } else {
            result.put("canSchedule", true);
        }
        
        call.resolve(result);
    }
    
    /**
     * Check if battery optimization is disabled for the app
     */
    @PluginMethod
    public void isBatteryOptimizationDisabled(PluginCall call) {
        JSObject result = new JSObject();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            boolean isIgnoring = pm.isIgnoringBatteryOptimizations(context.getPackageName());
            result.put("isDisabled", isIgnoring);
            Log.d(TAG, "Battery optimization disabled: " + isIgnoring);
        } else {
            result.put("isDisabled", true);
        }
        
        call.resolve(result);
    }
    
    /**
     * Request to disable battery optimization
     */
    @PluginMethod
    public void requestDisableBatteryOptimization(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            
            if (!pm.isIgnoringBatteryOptimizations(context.getPackageName())) {
                try {
                    Intent intent = new Intent();
                    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    
                    Log.d(TAG, "Requested battery optimization exemption");
                    call.resolve();
                } catch (Exception e) {
                    Log.e(TAG, "Failed to request battery optimization exemption", e);
                    call.reject("Failed to open battery optimization settings: " + e.getMessage());
                }
            } else {
                Log.d(TAG, "Battery optimization already disabled");
                call.resolve();
            }
        } else {
            Log.d(TAG, "Battery optimization not needed for this Android version");
            call.resolve();
        }
    }}