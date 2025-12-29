package com.theaark.wakt;

import android.os.Bundle;
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
        registerPlugin(StatusBarThemePlugin.class);
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
        Window window = getWindow();

        // Edge-to-edge content: draw under system bars, but leave them visible.
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // Clear translucent flags and enable drawing bar backgrounds.
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

        // Set a solid default status bar color (primary). The
        // native StatusBarThemePlugin will override this per page
        // when React calls setStatusBarTheme(...).
        window.setStatusBarColor(0xFF0A6B5D);

        // Keep navigation bar solid black at the bottom.
        window.setNavigationBarColor(0xFF000000);

        View decorView = window.getDecorView();
        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(window, decorView);
        controller.show(WindowInsetsCompat.Type.statusBars());
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
    }

    private void bindInsetsToWebView() {
        final View decor = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            int systemTop = Math.max(0, bars.top);
            int systemBottom = Math.max(0, bars.bottom);
            
            // Use 40% of system bars for visual fit (124px * 0.4 = ~50px)
            // This accounts for the fact that system bars include transparent padding
            final int bottom = (int)(systemBottom * 0.4);
            // Apply the same idea to the top inset so we
            // get a device-aware but slightly reduced
            // padding for headers instead of the full
            // raw status bar height.
            final int top = (int)(systemTop * 0.4);
            
            if (getBridge() != null && getBridge().getWebView() != null) {
                runOnUiThread(() -> {
                    try {
                        String js = "document.documentElement.style.setProperty('--android-system-bottom', '" + bottom + "px');" +
                                     "document.documentElement.style.setProperty('--android-system-top', '" + top + "px')";
                        getBridge().getWebView().evaluateJavascript(js, null);
                    } catch (Exception ignored) {}
                });
            }
            return insets;
        });
    }
}
