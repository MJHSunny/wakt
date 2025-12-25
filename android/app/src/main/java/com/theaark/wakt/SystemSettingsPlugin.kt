package com.theaark.wakt

import android.content.Intent
import android.provider.Settings
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "SystemSettings")
class SystemSettingsPlugin : Plugin() {

    @PluginMethod
    fun openWifiSettings(call: PluginCall) {
        val activity = bridge.activity
        try {
            val intent = Intent(Settings.ACTION_WIFI_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity?.startActivity(intent)
            call.resolve()
        } catch (e1: Exception) {
            try {
                val intent = Intent(Settings.ACTION_WIRELESS_SETTINGS)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                activity?.startActivity(intent)
                call.resolve()
            } catch (e2: Exception) {
                try {
                    val intent = Intent(Settings.ACTION_SETTINGS)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    activity?.startActivity(intent)
                    call.resolve()
                } catch (e3: Exception) {
                    call.reject("Failed to open Wi‑Fi settings")
                }
            }
        }
    }

    @PluginMethod
    fun openMobileDataSettings(call: PluginCall) {
        val activity = bridge.activity
        try {
            val intent = Intent(Settings.ACTION_DATA_ROAMING_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity?.startActivity(intent)
            call.resolve()
        } catch (e1: Exception) {
            try {
                val intent = Intent(Settings.ACTION_NETWORK_OPERATOR_SETTINGS)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                activity?.startActivity(intent)
                call.resolve()
            } catch (e2: Exception) {
                try {
                    val intent = Intent(Settings.ACTION_WIRELESS_SETTINGS)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    activity?.startActivity(intent)
                    call.resolve()
                } catch (e3: Exception) {
                    try {
                        val intent = Intent(Settings.ACTION_SETTINGS)
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        activity?.startActivity(intent)
                        call.resolve()
                    } catch (e4: Exception) {
                        call.reject("Failed to open Mobile Data settings")
                    }
                }
            }
        }
    }
}