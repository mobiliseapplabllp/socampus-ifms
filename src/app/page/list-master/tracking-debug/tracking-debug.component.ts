import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { LiveTrackerService } from 'src/app/provider/live-tracker/live-tracker.service';
import { environment } from 'src/environments/environment';

/**
 * Chhupa hua test screen - card ke title par 5 tap se khulta hai.
 * Maqsad: interval aur speed limit badalne ke liye naya build na banana pade.
 *
 * Oppo par ye khaas kaam ka hai - reinstall karne se auto-start jaisi OEM
 * settings reset ho jaati hain, aur phir test ka result bharosemand nahi rehta.
 */
@Component({
  selector: 'app-tracking-debug',
  templateUrl: './tracking-debug.component.html',
  styleUrls: ['./tracking-debug.component.scss'],
})
export class TrackingDebugComponent implements OnInit {

  gpsIntervalSec = 60;
  speedLimitKmh = 50;
  url = '';
  urlCustom = false;
  running = false;

  loading = true;
  busy = false;

  /** Ek tap me set ho jaane wale common test values */
  readonly intervalPresets = [10, 15, 30, 60];
  readonly limitPresets = [5, 20, 50];

  constructor(
    private modalCtrl: ModalController,
    private liveTracker: LiveTrackerService,
    private common: CommonService) {}

  async ngOnInit(): Promise<void> {
    const c = await this.liveTracker.getConfig();
    this.gpsIntervalSec = c.gpsIntervalSec;
    this.speedLimitKmh = c.speedLimitKmh;
    this.url = c.url || environment.liveLocationUrl;
    this.urlCustom = c.urlCustom;
    this.running = c.running;
    this.loading = false;
  }

  close(): void {
    void this.modalCtrl.dismiss();
  }

  setInterval(sec: number): void {
    this.gpsIntervalSec = sec;
  }

  setLimit(kmh: number): void {
    this.speedLimitKmh = kmh;
  }

  /** Default par wapas - aage har Start environment wala URL hi lagayega */
  async resetUrl(): Promise<void> {
    this.url = environment.liveLocationUrl;
    this.urlCustom = false;
    await this.liveTracker.setConfig({ resetUrl: true });
    this.common.presentToast('Upload URL reset to default', 'success');
  }

  async apply(): Promise<void> {
    if (this.busy) {
      return;
    }
    const interval = Number(this.gpsIntervalSec);
    const limit = Number(this.speedLimitKmh);

    if (!Number.isFinite(interval) || interval < 1) {
      this.common.presentToast('GPS interval must be at least 1 second', 'warning');
      return;
    }
    if (!Number.isFinite(limit) || limit <= 0) {
      this.common.presentToast('Speed limit must be greater than 0', 'warning');
      return;
    }

    this.busy = true;
    try {
      const typed = (this.url || '').trim();
      const isDefault = !typed || typed === environment.liveLocationUrl;

      const restarted = await this.liveTracker.setConfig({
        gpsIntervalSec: interval,
        speedLimitKmh: limit,
        // Default hi likha ho to override mat banao - environment badle to app
        // apne aap naya URL utha legi
        ...(isDefault ? { resetUrl: true } : { url: typed })
      });
      this.common.presentToast(
        restarted
          ? 'Settings applied. Tracking restarted with a fresh session.'
          : 'Settings saved. They apply when you start tracking.',
        'success'
      );
      void this.modalCtrl.dismiss({ applied: true });
    } catch (e: any) {
      console.error('setConfig', e);
      this.common.presentToast(e?.message || 'Could not apply settings', 'warning');
    } finally {
      this.busy = false;
    }
  }
}
