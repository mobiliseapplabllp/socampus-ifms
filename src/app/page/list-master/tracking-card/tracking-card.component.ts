import { Component, Input, OnDestroy, OnInit, SimpleChanges, OnChanges, NgZone } from '@angular/core';
import { App } from '@capacitor/app';
import { PluginListenerHandle } from '@capacitor/core';
import { ModalController } from '@ionic/angular';
import { TrackingMapComponent } from '../tracking-map/tracking-map.component';
import { TrackingDebugComponent } from '../tracking-debug/tracking-debug.component';
import { CommonService } from 'src/app/provider/common/common.service';
import {
  LiveTrackerService,
  LiveTrackerStatus,
  PermissionKey
} from 'src/app/provider/live-tracker/live-tracker.service';

interface PermissionRow {
  key: PermissionKey;
  label: string;
  granted: boolean;
}

@Component({
  selector: 'app-tracking-card',
  templateUrl: './tracking-card.component.html',
  styleUrls: ['./tracking-card.component.scss'],
})
export class TrackingCardComponent implements OnInit, OnChanges, OnDestroy {

  /** list-master page entry signal - wapas aate hi status refresh ho jaye */
  @Input() didEnter = false;

  supported = false;
  status: LiveTrackerStatus | null = null;
  permissions: PermissionRow[] = [];
  allGranted = false;
  busy = false;

  private resumeHandle: PluginListenerHandle | null = null;
  private ticker: any = null;

  /** Title par 5 tap = chhupa hua test screen. Normal user ko nazar nahi aata. */
  private titleTaps = 0;
  private titleTapTimer: any = null;

  constructor(
    private liveTracker: LiveTrackerService,
    private common: CommonService,
    private modalCtrl: ModalController,
    private zone: NgZone) {}

  ngOnInit(): void {
    this.supported = this.liveTracker.isSupported();
    if (!this.supported) {
      return;
    }

    void this.refresh();

    // Settings se wapas aane par page change nahi hota - resume par hi pata chalega
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        this.zone.run(() => void this.refresh());
      }
    }).then(handle => this.resumeHandle = handle);

    // Tracking chalu ho to "last update" live dikhta rahe
    this.ticker = setInterval(() => {
      if (this.status?.running) {
        this.zone.run(() => void this.refresh());
      }
    }, 30000);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['didEnter'] && changes['didEnter'].currentValue && this.supported) {
      void this.refresh();
    }
  }

  ngOnDestroy(): void {
    this.resumeHandle?.remove();
    if (this.ticker) {
      clearInterval(this.ticker);
    }
    if (this.titleTapTimer) {
      clearTimeout(this.titleTapTimer);
    }
  }

  /** 5 tap, 3 second ke andar - warna count reset */
  onTitleTap(): void {
    this.titleTaps++;
    if (this.titleTapTimer) {
      clearTimeout(this.titleTapTimer);
    }
    this.titleTapTimer = setTimeout(() => this.titleTaps = 0, 3000);

    if (this.titleTaps >= 5) {
      this.titleTaps = 0;
      void this.openDebug();
    }
  }

  private async openDebug(): Promise<void> {
    const modal = await this.modalCtrl.create({ component: TrackingDebugComponent });
    await modal.present();
    await modal.onDidDismiss();
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const status = await this.liveTracker.checkStatus();
    this.status = status;
    // Native hi sach hai - localStorage wala activeTrip usi se mila lo
    void this.liveTracker.syncActiveTrip();
    this.permissions = [
      { key: 'gps', label: 'Location Services (GPS)', granted: status.gps },
      { key: 'location', label: 'Location (Always Allow)', granted: status.location },
      { key: 'battery', label: 'Battery Optimization', granted: status.battery },
      { key: 'notifications', label: 'Notifications', granted: status.notifications },
      { key: 'activity', label: 'Physical Activity', granted: status.activityPermission },
    ];
    this.allGranted = this.permissions.every(p => p.granted);
  }

  /** Row tap - seedha usi setting par le jao, user ko dhoondhna na pade */
  async fix(row: PermissionRow): Promise<void> {
    if (row.granted) {
      return;
    }
    await this.liveTracker.openSetting(row.key);
  }

  /** "i" - permission status + is session ka poora path map par */
  async openDetails(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: TrackingMapComponent,
      componentProps: {
        status: this.status,
        permissions: this.permissions
      }
    });
    await modal.present();
    await modal.onDidDismiss();
    await this.refresh();
  }

  async toggleTracking(): Promise<void> {
    if (this.busy || !this.status) {
      return;
    }
    this.busy = true;
    try {
      if (this.status.running) {
        this.status = await this.liveTracker.stop();
        this.common.presentToast('Location tracking stopped', 'medium');
      } else {
        this.status = await this.liveTracker.start();
        this.common.presentToast('Location tracking started', 'success');
      }
      await this.refresh();
    } catch (e: any) {
      console.error('toggleTracking', e);
      this.common.presentToast(e?.message || 'Could not change tracking state', 'warning');
      await this.refresh();
    } finally {
      this.busy = false;
    }
  }

  // ------------------------------------------------------------- display

  get lastUpdateText(): string {
    const last = this.status?.lastFixAt || 0;
    if (!last) {
      return 'Waiting for first location...';
    }
    const mins = Math.floor((Date.now() - last) / 60000);
    if (mins <= 0) {
      return 'Last update just now';
    }
    if (mins === 1) {
      return 'Last update 1 min ago';
    }
    return `Last update ${mins} min ago`;
  }

  /** 10 min se koi fix nahi = kuch toot gaya hai, user ko dikhna chahiye */
  get isStale(): boolean {
    if (!this.status?.running) {
      return false;
    }
    const last = this.status.lastFixAt || this.status.startedAt || 0;
    return last > 0 && (Date.now() - last) > 10 * 60 * 1000;
  }

  formatTime(ts: number): string {
    if (!ts) {
      return '-';
    }
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  get distanceText(): string {
    const m = this.status?.distance || 0;
    return m < 1000 ? `${m.toFixed(0)} m` : `${(m / 1000).toFixed(2)} km`;
  }

  formatCoords(): string {
    if (!this.status?.lastFixAt) {
      return '-';
    }
    return `${this.status.lastLat.toFixed(6)}, ${this.status.lastLng.toFixed(6)}`;
  }
}
