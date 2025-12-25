# Wakt App Icon Setup Instructions

## Step 1: Generate Icon Sizes

Upload your icon to one of these free online generators:

### Option A: Android Asset Studio (Recommended)
1. Go to: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. Upload your Wakt icon image
3. Adjust padding if needed
4. Download the generated zip file
5. Extract it - you'll see folders like `mipmap-mdpi`, `mipmap-hdpi`, etc.

### Option B: AppIcon.co
1. Go to: https://www.appicon.co/
2. Upload your icon
3. Select "Android" platform
4. Download and extract

### Option C: Icon Kitchen
1. Go to: https://icon.kitchen/
2. Upload your icon
3. Customize if needed
4. Download Android package

## Step 2: Use the Script

Once you have the generated icons folder:

```powershell
# Run from the wakt project directory
.\update-icons.ps1 -IconSourceFolder "C:\path\to\extracted\icons"
```

For example:
```powershell
.\update-icons.ps1 -IconSourceFolder "C:\Users\mdjub\Downloads\wakt-icons"
```

## Step 3: Sync with Android

```powershell
npx capacitor sync android
```

## Manual Method (if script doesn't work)

Copy these files manually:
- `ic_launcher.png` and `ic_launcher_round.png` to each folder:
  - `android/app/src/main/res/mipmap-mdpi/`
  - `android/app/src/main/res/mipmap-hdpi/`
  - `android/app/src/main/res/mipmap-xhdpi/`
  - `android/app/src/main/res/mipmap-xxhdpi/`
  - `android/app/src/main/res/mipmap-xxxhdpi/`

## Required Sizes
- mipmap-mdpi: 48x48px
- mipmap-hdpi: 72x72px
- mipmap-xhdpi: 96x96px
- mipmap-xxhdpi: 144x144px
- mipmap-xxxhdpi: 192x192px
