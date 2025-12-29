package com.theaark.wakt

import android.graphics.Color
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "StatusBarTheme")
class StatusBarThemePlugin : Plugin() {

    @PluginMethod
    fun setTheme(call: PluginCall) {
        val theme = call.getString("theme") ?: "primary"
        val activity = bridge.activity

        if (activity == null) {
            call.reject("No activity available")
            return
        }

        activity.runOnUiThread {
            try {
                val window = activity.window
                val decorView = window.decorView

                // Keep edge-to-edge content
                WindowCompat.setDecorFitsSystemWindows(window, false)

                // Ensure we can draw system bar backgrounds
                window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
                window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION)
                window.addFlags(android.view.WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)

                val color = when (theme) {
                    // Home dark header
                    "homeDark" -> Color.parseColor("#0a1612")
                    // Shared primary gradient headers (via #0A6B5D midpoint)
                    "primary" -> Color.parseColor("#0D7C66")
                    // Slightly softer primary for /80 and /90 variants
                    "primarySoft" -> Color.parseColor("#0A6B5D")
                    "primaryStrong" -> Color.parseColor("#0D7C66")
                    else -> Color.parseColor("#0D7C66")
                }

                window.statusBarColor = color

                val controller = WindowInsetsControllerCompat(window, decorView)
                // Make sure status bar is visible with light icons
                controller.show(WindowInsetsCompat.Type.statusBars())
                controller.isAppearanceLightStatusBars = false
                controller.isAppearanceLightNavigationBars = false

                call.resolve()
            } catch (t: Throwable) {
                call.reject("Failed to set status bar theme: ${t.message}")
            }
        }
    }
}
