import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Syncs the native Android status bar color with the current page header color.
 * - Only runs on native platforms (no-op on web).
 * - Uses non-overlaid status bar so content sits below the bar.
 */
export function useStatusBarColor(color: string) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const apply = async () => {
      try {
        // Make sure the status bar is not overlaying the webview
        await StatusBar.setOverlaysWebView({ overlay: false });
        // Apply the requested background color
        await StatusBar.setBackgroundColor({ color });
        // Keep icons light to match our dark headers
        await StatusBar.setStyle({ style: Style.Light });
      } catch (err) {
        console.warn('[StatusBar] Failed to apply color', err);
      }
    };

    apply();
  }, [color]);
}
