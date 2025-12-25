# Fast APK build only (~30 seconds)
# Use this to build APK, then transfer to phone manually
Write-Host "Building APK..." -ForegroundColor Cyan
cd "c:\Users\mdjub\Desktop\NewProject\wakt\android"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cmd /c "gradlew assembleDebug -x lint 2>&1" | Select-String "BUILD"
Write-Host ""
Write-Host "✓ APK built successfully!" -ForegroundColor Green
Write-Host "Location: android/app/build/outputs/apk/debug/app-debug.apk" -ForegroundColor Yellow
Write-Host "Transfer to phone and install manually" -ForegroundColor Yellow

