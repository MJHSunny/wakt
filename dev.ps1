# Fast dev workflow: Build web + sync + build APK (~1-2 minutes)
Write-Host "=== Wakt Dev Build ===" -ForegroundColor Magenta
Write-Host ""

Write-Host "1. Building web app..." -ForegroundColor Cyan
cd "c:\Users\mdjub\Desktop\NewProject\wakt"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Web build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Syncing to Android..." -ForegroundColor Cyan
npx cap sync android

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Sync failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "3. Building APK..." -ForegroundColor Cyan
cd android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cmd /c "gradlew assembleDebug -x lint 2>&1" | Select-String "BUILD"

Write-Host ""
Write-Host "✓ All done!" -ForegroundColor Green
Write-Host ""
Write-Host "APK ready at: android/app/build/outputs/apk/debug/app-debug.apk" -ForegroundColor Yellow
Write-Host "Transfer to phone and install manually" -ForegroundColor Yellow


