import { 
  LocalNotifications, 
  ScheduleOptions,
  PendingResult,
  PermissionStatus,
  LocalNotificationSchema,
  EnabledResult,
} from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { PrayerTimesData } from './prayerService';

export interface NotificationSettings {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  beforeMinutes: number;
}

const NOTIFICATION_IDS = {
  fajr: 1,
  dhuhr: 2,
  asr: 3,
  maghrib: 4,
  isha: 5,
};

// Check if running on native platform
const isNative = () => Capacitor.isNativePlatform();

// Request notification permissions
export async function requestNotificationPermission(): Promise<PermissionStatus> {
  try {
    const permission = await LocalNotifications.requestPermissions();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    throw error;
  }
}

// Check notification permissions
export async function checkNotificationPermission(): Promise<PermissionStatus> {
  try {
    const permission = await LocalNotifications.checkPermissions();
    return permission;
  } catch (error) {
    console.error('Error checking notification permission:', error);
    throw error;
  }
}

// Check if notifications are effectively enabled at OS-level for the app
export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const res: EnabledResult = await LocalNotifications.areEnabled();
    return !!res.value;
  } catch (error) {
    console.error('Error checking if notifications are enabled:', error);
    // Be conservative: if we cannot determine, assume disabled
    return false;
  }
}

// Initialize notifications
export async function initNotifications(): Promise<void> {
  try {
    // Just register action types, don't request permissions
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'PRAYER_TIME',
          actions: [
            {
              id: 'view',
              title: 'View',
            },
            {
              id: 'dismiss',
              title: 'Dismiss',
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error('Error initializing notifications:', error);
    throw error;
  }
}

// Schedule prayer notifications
export async function schedulePrayerNotifications(
  prayerTimes: PrayerTimesData,
  settings: NotificationSettings
): Promise<void> {
  try {
    // On native (Android/iOS), we already rely on the
    // AdhanNotificationPlugin + AlarmManager path for exact
    // prayer-time notifications. Skip Capacitor
    // LocalNotifications entirely there to avoid duplication
    // and keep one single notification system.
    if (isNative()) {
      return;
    }

    // Cancel existing notifications first
    await cancelAllPrayerNotifications();

    const notifications: LocalNotificationSchema[] = [];
    const now = new Date();

    // Helper function to create notification
    const createNotification = (
      id: number,
      title: string,
      time: Date,
      beforeMinutes: number = 0
    ): LocalNotificationSchema | null => {
      const notificationTime = new Date(time.getTime() - beforeMinutes * 60 * 1000);
      
      // Only schedule if the time is in the future
      if (notificationTime > now) {
        return {
          id,
          title: beforeMinutes > 0 ? `${title} in ${beforeMinutes} minutes` : `Time for ${title}`,
          body: beforeMinutes > 0 
            ? `${title} prayer will start in ${beforeMinutes} minutes`
            : "It's time for prayer",
          schedule: { at: notificationTime },
          sound: 'default',
          actionTypeId: 'PRAYER_TIME',
          extra: {
            prayer: title.toLowerCase(),
          },
        };
      }
      return null;
    };

    // Schedule each prayer based on settings
    if (settings.fajr) {
      const notification = createNotification(
        NOTIFICATION_IDS.fajr,
        'Fajr',
        prayerTimes.fajr,
        settings.beforeMinutes
      );
      if (notification) notifications.push(notification);
    }

    if (settings.dhuhr) {
      const notification = createNotification(
        NOTIFICATION_IDS.dhuhr,
        'Dhuhr',
        prayerTimes.dhuhr,
        settings.beforeMinutes
      );
      if (notification) notifications.push(notification);
    }

    if (settings.asr) {
      const notification = createNotification(
        NOTIFICATION_IDS.asr,
        'Asr',
        prayerTimes.asr,
        settings.beforeMinutes
      );
      if (notification) notifications.push(notification);
    }

    if (settings.maghrib) {
      const notification = createNotification(
        NOTIFICATION_IDS.maghrib,
        'Maghrib',
        prayerTimes.maghrib,
        settings.beforeMinutes
      );
      if (notification) notifications.push(notification);
    }

    if (settings.isha) {
      const notification = createNotification(
        NOTIFICATION_IDS.isha,
        'Isha',
        prayerTimes.isha,
        settings.beforeMinutes
      );
      if (notification) notifications.push(notification);
    }

    // Schedule all notifications
    if (notifications.length > 0) {
      await LocalNotifications.schedule({
        notifications,
      });
      console.log(`Scheduled ${notifications.length} prayer notifications`);
    }
  } catch (error) {
    console.error('Error scheduling prayer notifications:', error);
    throw error;
  }
}

// Cancel all prayer notifications
export async function cancelAllPrayerNotifications(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    const prayerNotificationIds = Object.values(NOTIFICATION_IDS);
    
    const idsToCancel = pending.notifications
      .filter(n => prayerNotificationIds.includes(n.id))
      .map(n => ({ id: n.id }));

    if (idsToCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: idsToCancel });
      console.log(`Cancelled ${idsToCancel.length} notifications`);
    }
  } catch (error) {
    console.error('Error cancelling notifications:', error);
    throw error;
  }
}

// Get pending notifications
export async function getPendingNotifications(): Promise<PendingResult> {
  try {
    return await LocalNotifications.getPending();
  } catch (error) {
    console.error('Error getting pending notifications:', error);
    throw error;
  }
}

// Save notification settings
export function saveNotificationSettings(settings: NotificationSettings): void {
  localStorage.setItem('notificationSettings', JSON.stringify(settings));
}

// Get notification settings
export function getNotificationSettings(): NotificationSettings {
  const saved = localStorage.getItem('notificationSettings');
  return saved ? JSON.parse(saved) : {
    fajr: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
    beforeMinutes: 0,
  };
}

// Schedule a test notification (for testing purposes)
export async function scheduleTestNotification(): Promise<void> {
  try {
    const testTime = new Date();
    testTime.setSeconds(testTime.getSeconds() + 5); // 5 seconds from now

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 999,
          title: 'Test Notification',
          body: 'This is a test notification from Wakt',
          schedule: { at: testTime },
          sound: 'default',
        },
      ],
    });
    console.log('Test notification scheduled for 5 seconds from now');
  } catch (error) {
    console.error('Error scheduling test notification:', error);
    throw error;
  }
}
