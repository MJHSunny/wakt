package com.theaark.wakt;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import android.view.Window;
import android.view.WindowManager;
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
    }

    @Override
    public void onResume() {
        super.onResume();
        applySystemBarsStyle();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applySystemBarsStyle();
    }

    private void applySystemBarsStyle() {
        // Enable edge-to-edge: let content draw behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(android.graphics.Color.TRANSPARENT);

        // Force white status bar & navigation bar icons regardless of theme
        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(false); // false => light icons (white)
        controller.setAppearanceLightNavigationBars(false);
    }
}
