package com.theaark.wakt

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "QiblaDirection")
class QiblaDirectionPlugin : Plugin() {
    private var manager: QiblaDirectionManager? = null
    private var wasRunning: Boolean = false

    private fun startNative() {
        val mgr = manager ?: QiblaDirectionManager().also { manager = it }
        mgr.start(
            context,
            { angle ->
                val data = JSObject()
                data.put("angle", angle)
                notifyListeners("direction", data)
            },
            { level, raw ->
                val acc = JSObject()
                acc.put("level", level)
                acc.put("raw", raw)
                notifyListeners("accuracy", acc)
            },
            { heading ->
                val h = JSObject()
                h.put("heading", heading)
                notifyListeners("heading", h)
            }
        )
    }

    override fun load() {
        super.load()
        manager = QiblaDirectionManager()
    }

    @PluginMethod
    fun start(call: PluginCall) {
        startNative()
        wasRunning = true
        val ret = JSObject()
        ret.put("started", true)
        call.resolve(ret)
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        manager?.stop()
        wasRunning = false
        call.resolve()
    }

    override fun handleOnPause() {
        super.handleOnPause()
        if (manager != null) {
            wasRunning = true
            manager?.stop()
        }
    }

    override fun handleOnResume() {
        super.handleOnResume()
        if (wasRunning) {
            startNative()
        }
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        wasRunning = false
        manager?.stop()
    }
}
