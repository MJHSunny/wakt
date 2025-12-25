# Full-Screen Adhan Implementation - Setup Guide

## ✅ Completed Steps

### 1. **Android Native Files Created**
   - ✅ `AdhanNotificationPlugin.java` - Capacitor plugin for alarm scheduling
   - ✅ `AdhanBroadcastReceiver.java` - Alarm trigger and device boot handler
   - ✅ `AdhanService.java` - Background audio playback service
   - ✅ `AdhanActivity.java` - Full-screen activity for Adhan display
   - ✅ `activity_adhan.xml` - Layout with prayer name and controls

### 2. **AndroidManifest.xml Updated**
   - ✅ Added permissions:
     - `SCHEDULE_EXACT_ALARM` (Android 12+)
     - `POST_NOTIFICATIONS` (Android 13+)
     - `USE_FULL_SCREEN_INTENT` (Android 14+)
     - `WAKE_LOCK`
     - `FOREGROUND_SERVICE`
     - `RECEIVE_BOOT_COMPLETED`
   - ✅ Registered `AdhanActivity` as exported full-screen activity
   - ✅ Registered `AdhanBroadcastReceiver` with ADHAN_ALARM and BOOT_COMPLETED intents
   - ✅ Registered `AdhanService` with alarm foreground service type

### 3. **Capacitor Configuration**
   - ✅ Added `AdhanNotificationPlugin` to `capacitor.config.ts`

### 4. **TypeScript Service Created**
   - ✅ `src/services/adhanNotificationService.ts` - Wrapper for Capacitor plugin
     - `schedulePrayerAlarm()` - Schedule prayer at specific time
     - `cancelPrayerAlarm()` - Cancel scheduled alarm
     - `canScheduleExactAlarms()` - Check Android 12+ capability
     - `canUseFullScreenIntent()` - Check Android 14+ capability
     - `requestFullScreenIntentPermission()` - Request Android 14+ permission
     - `showAdhanNotification()` - Show immediate notification

### 5. **NotificationsPage Updated**
   - ✅ Integrated with `adhanNotificationService`
   - ✅ Added permission status checks
   - ✅ Shows battery optimization warning when exact alarms not available
   - ✅ Shows full-screen intent permission warning
   - ✅ Displays scheduled status (green checkmark) for each prayer
   - ✅ Calls service methods when toggling notifications
   - ✅ Displays prayer times from context

### 6. **Theme Added**
   - ✅ `AppTheme.FullScreen` - Full-screen theme for AdhanActivity in `styles.xml`

### 7. **Audio Directory Created**
   - ✅ `/android/app/src/main/res/raw/` directory ready for audio file

---

## ⚠️ Remaining Setup Steps

### Step 1: Add Adhan Audio File
**Location:** `android/app/src/main/res/raw/adhan.mp3`

Options for Adhan audio:
- Download from Wikimedia Commons (public domain): https://commons.wikimedia.org/wiki/File:Adhan.ogg
- Use royalty-free Islamic audio sources
- Recommended: 3-5 minute recording for full loop

**Process:**
1. Download or record Adhan audio in MP3 format
2. Convert to MP3 if necessary (ideally 128-192 kbps)
3. Place file as `android/app/src/main/res/raw/adhan.mp3`
4. File will automatically be compiled into app

### Step 2: Build and Test

```bash
# Rebuild native assets
npx capacitor sync android

# Build APK
./gradlew build

# Or run on device
./gradlew installDebug
```

### Step 3: Test on Physical Device (Recommended)

1. Install APK on Android 12+ device
2. Go to Notifications page
3. Toggle a prayer notification ON
4. Grant required permissions when prompted
5. Wait for scheduled prayer time (or manually trigger in adb)
6. Full-screen Adhan should appear with alarm audio

**Manual Trigger for Testing:**
```bash
adb shell am broadcast -a com.theaark.wakt.ADHAN_ALARM --es prayerName Fajr
```

### Step 4: Handle Device Reboot (Optional but Recommended)

Currently, the `AdhanBroadcastReceiver.handleBootCompleted()` has a TODO comment.

To implement alarm rescheduling after device reboot:
1. Save notification settings to `SharedPreferences`
2. On BOOT_COMPLETED, retrieve saved settings
3. Reschedule all enabled prayer alarms

**Implementation location:** 
- File: `AdhanBroadcastReceiver.java`, method: `handleBootCompleted()`
- Need to query last known prayer times and reschedule

### Step 5: Battery Optimization (Optional but Important)

For reliable alarms:
1. Add prompt to request battery optimization exemption
2. Intent to open app battery settings:
   ```java
   Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
   intent.setData(Uri.parse("package:" + getPackageName()));
   startActivity(intent);
   ```

---

## 🔧 Architecture Overview

### Alarm Scheduling Flow
```
User toggles notification ON in UI
    ↓
NotificationsPage calls adhanNotificationService.schedulePrayerAlarm()
    ↓
Service calls Capacitor plugin AdhanNotificationPlugin.schedulePrayerAlarm()
    ↓
Plugin uses AlarmManager.setExactAndAllowWhileIdle() (Android 12+)
    ↓
AlarmManager fires at scheduled time → BroadcastReceiver triggered
```

### Adhan Display Flow
```
AlarmManager triggers at prayer time
    ↓
AdhanBroadcastReceiver.onReceive() called
    ↓
Launches AdhanActivity (full-screen, shows on lock screen)
    ↓
Launches AdhanService (background audio playback)
    ↓
Service plays Adhan audio for 3 minutes on loop
    ↓
User taps Dismiss or Snooze
```

---

## 📱 Supported Android Versions

- **Android 12+**: Exact alarm scheduling with `canScheduleExactAlarms()` check
- **Android 13+**: POST_NOTIFICATIONS permission required
- **Android 14+**: Full-screen intent permission with `canUseFullScreenIntent()` check
- **Below Android 12**: Falls back to inexact alarms

---

## 🐛 Troubleshooting

### Adhan doesn't play
- Check `android/app/src/main/res/raw/adhan.mp3` exists
- Verify MediaPlayer initialization in `AdhanService.java`
- Check Android logs: `adb logcat | grep AdhanService`

### Full-screen activity doesn't show
- Verify `setShowWhenLocked(true)` and `setTurnScreenOn(true)` are called
- Check device's app notification settings allow lock-screen display
- Verify `android.permission.USE_FULL_SCREEN_INTENT` is granted (Android 14+)

### Alarms not triggering
- Verify battery optimization is disabled for Wakt app
- Check `SCHEDULE_EXACT_ALARM` permission is granted
- Verify `AlarmManager.canScheduleExactAlarms()` returns true

### Permissions showing incorrectly
- Clear app data and rebuild
- Check `AdhanNotificationPlugin.createNotificationChannel()` runs on first load
- Verify permissions in `AndroidManifest.xml` are correct

---

## 📝 Next Features (Future)

1. **Snooze Implementation**: Reschedule alarm for 5 minutes later
2. **Device Boot Handling**: Auto-reschedule alarms after reboot
3. **Battery Optimization**: Request exemption from battery optimization
4. **Multiple Adhan Sounds**: Allow user to select different Adhan recordings
5. **Notification Customization**: Title, message, vibration pattern settings

---

## 🎯 Current Status

All core infrastructure is in place. The app is ready for:
1. ✅ Adding Adhan audio file
2. ✅ Building and testing
3. ✅ Deploying to Android devices

No code changes needed until audio file is added and tested.
