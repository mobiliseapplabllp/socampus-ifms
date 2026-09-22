import { AfterViewInit, Component, Input, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';
import {
  LiveTrackerService,
  TripModule,
  TripPoint
} from 'src/app/provider/live-tracker/live-tracker.service';

declare var google: any;

/**
 * End trip card - start/end, calculated km, manual km, path aur end ki do photo.
 *
 * Kram start wala hi: pehle server par end-trip, success ke BAAD phone ki trip band
 * aur uske points saaf. Ulta karte to server ko bina bataye path mit jaata.
 */
@Component({
  selector: 'app-trip-end',
  templateUrl: './trip-end.component.html',
  styleUrls: ['./trip-end.component.scss'],
})
export class TripEndComponent implements AfterViewInit, OnDestroy {

  @Input() module!: TripModule;
  @Input() specificId!: string;
  /** Server ki trip id - list API ke gps_mobile_trip.trip_id se aati hai */
  @Input() serverTripId = '';

  points: TripPoint[] = [];
  end: { lat: number; lng: number; accuracy: number; time: number } | null = null;
  calculatedKm = 0;
  manualKm: any = '';

  img1: any;          // end selfie ka naam
  img2: any;          // end vehicle photo
  private selfieBlob: Blob | null = null;
  private vehicleBlob: Blob | null = null;

  loading = true;
  busy = false;
  locationError = false;
  /** Submit fail hone ki wajah - screen par tiki rehti hai, toast ki tarah udti nahi */
  submitError = '';

  private map: any = null;
  private overlays: any[] = [];
  private infoWindow: any = null;

  constructor(
    private modalCtrl: ModalController,
    private liveTracker: LiveTrackerService,
    private httpComplaint: ComplaintService,
    private camera: CameraService,
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
    const pos = await this.common.currentPosition();
    return pos ? { ...pos, time: Date.now() } : null;
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

  presentActionSheet(which: number): void {
    this.camera.selectImage(['camera'], (blob: Blob) => {
      const name = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg';
      if (which === 1) {
        this.selfieBlob = blob;
        this.img1 = name;
      } else {
        this.vehicleBlob = blob;
        this.img2 = name;
      }
    });
  }

  /** Trip id sirf server se - app apni taraf se koi id nahi banati */
  private get tripId(): string {
    return this.serverTripId;
  }

  /**
   * Poora raasta - sirf filter ke maane gaye points (GPS ke koode hue nahi),
   * aakhir me abhi ki location. Har point wahi cheezein bhejta hai jo live ping
   * bhejti hai, taaki server par dono ek jaise dikhein.
   */
  private trekPath(): any[] {
    const path = this.acceptedPoints.map(p => this.pathPoint(
      p.lat, p.lng, p.speed, p.accuracy, p.time, p.battery));
    if (this.end) {
      // Aakhri point ab ki location - battery is waqt ki nahi pata, isliye nahi bhejte
      path.push(this.pathPoint(
        this.end.lat, this.end.lng, 0, this.end.accuracy, this.end.time, -1));
    }
    return path;
  }

  private pathPoint(lat: number, lng: number, speed: number, accuracy: number,
                    time: number, battery: number): any {
    const point: any = {
      lat,
      lng,
      speed: Math.round((speed || 0) * 10) / 10,
      recorded_at: this.istFrom(time),
      accuracy: Math.round((accuracy || 0) * 10) / 10
    };
    if (battery != null && battery >= 0) {
      point.battery = battery;
    }
    return point;
  }

  async submit(): Promise<void> {
    if (this.busy) {
      return;
    }
    this.submitError = '';
    if (!this.end) {
      this.common.presentToast('Current location is required to end the trip', 'warning');
      return;
    }
    if (!this.selfieBlob || !this.vehicleBlob) {
      this.common.presentToast('Selfie and vehicle photo are both required', 'warning');
      return;
    }
    const manual = this.manualKm === '' || this.manualKm == null ? null : Number(this.manualKm);
    if (manual != null && (!Number.isFinite(manual) || manual < 0)) {
      this.common.presentToast('Please enter a valid manual km', 'warning');
      return;
    }
    if (!this.tripId) {
      this.submitError = 'Trip id not found. Please reload the list and try again.';
      return;
    }

    const form = new FormData();
    form.append('tkt_id', String(this.specificId));
    form.append('module_type', '1');            // 1 = helpdesk
    form.append('trip_id', this.tripId);
    form.append('lat', String(this.end.lat));
    form.append('lng', String(this.end.lng));
    form.append('total_distance', this.calculatedKm.toFixed(2));
    if (manual != null) {
      form.append('adjusted_distance', String(manual));
    }
    form.append('trek_path', JSON.stringify(this.trekPath()));
    form.append('recorded_at', this.nowIst());
    form.append('selfie_img', this.selfieBlob, this.img1);
    form.append('vehicle_img', this.vehicleBlob, this.img2);

    this.busy = true;
    this.httpComplaint.endGpsTrip(form).subscribe({
      next: async (data: any) => {
        if (!data.status) {
          this.submitError = data.msg || 'Could not end the trip';
          this.busy = false;
          return;
        }
        try {
          // Server ke paas path pahunch gaya - ab phone ki trip band aur uske points saaf
          await this.liveTracker.endTrip(this.module, this.specificId);
          await this.liveTracker.clearTrip(this.module, this.specificId);
          this.liveTracker.clearLocalTrip();
          this.common.presentToast(data.msg || 'Trip ended', 'success');
          void this.modalCtrl.dismiss({ ended: true });
        } catch (e: any) {
          console.error('endTrip native', e);
          this.submitError = e?.message || 'Trip saved on server but tracking did not stop';
        } finally {
          this.busy = false;
        }
      },
      error: (err: any) => {
        console.error('endGpsTrip', err);
        this.submitError = err?.error?.msg || environment.errMsg;
        this.busy = false;
      }
    });
  }

  /** Server ka format - India ka time: 2026-09-21 16:20:00 */
  private nowIst(): string {
    return this.istFrom(Date.now());
  }

  private istFrom(ms: number): string {
    return new Date(ms).toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' });
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
