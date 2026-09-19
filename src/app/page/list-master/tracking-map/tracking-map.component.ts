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
  /** Testing: filter ka asar dekhne ke liye - saare fix, ya sirf maane gaye */
  mode: 'filtered' | 'all' = 'filtered';

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
      { label: 'Physical Activity', granted: status.activityPermission },
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

  /** Line inhi points se banti hai - Filtered me sirf maane gaye */
  private get linePoints(): LivePoint[] {
    return this.mode === 'all' ? this.points : this.points.filter(p => p.accepted !== false);
  }

  private get path(): { lat: number; lng: number }[] {
    return this.linePoints.map(p => ({ lat: p.lat, lng: p.lng }));
  }

  setMode(mode: 'filtered' | 'all'): void {
    if (this.mode === mode) {
      return;
    }
    this.mode = mode;
    this.updateOverlays();
  }

  private renderMap(): void {
    const el = document.getElementById('live-track-map');
    if (!el || typeof google === 'undefined' || !google.maps) {
      this.common.presentToast('Map is not available', 'warning');
      return;
    }

    const path = this.path.length ? this.path : this.points.map(p => ({ lat: p.lat, lng: p.lng }));
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
    const line = this.linePoints;
    const path = line.map(p => ({ lat: p.lat, lng: p.lng }));

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

    // Filtered: chhante hue points grey khokhle dot - line me nahi, par dikhte hain
    if (this.mode === 'filtered') {
      this.points.forEach(p => {
        if (p.accepted !== false) {
          return;
        }
        this.markers.push(new google.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map: this.map,
          title: this.pointTitleOf(p),
          zIndex: 0,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: '#ffffff',
            fillOpacity: 0.6,
            strokeColor: '#92949c',
            strokeWeight: 2,
          },
        }));
      });
    }

    // Beech ke points chhote dots. All = accuracy ka rang, Filtered = overspeed amber
    line.forEach((p, i) => {
      if (i === 0 || i === line.length - 1) {
        return;
      }
      const over = this.isOver(p);
      const color = this.mode === 'all' ? this.accuracyColor(p.accuracy) : (over ? '#ffc409' : '#1a73e8');
      this.markers.push(new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map: this.map,
        title: this.pointTitleOf(p),
        zIndex: over ? 2 : 1,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: this.mode === 'all' ? 5 : (over ? 6 : 4),
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1,
        },
      }));
    });

    if (line.length) {
      this.addEndMarker(path[0], '#2dd36f', 'Start · ' + this.pointTitleOf(line[0]));
    }
    if (line.length > 1) {
      const last = line[line.length - 1];
      const label = this.status?.running ? 'Latest' : 'End';
      this.addEndMarker(path[path.length - 1], '#eb445a', label + ' · ' + this.pointTitleOf(last));
    }
  }

  /** All mode - ek nazar me dikhe kaunsa fix kitna pakka tha */
  accuracyColor(acc: number): string {
    if (acc <= 20) {
      return '#2dd36f';       // pakka
    }
    if (acc <= 50) {
      return '#ffc409';       // theek
    }
    if (acc <= 150) {
      return '#ff8c00';       // anchor rule se jaancha jaata hai
    }
    return '#eb445a';         // kachra
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
    // Hamesha saare points par fit - Filtered me bhi chhante hue grey dot dikhne chahiye
    const all = this.points.map(p => ({ lat: p.lat, lng: p.lng }));
    if (all.length === 1) {
      this.map.setCenter(all[0]);
      this.map.setZoom(16);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    all.forEach(p => bounds.extend(p));
    this.map.fitBounds(bounds, 48);
  }

  private pointTitleOf(p: LivePoint): string {
    const parts = [
      this.formatTime(p.time),
      `${p.speed.toFixed(1)} km/h`,
      `±${p.accuracy.toFixed(0)}m`,
    ];
    if (p.interval) {
      parts.push(`next ${p.interval}s`);
    }
    parts.push(p.accepted === false ? `rejected: ${p.reason}` : (p.reason || 'ok'));
    parts.push(p.upload);
    return parts.join(' · ');
  }

  // --------------------------------------------------------------- filter

  get keptCount(): number {
    return this.points.filter(p => p.accepted !== false).length;
  }

  get rejectedCount(): number {
    return this.points.length - this.keptCount;
  }

  /** Bina filter ke - har fix jod ke. Filter ne kitna jhootha km bachaya, ye isi se dikhta hai */
  get rawDistanceText(): string {
    let m = 0;
    for (let i = 1; i < this.points.length; i++) {
      m += this.haversineM(this.points[i - 1], this.points[i]);
    }
    return m < 1000 ? `${m.toFixed(0)} m` : `${(m / 1000).toFixed(2)} km`;
  }

  private haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 6371000;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  /** Adaptive me "expected" ka matlab nahi - sabse lamba gap batata hai service kab soyi */
  get longestGapText(): string {
    if (this.points.length < 2) {
      return '-';
    }
    let gap = 0;
    let at = 0;
    for (let i = 1; i < this.points.length; i++) {
      const g = this.points[i].time - this.points[i - 1].time;
      if (g > gap) {
        gap = g;
        at = this.points[i - 1].time;
      }
    }
    const s = Math.round(gap / 1000);
    const txt = s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${txt} at ${this.formatTime(at)}`;
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
    if (this.status?.adaptive) {
      return this.status.currentIntervalSec || 15;
    }
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
