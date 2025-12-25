# Build web and sync to Android (~1 minute)
# No install step - just prepare files
Write-Host "Building web app..." -ForegroundColor Cyan
cd "c:\Users\mdjub\Desktop\NewProject\wakt"
npm run build

Write-Host ""
Write-Host "Syncing to Android..." -ForegroundColor Cyan
npx cap sync android

Write-Host ""
Write-Host "✓ Web build and sync complete!" -ForegroundColor Green
Write-Host "Now run: .\build.ps1  to build APK" -ForegroundColor Yellow

