import { registerPlugin } from '@capacitor/core';

interface AdhanNotificationPlugin {
  triggerAdhanImmediately(options: { prayerName: string }): Promise<void>;
  schedulePrayerAlarm(options: {
    prayerName: string;
    prayerTime: string;
    requestCode: number;
  }): Promise<void>;
  cancelPrayerAlarm(options: {
    prayerName: string;
    requestCode: number;
  }): Promise<void>;
  canScheduleExactAlarms(): Promise<{ canSchedule: boolean }>;
  previewAdhan(options: { soundName: string }): Promise<void>;
  stopPreview(): Promise<void>;
  updateNotificationSound(): Promise<void>;
  isBatteryOptimizationDisabled(): Promise<{ isDisabled: boolean }>;
  requestDisableBatteryOptimization(): Promise<void>;
}

const AdhanNotification = registerPlugin<AdhanNotificationPlugin>(
  'AdhanNotificationPlugin'
);

export const adhanNotificationService = {
  /**
   * Trigger Adhan notification immediately (for testing)
   */
  async triggerAdhanNow(prayerName: string): Promise<void> {
    try {
      console.log(`Triggering Adhan for ${prayerName}`);
      await AdhanNotification.triggerAdhanImmediately({ prayerName });
      console.log('Adhan triggered successfully');
    } catch (error) {
      console.error('Failed to trigger Adhan:', error);
      throw error;
    }
  },

  /**
   * Schedule a prayer alarm
   */
  async schedulePrayerAlarm(
    prayerName: string,
    prayerTime: string,
    requestCode: number
  ): Promise<void> {
    try {
      await AdhanNotification.schedulePrayerAlarm({
        prayerName,
        prayerTime,
        requestCode,
      });
      console.log(`Scheduled ${prayerName} alarm at ${prayerTime}`);
    } catch (error) {
      console.error(`Failed to schedule ${prayerName} alarm:`, error);
      throw error;
    }
  },

  /**
   * Cancel a prayer alarm
   */
  async cancelPrayerAlarm(prayerName: string, requestCode: number): Promise<void> {
    try {
      await AdhanNotification.cancelPrayerAlarm({
        prayerName,
        requestCode,
      });
      console.log(`Cancelled ${prayerName} alarm`);
    } catch (error) {
      console.error(`Failed to cancel ${prayerName} alarm:`, error);
      throw error;
    }
  },

  /**
   * Check if device can schedule exact alarms
   */
  async canScheduleExactAlarms(): Promise<boolean> {
    try {
      const result = await AdhanNotification.canScheduleExactAlarms();
      return result.canSchedule;
    } catch (error) {
      console.error('Failed to check exact alarm capability:', error);
      return false;
    }
  },

  /**
   * Preview an Adhan sound
   */
  async previewAdhan(soundName: string): Promise<void> {
    try {
      console.log(`Previewing sound: ${soundName}`);
      await AdhanNotification.previewAdhan({ soundName });
    } catch (error) {
      console.error('Failed to preview sound:', error);
      throw error;
    }
  },

  /**
   * Stop preview playback
   */
  async stopPreview(): Promise<void> {
    try {
      await AdhanNotification.stopPreview();
    } catch (error) {
      console.error('Failed to stop preview:', error);
      throw error;
    }
  },
  
  /**
   * Update notification channel sound
   */
  async updateNotificationSound(): Promise<void> {
    try {
      await AdhanNotification.updateNotificationSound();
      console.log('Notification sound updated');
    } catch (error) {
      console.error('Failed to update notification sound:', error);
      throw error;
    }
  },
  
  /**
   * Check if battery optimization is disabled
   */
  async isBatteryOptimizationDisabled(): Promise<boolean> {
    try {
      const result = await AdhanNotification.isBatteryOptimizationDisabled();
      return result.isDisabled;
    } catch (error) {
      console.error('Failed to check battery optimization:', error);
      return false;
    }
  },
  
  /**
   * Request to disable battery optimization
   */
  async requestDisableBatteryOptimization(): Promise<void> {
    try {
      await AdhanNotification.requestDisableBatteryOptimization();
    } catch (error) {
      console.error('Failed to request battery optimization exemption:', error);
      throw error;
    }
  },
};
