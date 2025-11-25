# PWA Icons Setup

## Current Status
SVG icons have been generated. For full PWA support, convert them to PNG format.

## Quick Setup

### Option 1: Use the Icon Generator (Recommended)
1. Open `public/icon-generator.html` in your browser
2. Click on each canvas to download the PNG icons
3. Save them as `icon-192.png` and `icon-512.png` in the `public` folder

### Option 2: Convert SVG to PNG Online
1. Go to https://convertio.co/svg-png/ or similar
2. Upload `icon-192.svg` and convert to PNG
3. Upload `icon-512.svg` and convert to PNG
4. Save as `icon-192.png` and `icon-512.png` in the `public` folder

### Option 3: Use ImageMagick (Command Line)
```bash
magick icon-192.svg icon-192.png
magick icon-512.svg icon-512.png
```

## Icon Requirements
- **icon-192.png**: 192x192 pixels (for Android)
- **icon-512.png**: 512x512 pixels (for iOS and high-res displays)

## After Adding Icons
The PWA will automatically detect the icons when you rebuild the app:
```bash
npm run build
```

The service worker will cache the icons for offline use.

