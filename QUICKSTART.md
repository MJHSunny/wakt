# 🚀 Quick Start Guide - Wakt App

## ✅ What's Been Done

Your Wakt Prayer Times app is now fully configured for Android! Here's what's ready:

### Installed & Configured:
- ✅ Capacitor Android platform
- ✅ GPS location services
- ✅ Push notifications
- ✅ Prayer calculation library (Adhan)
- ✅ All Android permissions
- ✅ Service integrations with React components

## 🎯 Run Your App Now!

### Option 1: Android Studio (Recommended)
Android Studio should be opening now. If not:
```bash
npx cap open android
```

Then:
1. Wait for Gradle sync to finish
2. Click the green ▶️ Run button
3. Select your device/emulator
4. App will install and launch!

### Option 2: Command Line (if you have Android SDK)
```bash
cd android
./gradlew installDebug
```

## 📱 Testing the App

When the app launches:

1. **Permission Screen** will appear first
   - Tap "Allow Location Access" → Grant permission
   - Tap "Allow Notifications" → Grant permission

2. **Home Screen** will show:
   - Your location (city, country)
   - Today's prayer times
   - Sunrise and sunset
   - Time until next prayer

3. **Bottom Navigation:**
   - 🏠 Home - Prayer times overview
   - 📅 Schedule - Weekly prayer schedule
   - 🕋 Calendar - Islamic calendar
   - 🧭 Qibla - Qibla direction
   - ⚙️ Settings - App settings

## 🔄 Development Workflow

### Making React Changes:
```bash
# 1. Edit your React files
# 2. Build
npm run build

# 3. Copy to Android
npx cap copy

# 4. Run in Android Studio
npx cap open android
```

### Adding New Capacitor Plugins:
```bash
# 1. Install plugin
npm install @capacitor/camera

# 2. Sync everything
npm run build
npx cap sync

# 3. Run in Android Studio
npx cap open android
```

## 🎨 What You Can Customize

### Prayer Calculation Settings:
Edit in: [src/app/components/SettingsPage.tsx](src/app/components/SettingsPage.tsx)
- Calculation method (Muslim World League, ISNA, Egyptian, etc.)
- Madhab (Shafi, Hanafi)
- Time format (12/24 hour)

### Notification Settings:
Edit in: [src/app/components/NotificationsPage.tsx](src/app/components/NotificationsPage.tsx)
- Enable/disable per prayer
- Notification timing (at prayer time, 5 min before, 10 min before)

### Theme/Colors:
Edit in: [src/styles/tailwind.css](src/styles/tailwind.css) or [src/styles/theme.css](src/styles/theme.css)

## 🏗️ Building for Release

### Create APK for Testing:
In Android Studio:
1. Build → Build Bundle(s) / APK(s) → Build APK(s)
2. Find APK in: `android/app/build/outputs/apk/debug/`
3. Install on any Android device

### Create AAB for Play Store:
In Android Studio:
1. Build → Generate Signed Bundle / APK
2. Choose "Android App Bundle"
3. Create or use existing keystore
4. Sign and build
5. Upload to Play Console

## 🐛 Common Issues & Fixes

### "App won't run"
```bash
# Clean everything
cd android
./gradlew clean
cd ..
npm run build
npx cap sync
```

### "Location not working"
- Check Android device has GPS enabled
- Grant location permission when prompted
- Try on real device (emulator GPS can be finicky)

### "Notifications not showing"
- For Android 13+: Explicitly grant notification permission
- Check "Do Not Disturb" is off
- Test with "Test Notification" feature in Notifications page

### "Build errors in Android Studio"
- Wait for Gradle sync to complete
- File → Invalidate Caches / Restart
- Ensure Android SDK 33+ is installed

## 📝 Key Files

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | App configuration |
| `android/app/src/main/AndroidManifest.xml` | Android permissions |
| `src/services/prayerService.ts` | Prayer calculations |
| `src/services/locationService.ts` | GPS & location |
| `src/services/notificationService.ts` | Notifications |
| `src/app/context/AppContext.tsx` | Global app state |

## 🎯 Next Features to Add

1. **Qibla Compass**
   - Use device compass sensor
   - Calculate angle to Mecca from current location

2. **Hijri Calendar**
   - Add Hijri date library
   - Show full calendar view

3. **Adhan Sound**
   - Add MP3 audio files
   - Play at prayer times

4. **Widget**
   - Create Android home screen widget
   - Show next prayer time

## 🆘 Need Help?

1. Check [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed documentation
2. View Android Studio Logcat for error messages
3. Check Capacitor docs: https://capacitorjs.com
4. Check Adhan library docs: https://github.com/batoulapps/adhan-js

---

## ✨ You're All Set!

Your app is ready to run! Open Android Studio and click the Run button.

**App Details:**
- Name: Wakt - Prayer Times
- Package: com.theaark.wakt
- Platform: Android (Capacitor)

Happy developing! 🌙
