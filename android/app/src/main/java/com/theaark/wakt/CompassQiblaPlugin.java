package com.theaark.wakt;

import android.app.Activity;

import androidx.appcompat.app.AppCompatActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import io.github.derysudrajat.compassqibla.CompassQibla;
import kotlin.Unit;
import android.util.Log;

@CapacitorPlugin(name = "QiblaCompass")
public class CompassQiblaPlugin extends Plugin {
    private static final String TAG = "CompassQiblaPlugin";
    @PluginMethod
    public void startListening(PluginCall call) {
        Activity baseActivity = getActivity();
        if (!(baseActivity instanceof AppCompatActivity)) {
            call.reject("Activity unavailable");
            return;
        }
        AppCompatActivity activity = (AppCompatActivity) baseActivity;

        new CompassQibla.Builder(activity)
            .onDirectionChangeListener(qiblaDirection -> {
                JSObject data = new JSObject();
                float heading = qiblaDirection.getCompassAngle();
                float qibla = qiblaDirection.getNeedleAngle();
                boolean isFacing = qiblaDirection.isFacingQibla();
                
                Log.d(TAG, "Qibla Update: heading=" + heading + ", qibla=" + qibla + ", isFacingQibla=" + isFacing);
                
                data.put("heading", heading);
                data.put("qibla", qibla);
                data.put("isFacingQibla", isFacing);
                notifyListeners("headingChange", data);
                notifyListeners("qiblaChange", data);
                return Unit.INSTANCE; // Kotlin Unit required
            })
            .build();

        JSObject result = new JSObject();
        result.put("started", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        JSObject result = new JSObject();
        result.put("stopped", true);
        call.resolve(result);
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
    }
}
