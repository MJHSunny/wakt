package com.theaark.wakt;

import android.app.Service;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

/**
 * Service for playing Adhan audio
 * Runs in foreground to ensure audio plays even when app is backgrounded
 */
public class AdhanService extends Service implements MediaPlayer.OnCompletionListener {

    private static final String TAG = "AdhanService";
    private static final String CHANNEL_ID = "adhan_notifications";
    private static final int NOTIFICATION_ID = 2000;
    private static final int MAX_LOOPS = 1; // Play once only

    private MediaPlayer mediaPlayer;
    private int loopCount = 0;
    private String prayerName = "";
    private String soundName = "";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service started");

        if (intent != null) {
            prayerName = intent.getStringExtra("prayerName");
            soundName = intent.getStringExtra("soundName");
        }

        // Ensure alarm volume is at least audible; if muted, lift to 1 step, otherwise respect user volume
        try {
            AudioManager am = (AudioManager) getSystemService(AUDIO_SERVICE);
            if (am != null) {
                int current = am.getStreamVolume(AudioManager.STREAM_ALARM);
                int max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                if (current == 0 && max > 0) {
                    am.setStreamVolume(AudioManager.STREAM_ALARM, 1, 0);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Unable to adjust alarm volume in service", e);
        }

        // Start foreground notification
        startForeground(NOTIFICATION_ID, createNotification());

        // Initialize and play Adhan audio
        playAdhan();

        return START_STICKY;
    }

    /**
     * Play Adhan audio file
     */
    private void playAdhan() {
        try {
            // Release previous player if exists
            if (mediaPlayer != null) {
                mediaPlayer.release();
            }

            mediaPlayer = new MediaPlayer();

            // Set audio attributes for alarm
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build();
                mediaPlayer.setAudioAttributes(audioAttributes);
            } else {
                mediaPlayer.setAudioStreamType(android.media.AudioManager.STREAM_ALARM);
            }

            // Resolve resource from provided sound or stored preference
            int resId = 0;
            try {
                String chosen = soundName;
                if (chosen == null || chosen.isEmpty()) {
                    android.content.SharedPreferences prefs = getApplicationContext().getSharedPreferences(
                            "CapacitorStorage", MODE_PRIVATE);
                    chosen = prefs.getString("adhanSound", "athan_makkah");
                }
                resId = getResources().getIdentifier(chosen, "raw", getPackageName());
                if (resId == 0) {
                    resId = getResources().getIdentifier("athan_makkah", "raw", getPackageName());
                }
            } catch (Exception ignored) {}
            if (resId != 0) {
                mediaPlayer.setDataSource(this, android.net.Uri.parse(
                        "android.resource://" + getPackageName() + "/" + resId
                ));
                mediaPlayer.setOnCompletionListener(this);
                mediaPlayer.prepare();
                mediaPlayer.start();
                Log.d(TAG, "Playing Adhan audio");
            } else {
                Log.e(TAG, "Adhan audio file not found");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error playing Adhan", e);
        }
    }

    @Override
    public void onCompletion(MediaPlayer mp) {
        loopCount++;
        Log.d(TAG, "Adhan audio completed, loop count: " + loopCount);

        if (loopCount < MAX_LOOPS) {
            // Replay
            try {
                mediaPlayer.seekTo(0);
                mediaPlayer.start();
            } catch (Exception e) {
                Log.e(TAG, "Error replaying Adhan", e);
                stopSelf();
            }
        } else {
            // Stop after max loops
            Log.d(TAG, "Reached max loop count, stopping service");
            stopSelf();
        }
    }

    /**
     * Create foreground notification (default style)
     */
    private android.app.Notification createNotification() {
        // Dismiss action - stops the adhan sound and notification
        Intent dismissIntent = new Intent(this, AdhanBroadcastReceiver.class);
        dismissIntent.setAction("com.theaark.wakt.DISMISS_ADHAN");

        android.app.PendingIntent dismissPendingIntent = android.app.PendingIntent.getBroadcast(
                this,
                1001,
                dismissIntent,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("🕌 Time for " + prayerName)
            .setContentIntent(dismissPendingIntent)
            .setDeleteIntent(dismissPendingIntent)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(false)
            .setOngoing(false)
            .setVibrate(new long[]{0, 500, 250, 500})
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Dismiss",
                dismissPendingIntent
            )
            .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Service destroyed");

        if (mediaPlayer != null) {
            try {
                mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception e) {
                Log.e(TAG, "Error releasing MediaPlayer", e);
            }
            mediaPlayer = null;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
