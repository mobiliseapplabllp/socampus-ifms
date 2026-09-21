import { AfterViewInit, Component, Input, OnDestroy } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import {
  LiveTrackerService,
  TripModule,
  TripPoint
} from 'src/app/provider/live-tracker/live-tracker.service';

declare var google: any;

/**
 * End trip card - start/end, calculated km, manual km, path.
 *
 * TESTING: backend abhi ready nahi hai, isliye Submit payload ko console me dikhata
 * hai aur trip band kar deta hai. trip_points ka data clear nahi hota - wo end API
 * ke success ke baad production me hoga (liveTracker.clearTrip).
 */
@Component({
  selector: 'app-trip-end',
  templateUrl: './trip-end.component.html',
  styleUrls: ['./trip-end.component.scss'],
})
export class TripEndComponent implements AfterViewInit, OnDestroy {

  @Input() module!: TripModule;
  @Input() specificId!: string;

  points: TripPoint[] = [];
  end: { lat: number; lng: number; accuracy: number; time: number } | null = null;
  calculatedKm = 0;
  manualKm: any = '';

  loading = true;
  busy = false;
  locationError = false;

  private map: any = null;
  private overlays: any[] = [];
  private infoWindow: any = null;

  constructor(
    private modalCtrl: ModalController,
    private liveTracker: LiveTrackerService,
    private common: CommonService) {}

  async ngAfterViewInit(): Promise<void> {
    const [points, current] = await Promise.all([
      this.liveTracker.getTripPoints(this.module, this.specificId).catch(() => [] as TripPoint[]),
      this.getCurrentLocation()
    ]);
    this.points = points;
    this.end = current;
    this.locationError = !current;
    this.calculatedKm = this.pathKm();
    this.loading = false;

    if (this.points.length || this.end) {
      // Modal ko layout milne do, warna map container ki height 0 hoti hai
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise(r => setTimeout(r, 80));
      this.renderMap();
    }
  }

  ngOnDestroy(): void {
    this.overlays.forEach(o => o.setMap(null));
    this.overlays = [];
    this.map = null;
  }

  close(): void {
    void this.modalCtrl.dismiss();
  }

  // ------------------------------------------------------------- location

