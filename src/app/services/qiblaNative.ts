import { registerPlugin, PluginListenerHandle, Capacitor } from '@capacitor/core';

export type DirectionEvent = { angle: number };
export type AccuracyEvent = { level: 'poor' | 'low' | 'fair' | 'good' | 'unknown'; raw: number };
export type HeadingEvent = { heading: number };

export interface QiblaDirectionPlugin {
  start(): Promise<{ started: boolean }>;
  stop(): Promise<void>;
  addListener(eventName: 'direction', listenerFunc: (event: DirectionEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'accuracy', listenerFunc: (event: AccuracyEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'heading', listenerFunc: (event: HeadingEvent) => void): Promise<PluginListenerHandle>;
}

export const QiblaDirection = Capacitor.isNativePlatform()
  ? registerPlugin<QiblaDirectionPlugin>('QiblaDirection')
  : ({} as any as QiblaDirectionPlugin);
