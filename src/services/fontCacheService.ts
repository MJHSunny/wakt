/**
 * Font caching service for offline support
 * Pre-downloads and caches Google Fonts when internet is available
 * Falls back to cached fonts if offline on subsequent runs
 */

const FONT_CACHE_KEY = 'wakt_fonts_cache';
const FONT_CACHE_TIMESTAMP_KEY = 'wakt_fonts_cache_timestamp';
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedFont {
  fontFamily: string;
  cssText: string;
  cachedAt: number;
}

/**
 * Download fonts from Google Fonts and cache them locally
 * This should be called when internet is confirmed available
 */
export async function preCacheFonts(): Promise<boolean> {
  try {
    // Check if cache is still valid
    const cachedTimestamp = localStorage.getItem(FONT_CACHE_TIMESTAMP_KEY);
    if (cachedTimestamp) {
      const age = Date.now() - parseInt(cachedTimestamp, 10);
      if (age < CACHE_DURATION_MS) {
        // Cache is still valid, apply it
        await applyFontCache();
        return true;
      }
    }

    // Fetch and cache Montserrat font from Google Fonts
    const fontUrl =
      'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap';

    const response = await fetch(fontUrl);
    if (!response.ok) {
      console.warn('Failed to fetch fonts from Google Fonts');
      return false;
    }

    let cssText = await response.text();

    // Extract font URLs from CSS and download them
    const fontUrls = extractFontUrls(cssText);
    const fontData: Record<string, string> = {};

    for (const { url, format } of fontUrls) {
      try {
        const fontResponse = await fetch(url);
        if (fontResponse.ok) {
          const blob = await fontResponse.blob();
          fontData[url] = await blobToBase64(blob);
        }
      } catch (e) {
        console.warn(`Failed to download font from ${url}:`, e);
      }
    }

    // Replace font URLs with base64 encoded data in CSS
    if (Object.keys(fontData).length > 0) {
      cssText = replaceFontUrlsWithData(cssText, fontData);
    }

    // Store in localStorage
    const cacheData: CachedFont = {
      fontFamily: 'Montserrat',
      cssText,
      cachedAt: Date.now(),
    };

    localStorage.setItem(FONT_CACHE_KEY, JSON.stringify(cacheData));
    localStorage.setItem(FONT_CACHE_TIMESTAMP_KEY, Date.now().toString());

    // Apply the cached fonts immediately
    applyFontCSS(cssText);
    return true;
  } catch (error) {
    console.warn('Error pre-caching fonts:', error);
    return false;
  }
}

/**
 * Apply cached fonts if available
 */
export async function applyFontCache(): Promise<void> {
  try {
    const cached = localStorage.getItem(FONT_CACHE_KEY);
    if (cached) {
      const { cssText } = JSON.parse(cached) as CachedFont;
      applyFontCSS(cssText);
    }
  } catch (error) {
    console.warn('Error applying cached fonts:', error);
  }
}

/**
 * Extract font URLs from Google Fonts CSS
 */
function extractFontUrls(
  cssText: string
): Array<{ url: string; format: string }> {
  const urls: Array<{ url: string; format: string }> = [];
  const urlPattern = /url\(([^)]+)\)\s+format\('([^']+)'\)/g;
  let match;

  while ((match = urlPattern.exec(cssText)) !== null) {
    const url = match[1].replace(/['"]/g, '');
    const format = match[2];
    urls.push({ url, format });
  }

  return urls;
}

/**
 * Convert blob to base64 data URI
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Replace font URLs with base64 encoded data
 */
function replaceFontUrlsWithData(
  cssText: string,
  fontData: Record<string, string>
): string {
  let result = cssText;

  for (const [originalUrl, dataUrl] of Object.entries(fontData)) {
    // Escape special regex characters in the URL
    const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`url\\(['"]?${escapedUrl}['"]?\\)`, 'g');
    result = result.replace(regex, `url('${dataUrl}')`);
  }

  return result;
}

/**
 * Apply font CSS to the document
 */
function applyFontCSS(cssText: string): void {
  // Remove existing font style if present
  const existingStyle = document.getElementById('wakt-fonts-style');
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create and inject new style
  const style = document.createElement('style');
  style.id = 'wakt-fonts-style';
  style.textContent = cssText;
  document.head.appendChild(style);
}

/**
 * Clear cached fonts
 */
export function clearFontCache(): void {
  localStorage.removeItem(FONT_CACHE_KEY);
  localStorage.removeItem(FONT_CACHE_TIMESTAMP_KEY);
  const style = document.getElementById('wakt-fonts-style');
  if (style) {
    style.remove();
  }
}
