import { AfterViewInit, Component, Input, NgZone, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import {
  LivePoint,
  LiveTrackerService,
  LiveTrackerStatus
} from 'src/app/provider/live-tracker/live-tracker.service';

declare var google: any;

interface PermissionRow {
  label: string;
  granted: boolean;
}

@Component({
  selector: 'app-tracking-map',
  templateUrl: './tracking-map.component.html',
  styleUrls: ['./tracking-map.component.scss'],
})
export class TrackingMapComponent implements AfterViewInit, OnDestroy {

  @Input() status!: LiveTrackerStatus;
  @Input() permissions: PermissionRow[] = [];

  points: LivePoint[] = [];
  loading = true;
  /** Tracking chal rahi ho to page khud refresh hota rehta hai */
  live = false;

  private map: any = null;
  private polyline: any = null;
  private markers: any[] = [];
  private ticker: any = null;

  constructor(
    private modalCtrl: ModalController,
    private liveTracker: LiveTrackerService,
    private common: CommonService,
    private zone: NgZone) {}

  async ngAfterViewInit(): Promise<void> {
    await this.load();
    this.loading = false;

    if (this.points.length) {
      // Modal ko layout milne do, warna map container ki height 0 hoti hai
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise(r => setTimeout(r, 80));
      this.renderMap();
    }

    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.clearOverlays();
    this.map = null;
  }

  close(): void {
    void this.modalCtrl.dismiss();
  }

  // -------------------------------------------------------------- refresh

  private startAutoRefresh(): void {
    if (!this.status?.running) {
      return;
    }
    this.live = true;
    this.ticker = setInterval(() => {
      this.zone.run(() => void this.tick());
    }, 5000);
  }

  private stopAutoRefresh(): void {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
    this.live = false;
  }

  private async tick(): Promise<void> {
    const before = this.points.length;
    await this.load();

    if (!this.status?.running) {
      this.stopAutoRefresh();
    }
    if (this.points.length === before) {
      return;   // kuch naya nahi aaya - map ko chhedne ki zaroorat nahi
    }

    if (!this.map && this.points.length) {
      this.renderMap();          // pehla point ab jaake aaya hai
    } else {
      this.updateOverlays();     // viewport waisa hi - user ka zoom/pan na ude
    }
  }

  private async load(): Promise<void> {
    const [status, points] = await Promise.all([
      this.liveTracker.checkStatus(),
      this.liveTracker.getSessionPoints()
    ]);
    this.status = status;
    this.points = points;
    this.permissions = [
      { label: 'Location Services (GPS)', granted: status.gps },
      { label: 'Location (Always Allow)', granted: status.location },
      { label: 'Battery Optimization', granted: status.battery },
      { label: 'Notifications', granted: status.notifications },
    ];
  }

  // ------------------------------------------------------------------ map

  private clearOverlays(): void {
    if (this.polyline) {
      this.polyline.setMap(null);
      this.polyline = null;
    }
    for (const m of this.markers) {
      m.setMap(null);
    }
    this.markers = [];
  }

  private get path(): { lat: number; lng: number }[] {
    return this.points.map(p => ({ lat: p.lat, lng: p.lng }));
  }

  private renderMap(): void {
    const el = document.getElementById('live-track-map');
    if (!el || typeof google === 'undefined' || !google.maps) {
      this.common.presentToast('Map is not available', 'warning');
      return;
    }

    const path = this.path;
    this.map = new google.maps.Map(el, { center: path[0], zoom: 15 });
    this.updateOverlays();
    this.fitToPath();   // sirf pehli baar - baad me user ka zoom bana rehta hai

    google.maps.event.addListenerOnce(this.map, 'idle', () => {
      google.maps.event.trigger(this.map, 'resize');
    });
  }

  /** Sirf line aur dots dobara banate hain - map ka viewport chhua nahi jaata */
  private updateOverlays(): void {
    if (!this.map) {
      return;
    }
    this.clearOverlays();
    const path = this.path;
    if (!path.length) {
      return;
    }

    if (path.length >= 2) {
      this.polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#1a73e8',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map: this.map,
      });
    }

    // Beech ke points chhote dots - isse dikh jaata hai ki kaunse minute ka
    // fix aaya aur kahan gap pada. Overspeed wale amber, taaki start/end ke
    // green/red se na takrayein
    path.forEach((p, i) => {
      if (i === 0 || i === path.length - 1) {
        return;
      }
      const over = this.isOver(this.points[i]);
      this.markers.push(new google.maps.Marker({
        position: p,
        map: this.map,
        title: this.pointTitle(i),
        zIndex: over ? 2 : 1,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: over ? 6 : 4,
          fillColor: over ? '#ffc409' : '#1a73e8',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1,
        },
      }));
    });

    this.addEndMarker(path[0], '#2dd36f', 'Start · ' + this.pointTitle(0));
    if (path.length > 1) {
      const lastIdx = path.length - 1;
      const label = this.status?.running ? 'Latest' : 'End';
      this.addEndMarker(path[lastIdx], '#eb445a', label + ' · ' + this.pointTitle(lastIdx));
    }
  }

  private addEndMarker(p: { lat: number; lng: number }, color: string, title: string): void {
    this.markers.push(new google.maps.Marker({
      position: p,
      map: this.map,
      title,
      zIndex: 3,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    }));
  }

  /** Poore path par wapas zoom - user ne pan kar liya ho to kaam aata hai */
  fitToPath(): void {
    if (!this.map || !this.points.length) {
      return;
    }
    const path = this.path;
    if (path.length === 1) {
      this.map.setCenter(path[0]);
      this.map.setZoom(16);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    path.forEach(p => bounds.extend(p));
    this.map.fitBounds(bounds, 48);
  }

  private pointTitle(i: number): string {
    const p = this.points[i];
    if (!p) {
      return '';
    }
    return `${this.formatTime(p.time)} · ${p.speed.toFixed(1)} km/h · ±${p.accuracy.toFixed(0)}m · ${p.upload}`;
  }

  // ------------------------------------------------------------ overspeed

  isOver(p: LivePoint | undefined): boolean {
    if (!p) {
      return false;
    }
    return p.speed >= (this.status?.speedLimitKmh || 50);
  }

  /** Har wo fix jahan speed limit se upar thi - testing ke liye poori list */
  get overspeedPoints(): LivePoint[] {
    return (this.points || []).filter(p => this.isOver(p));
  }

  /** Jitni baar alarm asli me baja (lagataar limit se upar chalne par ek hi baar) */
  get alarmCount(): number {
    return (this.points || []).filter(p => p.alarmed).length;
  }

  get topSpeed(): number {
    return (this.points || []).reduce((max, p) => Math.max(max, p.speed || 0), 0);
  }

  // -------------------------------------------------------------- display

  formatTime(ts: number): string {
    if (!ts) {
      return '-';
    }
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  get distanceText(): string {
    const m = this.status?.distance || 0;
    return m < 1000 ? `${m.toFixed(0)} m` : `${(m / 1000).toFixed(2)} km`;
  }

  get durationText(): string {
    const started = this.status?.startedAt || 0;
    if (!started) {
      return '-';
    }
    const mins = Math.floor((Date.now() - started) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  /** Aakhri fix kitni der pehle - live page par yahi sabse pehle dekha jaata hai */
  get lastFixText(): string {
    const last = this.status?.lastFixAt || 0;
    if (!last) {
      return '-';
    }
    const secs = Math.floor((Date.now() - last) / 1000);
    if (secs < 60) {
      return `${secs}s ago`;
    }
    return `${Math.floor(secs / 60)} min ago`;
  }

  /** Aakhri fix expected interval se kaafi purana = kuch atka hua hai */
  get isStale(): boolean {
    if (!this.status?.running || !this.status?.lastFixAt) {
      return false;
    }
    return (Date.now() - this.status.lastFixAt) > this.intervalSec * 1000 * 3;
  }

  get intervalSec(): number {
    return this.status?.gpsIntervalSec || 60;
  }

  /**
   * Kitne fix aane chahiye the vs kitne aaye. Session ki asli sehat yahi batati hai -
   * points count akela kuch nahi kehta.
   *
   * Interval debug screen se badalta hai, isliye hisaab usi ke hisaab se -
   * 60 second maan lena galat hoga.
   */
  get expectedPoints(): number {
    const started = this.status?.startedAt || 0;
    if (!started) {
      return 0;
    }
    return Math.max(1, Math.round((Date.now() - started) / (this.intervalSec * 1000)));
  }

  get missedPoints(): number {
    return Math.max(0, this.expectedPoints - (this.points?.length || 0));
  }
}
