package com.theaark.wakt

import android.annotation.SuppressLint
import android.content.Context
import android.hardware.*
import android.location.Location
import android.util.Log
import com.google.android.gms.location.*
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * QiblaDirectionManager
 * - Fetches location via FusedLocationProviderClient
 * - Calls Ummah API for Qibla bearing
 * - Listens to accelerometer + magnetometer to compute device heading
 * - Emits rotation angle to point an arrow toward Qibla in real time
 *
 * Usage:
 * val manager = QiblaDirectionManager()
 * manager.start(context) { angle -> qiblaArrow.rotation = angle }
 * // ... later
 * manager.stop()
 */
class QiblaDirectionManager : SensorEventListener {

    private var fusedClient: FusedLocationProviderClient? = null
    private var sensorManager: SensorManager? = null
    private var accel: Sensor? = null
    private var magnet: Sensor? = null

    private var accelValues = FloatArray(3)
    private var magnetValues = FloatArray(3)
    private var haveAccel = false
    private var haveMagnet = false

    private var currentHeadingDeg: Float = 0f
    private var lastLocation: Location? = null
    private var lastQiblaBearing: Float? = null
    private var lastApiLat: Double? = null
    private var lastApiLng: Double? = null

    private var onUpdate: ((Float) -> Unit)? = null
    private var onHeadingUpdate: ((Float) -> Unit)? = null
    private var onAccuracyUpdate: ((String, Int) -> Unit)? = null

    @Volatile
    private var running = false

    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .build()

    private var locationCallback: LocationCallback? = null

    fun start(
        context: Context,
        onDirectionUpdate: (Float) -> Unit,
        onAccuracyUpdate: ((String, Int) -> Unit)? = null,
        onHeadingUpdate: ((Float) -> Unit)? = null
    ) {
        if (running) return
        running = true
        this.onUpdate = onDirectionUpdate
        this.onAccuracyUpdate = onAccuracyUpdate
        this.onHeadingUpdate = onHeadingUpdate

        fusedClient = LocationServices.getFusedLocationProviderClient(context)
        sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accel = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        magnet = sensorManager?.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)

        // Register sensors
        val rate = SensorManager.SENSOR_DELAY_GAME
        accel?.let { sensorManager?.registerListener(this, it, rate) }
        magnet?.let { sensorManager?.registerListener(this, it, rate) }

