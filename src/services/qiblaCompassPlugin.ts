import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export type HeadingChangeEvent = { heading: number };
export type QiblaChangeEvent = { qibla: number };
export type TiltChangeEvent = { pitch: number; roll: number };

export interface QiblaCompassPlugin {
  startListening(): Promise<{ started: boolean }>;
  stopListening(): Promise<{ stopped: boolean }>;
  addListener(
    eventName: 'headingChange',
    listenerFunc: (event: HeadingChangeEvent) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'qiblaChange',
    listenerFunc: (event: QiblaChangeEvent) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'tiltChange',
    listenerFunc: (event: TiltChangeEvent) => void
  ): Promise<PluginListenerHandle>;
}

export const QiblaCompass = registerPlugin<QiblaCompassPlugin>('QiblaCompass');
