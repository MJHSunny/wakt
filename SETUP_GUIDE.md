# Wakt - Prayer Times Android App

A beautiful Islamic prayer times app built with React and Capacitor for Android.

## 📱 App Information

- **App Name:** Wakt - Prayer Times
- **Package Name:** com.theaark.wakt
- **Platform:** Android (via Capacitor)

## ✅ Setup Complete!

Your app is now fully integrated with Android features:

### Installed Features:
- ✅ Capacitor Android platform
- ✅ Location services (GPS)
- ✅ Local notifications
- ✅ Prayer time calculations (Adhan library)
- ✅ Android permissions configured

### Created Services:
1. **Prayer Service** (`src/services/prayerService.ts`)
   - Calculate accurate prayer times using Adhan library
   - Support for multiple calculation methods
   - Support for Hanafi and Shafi madhabs

2. **Location Service** (`src/services/locationService.ts`)
   - Request and check GPS permissions
   - Get current location
   - Reverse geocoding for city/country names

3. **Notification Service** (`src/services/notificationService.ts`)
   - Schedule prayer notifications
   - Customize notification timing (at prayer time or before)
   - Enable/disable notifications per prayer

### Android Permissions:
Added to `android/app/src/main/AndroidManifest.xml`:
- Internet access
- Fine and coarse location
- Post notifications (Android 13+)
- Exact alarms
- Boot completed receiver
- Vibrate

## 🚀 Development Workflow

### Daily Development Commands:

1. **After making React/UI changes:**
   ```bash
   npm run build
   npx cap copy
   ```

2. **After installing new Capacitor plugins:**
   ```bash
   npm run build
   npx cap sync
   ```

3. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

### Build & Run:

1. **Development (Android Studio):**
   - Open the project: `npx cap open android`
   - Click the green "Run" button ▶️
   - Select your device/emulator

2. **Build APK for testing:**
   - In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)

3. **Build AAB for Play Store:**
   - In Android Studio: Build → Generate Signed Bundle / APK
   - Select "Android App Bundle"
   - Follow the signing wizard

## 📝 Key Files Modified:

### React Components:
- `src/app/App.tsx` - Wrapped with AppProvider and TimeFormatProvider
- `src/app/components/HomePage.tsx` - Uses real prayer times from context
- `src/app/components/PermissionsPage.tsx` - Real permission requests
- `src/app/components/NotificationsPage.tsx` - Real notification controls

### Context:
- `src/app/context/AppContext.tsx` - Global state management for location, prayer times, and notifications

### Configuration:
- `capacitor.config.ts` - Capacitor configuration with app details
- `android/app/src/main/AndroidManifest.xml` - Android permissions

## 🎯 Features Implemented:

### Core Features:
- ✅ Accurate prayer time calculations based on GPS location
- ✅ Multiple calculation methods (Muslim World League, ISNA, Egyptian, etc.)
- ✅ Madhab selection (Shafi, Hanafi)
- ✅ Prayer notifications with customizable timing
- ✅ Automatic location detection
- ✅ City and country display
- ✅ Auto-refresh prayer times at midnight
- ✅ Beautiful UI with time-based gradients

### Permission Flow:
1. App launches → Shows permission page
2. User grants location → App gets current location
3. User grants notifications → App can send alerts
4. Both granted → Proceed to main app

## 📱 Testing Checklist:

Before publishing, test these features:

1. **Location:**
   - [ ] App requests location permission on first launch
   - [ ] GPS coordinates are accurate
   - [ ] City/country name displays correctly

2. **Prayer Times:**
   - [ ] Times are accurate for your location
   - [ ] Times update at midnight
   - [ ] Calculation method can be changed
   - [ ] Madhab selection works

3. **Notifications:**
   - [ ] App requests notification permission
   - [ ] Notifications fire at prayer times
   - [ ] "Before" timing option works (5, 10 min before)
   - [ ] Individual prayers can be toggled on/off

4. **UI:**
   - [ ] All pages load correctly
   - [ ] Bottom navigation works
   - [ ] Settings persist after app restart
   - [ ] Time format (12/24 hour) works

## 🔄 Next Steps:

### Optional Enhancements:
1. **Hijri Calendar Integration:**
   - Add Hijri date calculation library
   - Display on calendar page

2. **Qibla Compass:**
   - Use device compass sensor
   - Calculate direction to Mecca

3. **Adhan Sound:**
   - Add audio files to assets
   - Play at prayer time

4. **Widgets:**
   - Add Android home screen widget
   - Show next prayer time

5. **Background Service:**
   - Handle notifications when app is closed
   - Re-schedule on device reboot

## 🐛 Troubleshooting:

### Build fails:
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npm run build
npx cap sync
```

### Permissions not working:
- Check `AndroidManifest.xml` has all permissions
- On Android 13+, notifications need explicit permission
- Location needs both FINE and COARSE

### App crashes on device:
- Check Android Studio Logcat for errors
- Ensure all native dependencies are synced
- Try uninstalling and reinstalling the app

## 📦 Publishing to Play Store:

1. **Prepare Assets:**
   - App icon (512x512 PNG)
   - Feature graphic (1024x500 PNG)
   - Screenshots (various sizes)
   - Privacy policy URL

2. **Build Release AAB:**
   - Create keystore for signing
   - Build signed AAB in Android Studio
   - Test on real devices

3. **Play Console:**
   - Create app listing
   - Upload AAB
   - Fill in store listing details
   - Submit for review

## 🎨 App Structure:

```
wakt/
├── src/
│   ├── services/           # Native service integrations
│   │   ├── prayerService.ts
│   │   ├── locationService.ts
│   │   └── notificationService.ts
│   ├── app/
│   │   ├── context/        # React contexts
│   │   │   ├── AppContext.tsx
│   │   │   └── TimeFormatContext.tsx
│   │   └── components/     # UI components
│   └── ...
├── android/                # Android native project
│   ├── app/
│   │   └── src/main/
│   │       └── AndroidManifest.xml
│   └── ...
├── capacitor.config.ts    # Capacitor configuration
└── package.json

```

## 📚 Resources:

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Adhan Library](https://github.com/batoulapps/adhan-js)
- [Android Developer Docs](https://developer.android.com)
- [Play Console](https://play.google.com/console)

---

**Happy Coding! 🚀**

Need help? Check the Capacitor documentation or Android Studio logs for detailed error messages.