        // Prime location + Qibla bearing
        fetchLocationAndQibla(context)
    }

    fun stop() {
        running = false
        onUpdate = null
        onAccuracyUpdate = null
        onHeadingUpdate = null
        sensorManager?.unregisterListener(this)
        locationCallback?.let { fusedClient?.removeLocationUpdates(it) }
        locationCallback = null
    }

    @SuppressLint("MissingPermission")
    private fun fetchLocationAndQibla(context: Context) {
        val fused = fusedClient ?: return
        // Try last location first
        fused.lastLocation
            .addOnSuccessListener { loc ->
                if (loc != null) {
                    onNewLocation(context, loc)
                } else {
                    // Request single update if last known is null
                    val req = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 2_000)
                        .setMaxUpdates(1)
                        .build()
                    locationCallback = object : LocationCallback() {
                        override fun onLocationResult(result: LocationResult) {
                            val l = result.lastLocation
                            if (l != null) {
                                onNewLocation(context, l)
                            }
                        }
                    }
                    fused.requestLocationUpdates(req, locationCallback as LocationCallback, context.mainLooper)
                }
            }
            .addOnFailureListener { e ->
                Log.w(TAG, "Failed to get last location: ${e.message}")
            }
    }

    private fun onNewLocation(context: Context, location: Location) {
        lastLocation = location
        maybeFetchQiblaFromApi(location)
    }

    private fun hasSignificantLocationChange(lat: Double, lng: Double): Boolean {
        val prevLat = lastApiLat
        val prevLng = lastApiLng
        if (prevLat == null || prevLng == null) return true
        val dLat = abs(lat - prevLat)
        val dLng = abs(lng - prevLng)
        // Rough threshold ~0.001 deg ~ 100m
        return dLat > 0.001 || dLng > 0.001
    }

    private fun maybeFetchQiblaFromApi(location: Location) {
        val lat = location.latitude
        val lng = location.longitude
        if (!hasSignificantLocationChange(lat, lng) && lastQiblaBearing != null) {
            // Already have bearing for near-same location
            // Emit with current heading
            emitRotation()
            return
        }
        fetchQiblaBearing(lat, lng)
    }

    private fun fetchQiblaBearing(lat: Double, lng: Double) {
        val url = "https://ummahapi.com/api/qibla?lat=${lat}&lng=${lng}"
        val req = Request.Builder().url(url).get().build()
        client.newCall(req).enqueue(object : okhttp3.Callback {
            override fun onFailure(call: okhttp3.Call, e: java.io.IOException) {
                Log.w(TAG, "Qibla API failure: ${e.message}")
            }

            override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                response.use {
                    if (!it.isSuccessful) {
                        Log.w(TAG, "Qibla API HTTP ${it.code}")
                        return
                    }
                    val bodyStr = it.body?.string() ?: return
                    try {
                        val obj = JSONObject(bodyStr)
                        if (obj.has("qibla_direction")) {
                            val bearing = obj.getDouble("qibla_direction").toFloat()
                            lastQiblaBearing = ((bearing % 360f) + 360f) % 360f
                            lastApiLat = lat
                            lastApiLng = lng
                            emitRotation()
                        } else {
                            Log.w(TAG, "Qibla API missing qibla_direction")
                        }
                    } catch (ex: Exception) {
                        Log.w(TAG, "Qibla API parse error: ${ex.message}")
                    }
                }
            }
        })
    }

    private fun emitRotation() {
        val qibla = lastQiblaBearing ?: return
        val device = currentHeadingDeg
        val rotation = ((qibla - device + 360f) % 360f)
        onUpdate?.invoke(rotation)
    }

    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> {
                System.arraycopy(event.values, 0, accelValues, 0, 3)
                haveAccel = true
            }
            Sensor.TYPE_MAGNETIC_FIELD -> {
                System.arraycopy(event.values, 0, magnetValues, 0, 3)
                haveMagnet = true
            }
        }
        if (!haveAccel || !haveMagnet) return

        val R = FloatArray(9)
        val I = FloatArray(9)
        val success = SensorManager.getRotationMatrix(R, I, accelValues, magnetValues)
        if (success) {
            val orientation = FloatArray(3)
            SensorManager.getOrientation(R, orientation)
            var azimuthRad = orientation[0]
            var heading = Math.toDegrees(azimuthRad.toDouble()).toFloat()
            heading = ((heading + 360f) % 360f)

            // Optional: apply geomagnetic declination to convert magnetic north to true north
            lastLocation?.let { loc ->
                try {
                    val field = GeomagneticField(
                        loc.latitude.toFloat(),
                        loc.longitude.toFloat(),
                        loc.altitude.toFloat(),
                        System.currentTimeMillis()
                    )
                    heading = (heading + field.declination) % 360f
                    if (heading < 0) heading += 360f
                } catch (_: Exception) { }
            }

            // Simple smoothing (EMA)
            currentHeadingDeg = if (currentHeadingDeg == 0f) heading else {
                val alpha = 0.15f
                (alpha * heading + (1 - alpha) * currentHeadingDeg)
            }

            // Emit raw heading immediately so UI can rotate dial even before Qibla bearing is ready
            onHeadingUpdate?.invoke(currentHeadingDeg)

            emitRotation()
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        if (sensor?.type == Sensor.TYPE_MAGNETIC_FIELD) {
            val level = when (accuracy) {
                SensorManager.SENSOR_STATUS_UNRELIABLE -> "poor"
                SensorManager.SENSOR_STATUS_ACCURACY_LOW -> "low"
                SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM -> "fair"
                SensorManager.SENSOR_STATUS_ACCURACY_HIGH -> "good"
                else -> "unknown"
            }
            Log.i(TAG, "Compass accuracy: $level ($accuracy)")
            onAccuracyUpdate?.invoke(level, accuracy)
        }
    }

    companion object {
        private const val TAG = "QiblaDirectionMgr"
    }
}
