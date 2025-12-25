package com.theaark.wakt

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.ImageView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class QiblaDemoActivity : AppCompatActivity() {
    private val qiblaMgr = QiblaDirectionManager()
    private lateinit var qiblaArrow: ImageView

    private val requestPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) startQibla() else Toast.makeText(this, "Location permission required", Toast.LENGTH_SHORT).show()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_qibla_demo)
        qiblaArrow = findViewById(R.id.qiblaArrow)
    }

    override fun onStart() {
        super.onStart()
        ensurePermissionAndStart()
    }

    override fun onStop() {
        super.onStop()
        qiblaMgr.stop()
    }

    private fun ensurePermissionAndStart() {
        val status = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
        if (status == PackageManager.PERMISSION_GRANTED) {
            startQibla()
        } else {
            requestPermission.launch(Manifest.permission.ACCESS_FINE_LOCATION)
        }
    }

    private fun startQibla() {
        qiblaMgr.start(
            context = this,
            onDirectionUpdate = { angle ->
                // Rotate arrow clockwise by 'angle' degrees
                runOnUiThread {
                    qiblaArrow.rotation = angle
                }
            },
            onAccuracyUpdate = { level, _ ->
                // Optional: show quick hint when accuracy is poor
                if (level == "poor") {
                    Toast.makeText(this, "Calibrate compass: move phone in a figure-8.", Toast.LENGTH_SHORT).show()
                }
            }
        )
    }
}
