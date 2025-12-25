package com.theaark.wakt;

import android.app.Activity;
import android.content.Intent;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

/**
 * Full-screen Activity for displaying Adhan
 * Shown on lock screen and wakes device
 * User can dismiss or snooze the Adhan
 */
public class AdhanActivity extends Activity {

    private static final String TAG = "AdhanActivity";
    private String prayerName = "Prayer";
    private AudioManager audioManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_adhan);

        Log.d(TAG, "AdhanActivity created");

        // Get prayer name from intent
        if (getIntent().hasExtra("prayerName")) {
            prayerName = getIntent().getStringExtra("prayerName");
        }

        // Setup window flags for full-screen and wake device
        Window window = getWindow();
        window.addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                        WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        // Android 5.0+ specific
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }

        // Hide status bar and navigation
        hideSystemUI();

        // Setup UI
        setupUI();

        // Audio manager for volume control
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);

        // If alarm is muted, lift to 1 step; otherwise respect user volume
        try {
            if (audioManager != null) {
                int current = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
                int max = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                if (current == 0 && max > 0) {
                    audioManager.setStreamVolume(AudioManager.STREAM_ALARM, 1, 0);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Unable to adjust alarm volume", e);
        }

        // Start foreground service to play Adhan audio with selected sound
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(svc);
            } else {
                startService(svc);
            }
            Log.d(TAG, "AdhanService started with sound: " + soundName);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start AdhanService", e);
        }

        Log.d(TAG, "AdhanActivity setup complete");
    }

    /**
     * Setup UI elements
     */
    private void setupUI() {
        // Prayer name display
        TextView prayerTextView = findViewById(R.id.prayer_name);
        if (prayerTextView != null) {
            prayerTextView.setText(prayerName + " - Adhan");
        }

        // Dismiss button
        Button dismissButton = findViewById(R.id.dismiss_button);
        if (dismissButton != null) {
            dismissButton.setOnClickListener(v -> {
                Log.d(TAG, "Dismiss clicked");
                stopAdhan();
                finish();
            });
        }
    }

    /**
     * Stop Adhan playback
     */
    private void stopAdhan() {
        try {
            stopService(new android.content.Intent(this, AdhanService.class));
            Log.d(TAG, "Adhan service stopped");
        } catch (Exception e) {
            Log.e(TAG, "Error stopping Adhan service", e);
        }
    }

    

    /**
     * Hide system UI (status bar and navigation bar)
     */
    private void hideSystemUI() {
        int flags = android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
                | android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;

        getWindow().getDecorView().setSystemUiVisibility(flags);
    }

    @Override
    protected void onPause() {
        super.onPause();
        Log.d(TAG, "Activity paused");
    }

    @Override
    protected void onResume() {
        super.onResume();
        Log.d(TAG, "Activity resumed");
        hideSystemUI();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }
}
