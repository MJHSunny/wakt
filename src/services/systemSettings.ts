import { registerPlugin } from '@capacitor/core';

export interface SystemSettingsPlugin {
  openWifiSettings(): Promise<void>;
  openMobileDataSettings(): Promise<void>;
}

export const SystemSettings = registerPlugin<SystemSettingsPlugin>('SystemSettings');