  /** End point = abhi ki location. SQLite me nahi jaata - payload me alag field hai. */
  private async getCurrentLocation() {
    try {
      const res = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000 });
      return {
        lat: res.coords.latitude,
        lng: res.coords.longitude,
        accuracy: res.coords.accuracy || 0,
        time: Date.now()
      };
    } catch (e) {
      console.error('trip-end current location', e);
      return null;
    }
  }

  async retryLocation(): Promise<void> {
    this.end = await this.getCurrentLocation();
    this.locationError = !this.end;
    this.calculatedKm = this.pathKm();
    this.renderMap();
  }

  // ------------------------------------------------------------- distance

  /** Location filter ne jo maane - koodne wale aur kharab accuracy wale bahar */
  get acceptedPoints(): TripPoint[] {
    return this.points.filter(p => p.accepted !== false);
  }

  get rejectedCount(): number {
    return this.points.length - this.acceptedPoints.length;
  }

  /**
   * Native ne har fix par jo distance joda (dist) - wahi jodo. Wahi hisaab jisse home
   * ka distance banta hai, taaki trip km aur live km kabhi alag na ho.
   * Phir aakhri maane gaye point se abhi ki location tak - bas agar dono ki galti se
   * zyada door ho, warna wo GPS ka shor hai.
   */
  private pathKm(): number {
    let metres = this.points.reduce((sum, p) => sum + (p.accepted !== false ? (p.dist || 0) : 0), 0);

    const ok = this.acceptedPoints;
    const last = ok.length ? ok[ok.length - 1] : null;
    if (last && this.end) {
      const tail = this.haversineKm(last, this.end) * 1000;
      if (tail > (last.accuracy || 0) + (this.end.accuracy || 0)) {
        metres += tail;
      }
    }
    return metres / 1000;
  }

  private fullPath(): { lat: number; lng: number }[] {
    const path = this.acceptedPoints.map(p => ({ lat: p.lat, lng: p.lng }));
    if (this.end) {
      path.push({ lat: this.end.lat, lng: this.end.lng });
    }
    return path;
  }

  private haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  // ------------------------------------------------------------------ map

  private renderMap(): void {
    const el = document.getElementById('trip-end-map');
    if (!el || typeof google === 'undefined' || !google.maps) {
      return;
    }
    const path = this.fullPath();
    if (!path.length) {
      return;
    }

    if (!this.map) {
      this.map = new google.maps.Map(el, { center: path[0], zoom: 15 });
    }
    this.overlays.forEach(o => o.setMap(null));
    this.overlays = [];

    if (path.length >= 2) {
      this.overlays.push(new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#1a73e8',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map: this.map,
      }));
    }

    // Chhante hue points grey - line me nahi, par dikhe ki kahan location koodi
    this.points.forEach(p => {
      if (p.accepted !== false) {
        return;
      }
      this.overlays.push(this.dot({ lat: p.lat, lng: p.lng }, '#c5c6cc', 5,
        `${this.formatTime(p.time)} · ±${p.accuracy.toFixed(0)}m · rejected: ${p.reason}`,
        this.infoHtml('Rejected', p)));
    });

    // Beech ke maane gaye points - gap dikh jaata hai
    const ok = this.acceptedPoints;
    ok.forEach((p, i) => {
      if (i === 0) {
        return;
      }
      this.overlays.push(this.dot({ lat: p.lat, lng: p.lng }, '#1a73e8', 4,
        `${this.formatTime(p.time)} · ±${p.accuracy.toFixed(0)}m`,
        this.infoHtml('Point ' + (i + 1), p)));
    });

    if (ok.length) {
      const s = ok[0];
      this.overlays.push(this.dot({ lat: s.lat, lng: s.lng }, '#2dd36f', 9,
        'Start · ' + this.formatTime(s.time), this.infoHtml('Start', s)));
    }
    if (this.end) {
      this.overlays.push(this.dot({ lat: this.end.lat, lng: this.end.lng }, '#eb445a', 9, 'End · now'));
    }

    if (path.length === 1) {
      this.map.setCenter(path[0]);
      this.map.setZoom(16);
    } else {
      const bounds = new google.maps.LatLngBounds();
      path.forEach(p => bounds.extend(p));
      this.map.fitBounds(bounds, 48);
    }
    google.maps.event.addListenerOnce(this.map, 'idle', () => {
      google.maps.event.trigger(this.map, 'resize');
    });
  }

  /** Tap par detail - phone par marker ka title dikhta hi nahi */
  private infoHtml(heading: string, p: TripPoint): string {
    const rows: string[][] = [
      ['Time', this.formatTime(p.time)],
      ['Speed', `${p.speed.toFixed(1)} km/h`],
      ['Accuracy', `±${p.accuracy.toFixed(0)} m`],
    ];
    if (p.dist) {
      rows.push(['Distance', `${p.dist.toFixed(0)} m`]);
    }
    rows.push(['Filter', p.accepted === false ? `rejected: ${p.reason}` : (p.reason || 'ok')]);
    rows.push(['Location', `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`]);
    const body = rows
      .map(r => `<tr><td style="color:#6b6f76;padding-right:10px">${r[0]}</td><td>${r[1]}</td></tr>`)
      .join('');
    return `<div style="font-size:12px;line-height:1.5;min-width:170px">
      <div style="font-weight:600;margin-bottom:4px">${heading}</div>
      <table>${body}</table>
    </div>`;
  }

  private dot(p: { lat: number; lng: number }, color: string, scale: number, title: string,
              info?: string) {
    const marker = new google.maps.Marker({
      position: p,
      map: this.map,
      title,
      zIndex: scale > 5 ? 3 : 1,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: scale > 5 ? 2 : 1,
      },
    });
    if (info) {
      marker.addListener('click', () => {
        if (!this.infoWindow) {
          this.infoWindow = new google.maps.InfoWindow();
        }
        this.infoWindow.setContent(info);
        this.infoWindow.open(this.map, marker);
      });
    }
    return marker;
  }

  // --------------------------------------------------------------- submit

  async submit(): Promise<void> {
    if (this.busy) {
      return;
    }
    if (!this.end) {
      this.common.presentToast('Current location is required to end the trip', 'warning');
      return;
    }
    const manual = this.manualKm === '' || this.manualKm == null ? null : Number(this.manualKm);
    if (manual != null && (!Number.isFinite(manual) || manual < 0)) {
      this.common.presentToast('Please enter a valid manual km', 'warning');
      return;
    }

    this.busy = true;
    try {
      const payload = {
        lat: this.end.lat,
        lng: this.end.lng,
        google_kms: Number(this.calculatedKm.toFixed(2)),
        manual_km: manual,
        track_arr: this.points
      };
      // TESTING: API abhi ready nahi - payload yahin dekh lo
      console.log('END TRIP PAYLOAD', this.module, this.specificId, payload);

      await this.liveTracker.endTrip(this.module, this.specificId);
      this.common.presentToast('Trip ended', 'success');
      void this.modalCtrl.dismiss({ ended: true, payload });
    } catch (e: any) {
      console.error('endTrip', e);
      this.common.presentToast(e?.message || 'Could not end the trip', 'warning');
    } finally {
      this.busy = false;
    }
  }

  // -------------------------------------------------------------- display

  get start(): TripPoint | null {
    return this.points.length ? this.points[0] : null;   // trip start wala point hamesha pehla
  }

  formatTime(ts: number): string {
    if (!ts) {
      return '-';
    }
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  formatCoords(lat?: number, lng?: number): string {
    if (lat == null || lng == null) {
      return '-';
    }
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  get durationText(): string {
    if (!this.start || !this.end) {
      return '-';
    }
    const mins = Math.floor((this.end.time - this.start.time) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
}
