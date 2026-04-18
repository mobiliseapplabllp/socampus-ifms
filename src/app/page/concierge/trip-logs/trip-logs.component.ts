import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ConciergeService } from 'src/app/provider/concierge/concierge.service';
import { environment } from 'src/environments/environment';

declare var google: any;

@Component({
  selector: 'app-trip-logs',
  templateUrl: './trip-logs.component.html',
  styleUrls: ['./trip-logs.component.scss'],
})
export class TripLogsComponent implements OnInit {
  @Input() data!: any;
  ext_id: any;
  tripLogs: any[] = [];
  loading = false;
  isTrackMapOpen = false;
  /** Parsed lat/lng for the map modal */
  trackPoints: { lat: number; lng: number }[] = [];
  private trackGoogleMap: any = null;
  private trackPolyline: any = null;
  private trackMarkers: any[] = [];

  constructor(
    private modalCtrl: ModalController,
    private httpConcierge: ConciergeService,
    private common: CommonService
  ) {}

  ngOnInit() {
    this.getTripLogs();
  }

  getTripLogs() {
    if (this.data == null || this.data === '') {
      return;
    }
    this.loading = true;
    this.httpConcierge.getTripLogs(this.data).subscribe({
      next: (res: any) => {
        if (res.status) {
          this.tripLogs = Array.isArray(res.data) ? res.data : [];
        } else {
          this.common.presentToast(res.msg, 'danger');
          this.tripLogs = [];
        }
      },
      error: () => {
        this.common.presentToast(environment.errMsg, 'danger');
        this.tripLogs = [];
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  closeModal() {
    this.modalCtrl.dismiss();
  }

  trackByTripId(_index: number, trip: any): number {
    return trip?.trip_id ?? _index;
  }

  statusColor(trip: any): string {
    const label = (trip?.trip_status_label || '').toLowerCase();
    if (label.includes('complete')) {
      return 'success';
    }
    if (label.includes('progress') || label.includes('active')) {
      return 'warning';
    }
    return 'medium';
  }

  isGpsTrip(trip: any): boolean {
    return trip?.trip_type === 2 || String(trip?.trip_type_label || '').toUpperCase() === 'GPS';
  }

  parseTrekPath(raw: any): { lat: number; lng: number }[] {
    if (raw == null || raw === '') {
      return [];
    }
    let arr: any[];
    if (Array.isArray(raw)) {
      arr = raw;
    } else if (typeof raw === 'string') {
      try {
        arr = JSON.parse(raw);
      } catch {
        return [];
      }
    } else {
      return [];
    }
    if (!Array.isArray(arr)) {
      return [];
    }
    const out: { lat: number; lng: number }[] = [];
    for (const row of arr) {
      const lat = Number(row?.latitude ?? row?.lat);
      const lng = Number(row?.longitude ?? row?.lng ?? row?.long);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        out.push({ lat, lng });
      }
    }
    return out;
  }

  canViewTrack(trip: any): boolean {
    return this.isGpsTrip(trip) && this.parseTrekPath(trip?.end_logs?.trek_path).length > 0;
  }

  async openViewTrack(trip: any) {
    const pts = this.parseTrekPath(trip?.end_logs?.trek_path);
    if (pts.length === 0) {
      this.common.presentToast('No track points for this trip', 'warning');
      return;
    }
    this.trackPoints = pts;
    this.isTrackMapOpen = true;
    await new Promise((r) => setTimeout(r, 200));
    await this.waitForLayout();
    this.renderTrackMap();
  }

  private waitForLayout(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  closeTrackModal() {
    this.isTrackMapOpen = false;
  }

  /** Runs after modal close animation; clears map so next open re-inits cleanly. */
  onTrackMapDismissed() {
    this.clearTrackMapOverlays();
    this.trackGoogleMap = null;
    this.trackPoints = [];
    this.isTrackMapOpen = false;
  }

  private clearTrackMapOverlays() {
    if (this.trackPolyline) {
      this.trackPolyline.setMap(null);
      this.trackPolyline = null;
    }
    for (const m of this.trackMarkers) {
      m.setMap(null);
    }
    this.trackMarkers = [];
  }

  private renderTrackMap() {
    const el = document.getElementById('trip-logs-track-map');
    if (!el || typeof google === 'undefined' || !google.maps) {
      this.common.presentToast('Map is not available', 'warning');
      return;
    }

    this.clearTrackMapOverlays();

    const pts = this.trackPoints;
    const center = pts[0];

    this.trackGoogleMap = new google.maps.Map(el, {
      center,
      zoom: 13,
    });

    if (pts.length >= 2) {
      this.trackPolyline = new google.maps.Polyline({
        path: pts,
        geodesic: true,
        strokeColor: '#1a73e8',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map: this.trackGoogleMap,
      });
    }

    const addMarker = (p: { lat: number; lng: number }, color: string, title: string) => {
      const marker = new google.maps.Marker({
        position: p,
        map: this.trackGoogleMap,
        title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      this.trackMarkers.push(marker);
    };

    addMarker(pts[0], '#2dd36f', 'Start');
    if (pts.length > 1) {
      addMarker(pts[pts.length - 1], '#eb445a', 'End');
    }

    if (pts.length === 1) {
      this.trackGoogleMap.setCenter(pts[0]);
      this.trackGoogleMap.setZoom(14);
    } else {
      const bounds = new google.maps.LatLngBounds();
      pts.forEach((p) => bounds.extend(p));
      this.trackGoogleMap.fitBounds(bounds, 48);
    }

    google.maps.event.addListenerOnce(this.trackGoogleMap, 'idle', () => {
      google.maps.event.trigger(this.trackGoogleMap, 'resize');
    });
  }

  viewTollImage(img: { path: string; blob_type?: string }) {
    if (!img?.path) {
      return;
    }
    this.common.openImg(img.path, img.blob_type || 'PRIVATE');
  }

  disp(v: any): string {
    if (v === null || v === undefined || v === '') {
      return '—';
    }
    return String(v);
  }
}
