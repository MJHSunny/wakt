package com.theaark.wakt

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "NativePermission",
    permissions = [
        Permission(
            strings = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION],
            alias = "location"
        )
    ]
)
class NativePermissionPlugin : Plugin() {

    @PluginMethod
    fun requestLocationPermission(call: PluginCall) {
        if (getPermissionState("location") == PermissionState.GRANTED) {
            val ret = JSObject()
            ret.put("granted", true)
            call.resolve(ret)
        } else {
            requestPermissionForAlias("location", call, "locationPermsCallback")
        }
    }

    @PermissionCallback
    private fun locationPermsCallback(call: PluginCall) {
        val granted = getPermissionState("location") == PermissionState.GRANTED
        val ret = JSObject()
        ret.put("granted", granted)
        call.resolve(ret)
    }
}
