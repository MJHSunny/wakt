package com.theaark.wakt;

import android.os.Bundle;
import android.util.Log;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.graphics.Insets;
import android.view.Window;
import android.view.WindowManager;
import android.view.View;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdhanNotificationPlugin.class);
        registerPlugin(CompassQiblaPlugin.class);
        registerPlugin(QiblaDirectionPlugin.class);
        registerPlugin(NativePermissionPlugin.class);
        registerPlugin(SystemSettingsPlugin.class);
        super.onCreate(savedInstanceState);
        applySystemBarsStyle();
        bindInsetsToWebView();
    }

    @Override
    public void onResume() {
        super.onResume();
        applySystemBarsStyle();
        bindInsetsToWebView();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applySystemBarsStyle();
    }

    private void applySystemBarsStyle() {
        // Enable edge-to-edge: content draws behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        Window window = getWindow();
        
        // Clear any translucent flags
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
        
        // Enable drawing system bar backgrounds
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        
        // Force layout in screen (MIUI fix)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = window.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(lp);
        }
        
        // Status bar: use app theme color
        try {
            int darkThemeColor = android.graphics.Color.parseColor("#1a1f2e");
            window.setStatusBarColor(darkThemeColor);
        } catch (Exception ignored) {
            window.setStatusBarColor(android.graphics.Color.BLACK);
        }
        
        // Navigation bar: FORCE SOLID BLACK - multiple approaches for MIUI compatibility
        window.setNavigationBarColor(0xFF000000);
        
        // Try to disable scrim overlay (Android 10+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            window.setNavigationBarContrastEnforced(true); // Changed to true to force solid
            window.isNavigationBarContrastEnforced();
        }
        
        // Disable navigation bar divider
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
            window.setNavigationBarDividerColor(android.graphics.Color.TRANSPARENT);
        }

        // Icon appearance: light icons for dark backgrounds
        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
    }

    private void bindInsetsToWebView() {
        final View decor = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            int systemBottom = Math.max(0, bars.bottom);
            
            // Use 40% of system bars for visual fit (124px * 0.4 = ~50px)
            // This accounts for the fact that system bars include transparent padding
            final int bottom = (int)(systemBottom * 0.4);
            
            if (getBridge() != null && getBridge().getWebView() != null) {
                runOnUiThread(() -> {
                    try {
                        String js = "document.documentElement.style.setProperty('--android-system-bottom', '" + bottom + "px')";
                        getBridge().getWebView().evaluateJavascript(js, null);
                    } catch (Exception ignored) {}
                });
            }
            return insets;
        });
    }
}
