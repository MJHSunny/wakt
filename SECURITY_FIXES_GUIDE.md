# Security Fixes - Quick Implementation Guide

## Issue #1: Add User-Agent Headers to API Calls

### Location
- `src/services/locationService.ts` (lines 132, 154, 200)
- `src/services/fontCacheService.ts` (line 37)

### Quick Fix

**File:** `src/services/locationService.ts`

Replace (3 occurrences):
```typescript
const response = await fetch(`https://nominatim.openstreetmap.org/...`);
```

With:
```typescript
const response = await fetch(`https://nominatim.openstreetmap.org/...`, {
  headers: {
    'User-Agent': 'Wakt-PrayerTimes/1.0.1 (Prayer Times App; Muslim Community)'
  }
});
```

**File:** `src/services/fontCacheService.ts`

Replace (line 37):
```typescript
const response = await fetch(fontUrl);
```

With:
```typescript
const response = await fetch(fontUrl, {
  headers: {
    'User-Agent': 'Wakt-PrayerTimes/1.0.1 (Prayer Times App)'
  }
});
```

**Also update:** Font file downloads (line ~48)
```typescript
const fontResponse = await fetch(url, {
  headers: {
    'User-Agent': 'Wakt-PrayerTimes/1.0.1'
  }
});
```

---

## Issue #2: API Rate Limiting

### Create New Service File
**File:** `src/services/rateLimitService.ts`

```typescript
/**
 * Simple rate limiter to prevent excessive API calls
 */

interface RateLimitConfig {
  minInterval: number; // milliseconds between requests
  maxBurst: number;    // max requests in burst
}

class RateLimiter {
  private lastRequest = 0;
  private requestCount = 0;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { minInterval: 1000, maxBurst: 5 }) {
    this.config = config;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;

    // Rate limit check
    if (elapsed < this.config.minInterval) {
      const waitTime = this.config.minInterval - elapsed;
      console.log(`[RateLimit] Waiting ${waitTime}ms before request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequest = Date.now();
    return fn();
  }

  reset(): void {
    this.lastRequest = 0;
    this.requestCount = 0;
  }
}

// Create single instance for location service
export const locationRateLimiter = new RateLimiter({
  minInterval: 500,  // 500ms between location searches
  maxBurst: 10
});

// Create instance for font caching (less strict)
export const fontRateLimiter = new RateLimiter({
  minInterval: 100,  // 100ms
  maxBurst: 3
});
```

### Update locationService.ts

Add import at top:
```typescript
import { locationRateLimiter } from './rateLimitService';
```

Wrap API calls:
```typescript
// Before:
const response = await fetch(`https://nominatim.openstreetmap.org/reverse?...`);

// After:
const response = await locationRateLimiter.execute(() =>
  fetch(`https://nominatim.openstreetmap.org/reverse?...`, {
    headers: { 'User-Agent': 'Wakt-PrayerTimes/1.0.1' }
  })
);
```

---

## Issue #3: Cache Size Validation

### Update fontCacheService.ts

Add at top (after imports):
```typescript
const MAX_CACHE_SIZE = 1024 * 100; // 100KB max for fonts

function getDataSize(data: string): number {
  return new Blob([data]).size;
}
```

In `preCacheFonts()` function, before `localStorage.setItem`:
```typescript
// Store in localStorage
const cacheData: CachedFont = {
  fontFamily: 'Montserrat',
  cssText,
  cachedAt: Date.now(),
};

const cacheJSON = JSON.stringify(cacheData);
const cacheSize = getDataSize(cacheJSON);

// Validate cache size
if (cacheSize > MAX_CACHE_SIZE) {
  console.warn(`Font cache (${cacheSize}B) exceeds limit (${MAX_CACHE_SIZE}B), skipping storage`);
  // Still apply fonts in memory, just don't persist
  applyFontCSS(cssText);
  return true;
}

localStorage.setItem(FONT_CACHE_KEY, cacheJSON);
localStorage.setItem(FONT_CACHE_TIMESTAMP_KEY, Date.now().toString());
```

---

## Issue #4: Debug Logging Cleanup

### Replace Console Logs

Add at top of files:
```typescript
const DEBUG = process.env.NODE_ENV === 'development';

const log = {
  info: (msg: string, data?: any) => {
    if (DEBUG) console.log(`[AppContext] ${msg}`, data);
  },
  warn: (msg: string, data?: any) => {
    if (DEBUG) console.warn(`[AppContext] ${msg}`, data);
  },
  error: (msg: string, error?: any) => {
    console.error(`[AppContext] ${msg}`, error);
  }
};
```

Replace:
```typescript
// Before:
console.log('[setManualLocation] SAVED TO LOCALSTORAGE');

// After:
log.info('Saved location to storage');
```

---

## Testing the Fixes

### Test Rate Limiting
```bash
# Should see rate limit logs
npm run dev
# Make rapid location searches - should have delays
```

### Test User-Agent Headers
Use browser DevTools → Network tab:
1. Search location → Check "User-Agent" in request headers
2. Verify: `Wakt-PrayerTimes/1.0.1`

### Test Cache Size
```javascript
// In browser console:
localStorage.getItem('wakt_fonts_cache')?.length // Should be < 100KB
```

---

## Build & Deploy

After implementing fixes:

```bash
npm run build
npx capacitor sync android

# Verify no TypeScript errors
```

---

## Priority Order

1. **User-Agent headers** (5 mins) - Compliance
2. **Rate limiting** (15 mins) - Stability  
3. **Cache validation** (10 mins) - Reliability
4. **Debug logging** (10 mins) - Production readiness

**Total Time:** ~40 minutes
