import { Injectable } from '@angular/core';
import { registerPlugin } from '@capacitor/core';
import { Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';

export interface LiveTrackerStatus {
  /** Device ka GPS master toggle */
  gps: boolean;
  /** Location permission = FINE + BACKGROUND ("Allow all the time") */
  location: boolean;
  battery: boolean;
  notifications: boolean;
  /** FINE mila ya nahi - JS ko nahi chahiye, native khud decide karta hai kya kholna hai */
  fineGranted: boolean;
  running: boolean;
  points: number;
  startedAt: number;
  lastFixAt: number;
  lastLat: number;
  lastLng: number;
  lastUpload: string;
  /** Session ka total distance, metres me */
  distance: number;
  /** Derived speed (position se), m/s */
  lastSpeed: number;
  /** GPS ki apni Doppler speed, m/s - comparison ke liye */
  lastGpsSpeed: number;
  /** Overspeed threshold - native se aata hai taaki dono jagah ek hi number rahe */
  speedLimitKmh: number;
  /** GPS har kitne second par - debug screen se badalta hai */
  gpsIntervalSec: number;
}

export interface LiveTrackerConfig {
  gpsIntervalSec: number;
  speedLimitKmh: number;
  url: string;
  /** true = URL debug screen se badla gaya hai, environment wala nahi */
  urlCustom: boolean;
  running: boolean;
}

export interface LivePoint {
  lat: number;
  lng: number;
  /** km/h */
  speed: number;
  accuracy: number;
  time: number;
  upload: string;
  /** true = is fix par alarm baja tha (threshold cross hone par, har 50+ fix par nahi) */
  alarmed: boolean;
}

export type PermissionKey = 'gps' | 'location' | 'battery' | 'notifications';

interface LiveTrackerPluginApi {
  checkStatus(): Promise<LiveTrackerStatus>;
  openGpsSettings(): Promise<{ opened: boolean }>;
  openLocationPermission(): Promise<{ opened: boolean }>;
  openBatterySettings(): Promise<{ opened: boolean }>;
  openNotificationSettings(): Promise<{ opened: boolean }>;
  start(options: { url: string; token: string }): Promise<LiveTrackerStatus>;
  stop(): Promise<LiveTrackerStatus>;
  getSessionPoints(): Promise<{ points: LivePoint[] }>;
  getConfig(): Promise<LiveTrackerConfig>;
  setConfig(options: Partial<LiveTrackerConfig> & { resetUrl?: boolean }):
    Promise<LiveTrackerStatus & { restarted: boolean }>;
}

const LiveTracker = registerPlugin<LiveTrackerPluginApi>('LiveTracker');

const EMPTY_STATUS: LiveTrackerStatus = {
  gps: false,
  location: false,
  battery: false,
  notifications: false,
  fineGranted: false,
  running: false,
  points: 0,
  startedAt: 0,
  lastFixAt: 0,
  lastLat: 0,
  lastLng: 0,
  lastUpload: '-',
  distance: 0,
  lastSpeed: 0,
  lastGpsSpeed: 0,
  speedLimitKmh: 50,
  gpsIntervalSec: 60
};

@Injectable({ providedIn: 'root' })
export class LiveTrackerService {

  constructor(private platform: Platform) {}

  /** Android native par hi chalta hai - browser aur iOS par card chhupa rehta hai */
  isSupported(): boolean {
    return this.platform.is('capacitor') && this.platform.is('android');
  }

  async checkStatus(): Promise<LiveTrackerStatus> {
    if (!this.isSupported()) {
      return { ...EMPTY_STATUS };
    }
    try {
      return await LiveTracker.checkStatus();
    } catch (e) {
      console.error('LiveTracker.checkStatus', e);
      return { ...EMPTY_STATUS };
    }
  }

  /** Us permission ki settings screen / dialog kholta hai. Button kabhi dead nahi hota. */
  async openSetting(key: PermissionKey): Promise<void> {
    if (!this.isSupported()) {
      return;
    }
    try {
      switch (key) {
        case 'gps':
          await LiveTracker.openGpsSettings();
          break;
        case 'location':
          await LiveTracker.openLocationPermission();
          break;
        case 'battery':
          await LiveTracker.openBatterySettings();
          break;
        case 'notifications':
          await LiveTracker.openNotificationSettings();
          break;
      }
    } catch (e) {
      console.error('LiveTracker.openSetting', key, e);
    }
  }

  /** Is session ke saare points - map par path draw karne ke liye */
  async getSessionPoints(): Promise<LivePoint[]> {
    if (!this.isSupported()) {
      return [];
    }
    try {
      const { points } = await LiveTracker.getSessionPoints();
      return points || [];
    } catch (e) {
      console.error('LiveTracker.getSessionPoints', e);
      return [];
    }
  }

  /** Debug screen - abhi ka test config */
  async getConfig(): Promise<LiveTrackerConfig> {
    if (!this.isSupported()) {
      return {
        gpsIntervalSec: 60,
        speedLimitKmh: 50,
        url: environment.liveLocationUrl,
        urlCustom: false,
        running: false
      };
    }
    return LiveTracker.getConfig();
  }

  /** Tracking chal rahi ho to service dobara start hogi aur session reset ho jayega */
  async setConfig(config: Partial<LiveTrackerConfig> & { resetUrl?: boolean }): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }
    const res = await LiveTracker.setConfig(config);
    return !!res.restarted;
  }

  async start(): Promise<LiveTrackerStatus> {
    if (!this.isSupported()) {
      return { ...EMPTY_STATUS };
    }
    // Proxy wala environment.url nahi - native HTTP seedha jaata hai
    return LiveTracker.start({
      url: environment.liveLocationUrl,
      token: localStorage.getItem('token1') || ''
    });
  }

  async stop(): Promise<LiveTrackerStatus> {
    if (!this.isSupported()) {
      return { ...EMPTY_STATUS };
    }
    return LiveTracker.stop();
  }
}
