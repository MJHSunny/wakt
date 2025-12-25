import { Network } from '@capacitor/network';

interface HijriDate {
  day: number;
  month: number;
  year: number;
  monthName: string;
  daysInMonth: number;
}

interface CachedHijriData {
  currentDate: HijriDate;
  monthData: { [gregorianDate: string]: HijriDate };
  monthCalendar?: {
    [key: string]: Array<{ hijri: HijriDate; gregorian: { day: number; month: number; year: number; weekday: string } }>;
  };
  lastUpdated: number;
  lastRefreshDate?: string; // YYYY-MM-DD format for tracking date changes
}

const STORAGE_KEY = 'hijriCalendarCache';
const API_TIMEOUT = 10000; // 10 seconds
const FETCH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours - configurable refresh window
const STALE_DATA_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours - consider data stale after this

const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  'Sha\'ban',
  'Ramadan',
  'Shawwal',
  'Dhu al-Qi\'dah',
  'Dhu al-Hijjah'
];

export class HijriCalendarService {
  private lastFetchTime = 0;
  private fetchTimeout: any = null;
  private midnightTimeout: any = null;
  private isOnline = true;
  private autoRefreshEnabled = true;

  constructor() {
    this.initNetworkListener();
    this.loadCachedData();
    this.scheduleAutoRefresh();
    this.scheduleMidnightRefresh();
  }

  private async initNetworkListener() {
    try {
      // Check initial network status
      const status = await Network.getStatus();
      this.isOnline = status.connected;
      console.log('Initial network status:', this.isOnline ? 'online' : 'offline');

      // Listen for network changes
      Network.addListener('networkStatusChange', (status) => {
        const wasOnline = this.isOnline;
        this.isOnline = status.connected;
        console.log('Network status changed:', this.isOnline ? 'online' : 'offline');

        // Auto-refresh when coming back online if data is stale
        if (this.isOnline && !wasOnline && this.isDataStale()) {
          console.log('Internet reconnected and data is stale, auto-refreshing...');
          this.fetchHijriData();
        }
      });
    } catch (error) {
      console.log('Network listener not available, using fallback');
    }
  }

