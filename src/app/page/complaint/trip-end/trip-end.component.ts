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

  /** Points ke beech ka sum + aakhri point se abhi ki location tak */
  private pathKm(): number {
    const path = this.fullPath();
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      total += this.haversineKm(path[i - 1], path[i]);
    }
    return total;
  }

  private fullPath(): { lat: number; lng: number }[] {
    const path = this.points.map(p => ({ lat: p.lat, lng: p.lng }));
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

    // Beech ke points - gap dikh jaata hai
    this.points.forEach((p, i) => {
      if (i === 0) {
        return;
      }
      this.overlays.push(this.dot({ lat: p.lat, lng: p.lng }, '#1a73e8', 4, this.formatTime(p.time)));
    });

    if (this.points.length) {
      const s = this.points[0];
      this.overlays.push(this.dot({ lat: s.lat, lng: s.lng }, '#2dd36f', 9, 'Start · ' + this.formatTime(s.time)));
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

  private dot(p: { lat: number; lng: number }, color: string, scale: number, title: string) {
    return new google.maps.Marker({
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
    return this.points.length ? this.points[0] : null;
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
