# App Icon Updater Script for Wakt
# This script copies your generated app icons to the correct Android directories

param(
    [Parameter(Mandatory=$true)]
    [string]$IconSourceFolder
)

Write-Host "Updating Wakt app icons..." -ForegroundColor Green

$baseResPath = ".\android\app\src\main\res"

# Define icon sizes and their corresponding density folders
$iconSizes = @{
    "mipmap-mdpi" = "48x48"
    "mipmap-hdpi" = "72x72"
    "mipmap-xhdpi" = "96x96"
    "mipmap-xxhdpi" = "144x144"
    "mipmap-xxxhdpi" = "192x192"
}

# Icon files to copy (standard and round)
$iconFiles = @("ic_launcher.png", "ic_launcher_round.png")

foreach ($density in $iconSizes.Keys) {
    $targetPath = Join-Path $baseResPath $density
    
    if (-not (Test-Path $targetPath)) {
        Write-Host "Creating directory: $targetPath" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
    }
    
    foreach ($iconFile in $iconFiles) {
        $sourcePath = Join-Path $IconSourceFolder "$density\$iconFile"
        $destPath = Join-Path $targetPath $iconFile
        
        if (Test-Path $sourcePath) {
            Copy-Item -Path $sourcePath -Destination $destPath -Force
            Write-Host "✓ Copied $iconFile to $density" -ForegroundColor Green
        } else {
            Write-Host "⚠ Missing: $sourcePath" -ForegroundColor Yellow
        }
    }
}

Write-Host "`nIcon update complete!" -ForegroundColor Green
Write-Host "Run 'npx capacitor sync android' to apply changes." -ForegroundColor Cyan