  private async loadCachedData() {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        this.lastFetchTime = data.lastUpdated;
        console.log('Loaded cached hijri data from', new Date(this.lastFetchTime).toLocaleString());
      }
    } catch (error) {
      console.error('Error loading cached hijri data:', error);
    }
  }

  private isDataStale(): boolean {
    const now = Date.now();
    const age = now - this.lastFetchTime;
    return age > STALE_DATA_THRESHOLD;
  }

  private shouldFetch(): boolean {
    const now = Date.now();
    const timeSinceLastFetch = now - this.lastFetchTime;
    return timeSinceLastFetch > FETCH_INTERVAL;
  }

  private scheduleAutoRefresh() {
    // Initial auto-refresh if data is missing or stale
    if (!this.lastFetchTime || this.isDataStale()) {
      if (this.isOnline) {
        console.log('Scheduling immediate refresh - no or stale cached data');
        this.fetchHijriData();
      }
    } else if (this.shouldFetch() && this.isOnline) {
      console.log('Scheduling refresh - fetch interval exceeded');
      this.fetchHijriData();
    }

    // Schedule periodic refresh check
    if (this.fetchTimeout) {
      clearTimeout(this.fetchTimeout);
    }

    this.fetchTimeout = setTimeout(() => {
      if (this.isOnline && this.shouldFetch()) {
        console.log('Auto-refreshing hijri calendar data...');
        this.fetchHijriData();
      }
      this.scheduleAutoRefresh(); // Reschedule
    }, FETCH_INTERVAL / 2); // Check every 3 hours (half the interval)
  }

  private scheduleMidnightRefresh() {
    // Clear any existing midnight timeout
    if (this.midnightTimeout) {
      clearTimeout(this.midnightTimeout);
    }

    // Calculate milliseconds until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    console.log(`Scheduled midnight refresh in ${Math.round(msUntilMidnight / 60000)} minutes`);

    this.midnightTimeout = setTimeout(() => {
      console.log('Midnight reached - refreshing hijri calendar data...');
      if (this.isOnline) {
        this.fetchHijriData();
      }
      this.scheduleMidnightRefresh(); // Reschedule for next day
    }, msUntilMidnight);
  }

  private getCurrentDateString(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  public hasDateChanged(): boolean {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (!cached) return false;

      const data: CachedHijriData = JSON.parse(cached);
      const lastRefreshDate = data.lastRefreshDate;
      const today = this.getCurrentDateString();

      if (!lastRefreshDate || lastRefreshDate !== today) {
        console.log(`Date changed: last refresh was ${lastRefreshDate}, today is ${today}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking date change:', error);
      return false;
    }
  }

  private async fetchFromAPI(gregorianDate: string): Promise<HijriDate | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(
        `https://api.aladhan.com/v1/gToH?g=${gregorianDate}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();

      if (data.code === 200 && data.data) {
        const hijri = data.data.hijri;
        return {
          day: hijri.day,
          month: hijri.month.number,
          year: hijri.year,
          monthName: HIJRI_MONTHS[hijri.month.number - 1],
          daysInMonth: hijri.month.length
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching from Aladhan API:', error);
      return null;
    }
  }

  private async fetchHijriMonthFromAPI(month: number, year: number) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    try {
      const response = await fetch(
        `https://api.aladhan.com/v1/hToGCalendar/${month}/${year}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      if (data.code !== 200 || !Array.isArray(data.data)) return null;

      return data.data.map((item: any) => {
        const h = item.hijri;
        const g = item.gregorian;
        return {
          hijri: {
            day: Number(h.day),
            month: Number(h.month.number),
            year: Number(h.year),
            monthName: HIJRI_MONTHS[h.month.number - 1],
            daysInMonth: h.month.length,
          },
          gregorian: {
            day: Number(g.day),
            month: Number(g.month.number),
            year: Number(g.year),
            weekday: g.weekday.en,
          },
        };
      });
    } catch (error) {
      console.error('Error fetching Hijri month:', error);
      return null;
    }
  }

  private async fetchHijriData() {
    if (!this.isOnline) {
      console.log('Offline - skipping hijri data fetch');
      return;
    }

    try {
      const today = new Date();
      const gregorianDateStr = `${today.getDate()}-${
        today.getMonth() + 1
      }-${today.getFullYear()}`;

      console.log('Fetching hijri data for:', gregorianDateStr);
      const currentDate = await this.fetchFromAPI(gregorianDateStr);

      if (!currentDate) {
        console.log('Failed to fetch current hijri date, retrying...');
        this.scheduleAutoRefresh();
        return;
      }

      const monthData: { [gregorianDate: string]: HijriDate } = {};
      const monthCalendarData = await this.fetchHijriMonthFromAPI(currentDate.month, currentDate.year);
      const monthKey = `${currentDate.year}-${currentDate.month}`;

      if (monthCalendarData) {
        monthCalendarData.forEach((entry) => {
          const g = entry.gregorian;
          const gKey = `${g.day}-${g.month}-${g.year}`;
          monthData[gKey] = entry.hijri;
        });
      }

      // Cache the data
      const cacheData: CachedHijriData = {
        currentDate,
        monthData,
        monthCalendar: monthCalendarData ? { [monthKey]: monthCalendarData } : {},
        lastUpdated: Date.now(),
        lastRefreshDate: this.getCurrentDateString()
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
      this.lastFetchTime = Date.now();

      console.log('✓ Hijri data successfully updated at', new Date(this.lastFetchTime).toLocaleString());

      // Notify listeners
      window.dispatchEvent(
        new CustomEvent('hijriDataUpdated', { detail: cacheData })
      );

      this.scheduleAutoRefresh();
    } catch (error) {
      console.error('Error fetching Hijri data:', error);
      this.scheduleAutoRefresh();
    }
  }

  public async getCurrentHijriDate(): Promise<HijriDate | null> {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const data: CachedHijriData = JSON.parse(cached);
        return data.currentDate;
      }

      // If no cache, try to fetch
      if (this.isOnline && this.shouldFetch()) {
        await this.fetchHijriData();
        const updated = localStorage.getItem(STORAGE_KEY);
        if (updated) {
          const data: CachedHijriData = JSON.parse(updated);
          return data.currentDate;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting current hijri date:', error);
      return null;
    }
  }

  public async getHijriDate(
    gregorianDate: Date
  ): Promise<HijriDate | null> {
    try {
      const dateStr = `${gregorianDate.getDate()}-${
        gregorianDate.getMonth() + 1
      }-${gregorianDate.getFullYear()}`;

      // Check cache first
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const data: CachedHijriData = JSON.parse(cached);
        if (data.monthData[dateStr]) {
          return data.monthData[dateStr];
        }
      }

      // Try to fetch from API
      if (this.isOnline) {
        const result = await this.fetchFromAPI(dateStr);
        if (result) {
          // Update cache
          if (cached) {
            const data: CachedHijriData = JSON.parse(cached);
            data.monthData[dateStr] = result;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          }
          return result;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting hijri date:', error);
      return null;
    }
  }

  // Fetch full Hijri month mapped to Gregorian dates
  public async getHijriMonth(month: number, year: number) {
    const monthKey = `${year}-${month}`;

    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const data: CachedHijriData = JSON.parse(cached);
        if (data.monthCalendar && data.monthCalendar[monthKey]) {
          return data.monthCalendar[monthKey];
        }
      }

      if (!this.isOnline) return null;

      const monthCalendarData = await this.fetchHijriMonthFromAPI(month, year);
      if (monthCalendarData) {
        // Update cache
        const cache: CachedHijriData = cached ? JSON.parse(cached) : {
          currentDate: { day: 1, month, year, monthName: HIJRI_MONTHS[month - 1], daysInMonth: monthCalendarData.length },
          monthData: {},
          monthCalendar: {},
          lastUpdated: Date.now(),
        };

        if (!cache.monthCalendar) cache.monthCalendar = {} as any;
        cache.monthCalendar[monthKey] = monthCalendarData;
        cache.lastUpdated = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
      }

      return monthCalendarData;
    } catch (error) {
      console.error('Error getting hijri month:', error);
      return null;
    }
  }

  // Batch fetch for better performance - fetches multiple dates concurrently
  public async getHijriDatesBatch(
    dates: Date[]
  ): Promise<{ [dateStr: string]: HijriDate | null }> {
    const results: { [dateStr: string]: HijriDate | null } = {};

    // Fetch in parallel (max 5 at a time to avoid overwhelming the API)
    const batchSize = 5;
    for (let i = 0; i < dates.length; i += batchSize) {
      const batch = dates.slice(i, i + batchSize);
      const batchPromises = batch.map(async (date) => {
        const dateStr = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
        const result = await this.getHijriDate(date);
        return { dateStr, result };
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ dateStr, result }) => {
        results[dateStr] = result;
      });

      // Small delay between batches
      if (i + batchSize < dates.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  public getLastUpdateTime(): number {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const data: CachedHijriData = JSON.parse(cached);
        return data.lastUpdated;
      }
    } catch (error) {
      console.error('Error getting last update time:', error);
    }
    return 0;
  }

  public getFormattedLastUpdate(): string {
    const lastUpdate = this.getLastUpdateTime();
    if (!lastUpdate) return 'Never updated';

    const diff = Date.now() - lastUpdate;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  public isNetworkOnline(): boolean {
    return this.isOnline;
  }

  public async manualFetch(): Promise<boolean> {
    if (!this.isOnline) return false;
    await this.fetchHijriData();
    return true;
  }

  // Get all Hijri month names
  public getMonthNames(): string[] {
    return HIJRI_MONTHS;
  }
}

// Singleton instance
let instance: HijriCalendarService | null = null;

export function getHijriCalendarService(): HijriCalendarService {
  if (!instance) {
    instance = new HijriCalendarService();
  }
  return instance;
}
