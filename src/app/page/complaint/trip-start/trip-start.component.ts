import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { LiveTrackerService, TripModule } from 'src/app/provider/live-tracker/live-tracker.service';
import { environment } from 'src/environments/environment';

/**
 * GPS trip shuru karne ka form - travel mode, remark, selfie aur vehicle photo.
 *
 * Kram maayne rakhta hai: pehle server par start-trip, uske success ke BAAD phone ki
 * tracking. Ulta karte to server ko bina bataye trip chal padti aur End Trip atak jaati.
 * Isi wajah se network na ho to trip chalu hi nahi hoti.
 */
@Component({
  selector: 'app-trip-start',
  templateUrl: './trip-start.component.html',
  styleUrls: ['./trip-start.component.scss'],
})
export class TripStartComponent implements OnInit {

  @Input() module: TripModule = 'complaint';
  @Input() tktId!: string;

  travelMode: any = [];
  travelNote = '';
  canDoTravel = 0;

  travelType!: string;
  remark = '';
  img1: any;          // selfie ka naam - button hara isi se hota hai
  img2: any;          // vehicle photo
  private selfieBlob: Blob | null = null;
  private vehicleBlob: Blob | null = null;

  start: { lat: number; lng: number; accuracy: number } | null = null;

  loading = true;
  busy = false;
  /** Server ne mana kiya (jaise "You are not authorize...") - screen par dikhega, toast me nahi */
  loadError = '';
  /** Submit fail hone ki wajah - button ke neeche tiki rehti hai */
  submitError = '';

  constructor(
    private modalCtrl: ModalController,
    private httpComplaint: ComplaintService,
    private liveTracker: LiveTrackerService,
    private camera: CameraService,
    private common: CommonService) {}

  async ngOnInit(): Promise<void> {
    // Location aur list dono ek saath - engineer ko do baar intezaar na karna pade
    const [, location] = await Promise.all([
      this.loadTravelType(),
      this.common.currentPosition()
    ]);
    this.start = location;
    this.loading = false;
  }

  close(): void {
    void this.modalCtrl.dismiss();
  }

  // ------------------------------------------------------------ travel mode

  private loadTravelType(): Promise<void> {
    return new Promise(resolve => {
      this.httpComplaint.getTravelType(this.tktId, 'gps_mobile').subscribe({
        next: (data: any) => {
          if (data.status) {
            this.travelNote = data.data?.travelInfo?.remarkNote || '';
            this.travelMode = data.data?.travelType || [];
            this.canDoTravel = data.data?.travelInfo?.canDoTravel;
          } else {
            this.loadError = data.msg || 'Travel details are not available for this ticket';
          }
          resolve();
        },
        error: (err: any) => {
          console.error('getTravelType', err);
          this.loadError = err?.error?.msg || environment.errMsg;
          resolve();
        }
      });
    });
  }

  // ------------------------------------------------------------- location

  async retryLocation(): Promise<void> {
    this.start = await this.common.currentPosition();
    if (!this.start) {
      this.common.presentToast('Location not available. Please try again.', 'warning');
    }
  }

  // ---------------------------------------------------------------- photos

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

  // --------------------------------------------------------------- submit

  async submit(): Promise<void> {
    if (this.busy) {
      return;
    }
    this.submitError = '';
    if (!this.travelType) {
      this.common.presentToast('Please select travel mode', 'warning');
      return;
    }
    if (!this.remark || !this.remark.trim()) {
      this.common.presentToast('Please enter a remark', 'warning');
      return;
    }
    if (!this.selfieBlob || !this.vehicleBlob) {
      this.common.presentToast('Selfie and vehicle photo are both required', 'warning');
      return;
    }
    if (!this.start) {
      this.common.presentToast('Current location is required to start the trip', 'warning');
      return;
    }
    // Ek waqt me ek hi trip - doosre ticket ki chal rahi ho to yahin rok do
    const running = await this.liveTracker.activeTrip();
    if (running && String(running.id) !== String(this.tktId)) {
      this.submitError = `Another trip is already running for #${running.id}. End it first.`;
      return;
    }

    const form = new FormData();
    form.append('tkt_id', String(this.tktId));
    form.append('module_type', '1');            // 1 = helpdesk
    form.append('lat', String(this.start.lat));
    form.append('lng', String(this.start.lng));
    form.append('vehicle_type', String(this.travelType));
    form.append('remark', this.remark.trim());
    form.append('recorded_at', this.nowIst());
    form.append('selfie_img', this.selfieBlob, this.img1);
    form.append('vehicle_img', this.vehicleBlob, this.img2);

    this.busy = true;
    this.httpComplaint.startGpsTrip(form).subscribe({
      next: async (data: any) => {
        if (!data.status) {
          // Wajah screen par hi rahegi - toast chala jaata hai aur engineer padh nahi paata
          this.submitError = data.msg || 'Could not start the trip';
          this.busy = false;
          return;
        }
        // Local record sirf pehredari ke liye - trip_id End Trip ko list API se milti hai
        this.liveTracker.setLocalTrip(this.module, this.tktId);
        const tripId = data.trip_id ?? data.data?.trip_id ?? data.data?.id ?? null;
        try {
          // Server maan gaya - ab phone par trip chalu, taaki dono ek page par rahein.
          // Browser me native plugin hai hi nahi, wahan sirf form ka flow test hota hai
          if (this.liveTracker.isSupported()) {
            await this.liveTracker.startTrip(this.module, this.tktId, this.start!);
          }
          this.common.presentToast(data.msg || 'Trip started', 'success');
          void this.modalCtrl.dismiss({ started: true, tripId });
        } catch (e: any) {
          console.error('startTrip native', e);
          this.submitError = e?.message || 'Trip saved on server but tracking did not start';
        } finally {
          this.busy = false;
        }
      },
      error: (err: any) => {
        console.error('startGpsTrip', err);
        this.submitError = err?.error?.msg || environment.errMsg;
        this.busy = false;
      }
    });
  }

  /** Server ka format - India ka time: 2026-09-21 15:40:00 */
  private nowIst(): string {
    return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' });
  }

  formatCoords(): string {
    if (!this.start) {
      return '-';
    }
    return `${this.start.lat.toFixed(6)}, ${this.start.lng.toFixed(6)}`;
  }
}
