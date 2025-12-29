import { Capacitor, registerPlugin } from '@capacitor/core';

export type StatusBarThemeKey = 'homeDark' | 'primary' | 'primarySoft' | 'primaryStrong';

interface StatusBarThemeNativePlugin {
  setTheme(options: { theme: StatusBarThemeKey }): Promise<void>;
}

const NativeStatusBarTheme = registerPlugin<StatusBarThemeNativePlugin>('StatusBarTheme');

export async function setStatusBarTheme(theme: StatusBarThemeKey) {
  // Always update the web-side overlay color so the
  // fixed status bar backdrop matches the current page.
  try {
    let color = '#0D7C66';
    switch (theme) {
      case 'homeDark':
        color = '#0a1612';
        break;
      case 'primarySoft':
        color = '#0A6B5D';
        break;
      case 'primaryStrong':
        color = '#0D7C66';
        break;
      case 'primary':
      default:
        color = '#0D7C66';
        break;
    }
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--status-bar-color', color);
    }
  } catch {
    // Ignore overlay color errors
  }

  if (!Capacitor.isNativePlatform()) return;
  try {
    await NativeStatusBarTheme.setTheme({ theme });
  } catch (err) {
    console.warn('[StatusBarTheme] Failed to set theme', err);
  }
}
