import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, ModalController, NavController, Platform } from '@ionic/angular';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { ConciergeService } from 'src/app/provider/concierge/concierge.service';
import { environment } from 'src/environments/environment';
import { AssignUserComponent } from '../assign-user/assign-user.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Geolocation } from '@capacitor/geolocation';
import { LocationTracker } from 'capacitor-location-tracker-sqlite';
import { TripLogsComponent } from '../trip-logs/trip-logs.component';
declare var google: any;
@Component({
  selector: 'app-conc-work',
  templateUrl: './conc-work.component.html',
  styleUrls: ['./conc-work.component.scss'],
})
export class ConcWorkComponent implements OnInit {
  tab!: string;
  requestData: any;
  statusData: any = [];
  status: any;
  remark!: string;
  action_taken!: string;
  problem_reported!: string;
  scopeOfWorkArr: any = [];
  scope_of_work!: string;
  formDataInProgress = new FormData();
  // inProgressImage = false;
  // resolveImage = false;
  formDataResolve = new FormData();
  assignUsers: any = [];
  action = ''
  segStatus = 'action';
  isSegDisable!: boolean;
  endLat: any = '';
  endLong: any = '';
  totalDistance: any = '';
  distanceAdjust: any = '';
  tollAmount: any = '';
  endReading: any = '';
  gpsStatus = false;
  // endOdFileName: any = '';
  // endOdImage: any;
  tripForm!: FormGroup;
  isTripModalOpen = false;
  isEndTripModalOpen = false;
  // tripStarted = false;

  lat: any = '';
  lng: any = '';
  // fileName: any = '';
  // selectedImage: any;
  // previewUrl: any = '';
  specificTicketObj: any = {};
  captureImage: any = {};
  /** Last attachment blobs for preview on re-open (FormData does not expose them back) */
  private attachmentBlobInProgress: Blob | null = null;
  private attachmentBlobResolved: Blob | null = null;

  map: any;
  mapRoute: any;
  trekPath: any = [];
  // private DUMMY_START_LAT = 28.6139;
  // private DUMMY_START_LONG = 77.2090;
  // private DUMMY_END_LAT = 28.7041;
  // private DUMMY_END_LONG = 77.1025;

  mapStatus: any;
  private readonly gpsTrackerStateKey = 'gps_tracker_running';

  constructor(
    private activeRoute: ActivatedRoute,
    private common: CommonService,
    private httpConcierge: ConciergeService,
    private camera: CameraService,
    private fb: FormBuilder,
    private navCtrl: NavController,
    private modalCtrl: ModalController,
    private platform: Platform,
    private alertController: AlertController) {
    this.activeRoute.queryParams.subscribe((res) => {
      this.requestData = JSON.parse(res['data']);
      console.log(this.requestData);
      let segStatusType = res['type'];
      this.segStatus = segStatusType;
      if (segStatusType === 'details') {
        this.isSegDisable = true;
      }
      this.requestData.created_at_new = new Date(
        this.requestData.created_at.replace(/(\d{2})-(\d{2})-(\d{4})/, '$2/$1/$3')
      );
      this.tab = res['tab'];
    });
  }

  ngOnInit() {
    this.getSpecificTicket();
    this.initForm();
    // this.tripForm.get('tripType')?.valueChanges.subscribe(val => {
    //   this.tripForm.patchValue({ trip_start_odometer_reading: '' });
    //   this.selectedImage = null;
    //   this.fileName = '';
    //   this.lat = '';
    //   this.long = '';
    // });
  }

  initForm() {
    this.tripForm = this.fb.group({
      tripType: ['manual', Validators.required],
      trip_start_odometer_reading: ['']
    });
  }

  getSpecificTicket() {
    const obj = {
      tab: this.tab,
      tckt: this.requestData.id,
    }
    this.common.presentLoading().then(preLoad => {
      this.httpConcierge.getSpecificTicket(obj).subscribe({
        next: (data: any) => {
          if (data.status) {
            this.statusData = data.data.statusData;
            this.assignUsers = data.data.assignUsers;
            this.specificTicketObj = data.data.data;
            console.log(this.specificTicketObj);
            this.status = 3;
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error: () => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.common.dismissloading();
        },
        complete: () => {
          this.common.dismissloading();
        }
      });
    })
  }

  changeStatus(ev: any) {
    this.captureImage.inProgressImage = false;
    this.captureImage.resolveImage = false;
    if (ev.target.value === 4 && this.scopeOfWorkArr.length === 0) {
      this.common.presentLoading().then(preLoad => {
        this.httpConcierge.getScopeOfWork().subscribe({
          next: (data: any) => {
            if (data.status) {
              this.scopeOfWorkArr = data.data;
            } else {
              this.common.presentToast(data.msg, 'warning');
            }
          },
          error: () => {
            this.common.dismissloading();
            this.common.presentToast(environment.errMsg, 'danger');
          },
          complete: () => {
            this.common.dismissloading();
          }
        })
      });
    }
  }

  actionInProgress() {
    if (!this.status) {
      this.common.presentToast('Please select status', 'warning');
    } else if (!this.remark) {
      this.common.presentToast('Please enter remark', 'warning');
    } else {
      this.formDataInProgress.delete('status');
      this.formDataInProgress.delete('document_type');
      this.formDataInProgress.delete('remark');
      this.formDataInProgress.delete('tckt');
      this.formDataInProgress.delete('source');

      this.formDataInProgress.append('status', this.status);
      this.formDataInProgress.append('document_type', 'Attachment');
      this.formDataInProgress.append('remark', this.remark);
      this.formDataInProgress.append('tckt', this.requestData.id);
      this.formDataInProgress.append('source', environment.source);
      this.actionTicket(this.formDataInProgress);
    }
  }

  actionTicket(formData: any) {
    this.common.presentLoading().then(preLoad => {
      this.httpConcierge.actionInProgress(formData).subscribe({
        next: (data: any) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.navCtrl.pop();
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error: () => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.common.dismissloading();
        },
        complete: () => {
          this.common.dismissloading();
        }
      });
    })
  }

  attachment(type: string) {
    const existingBlob =
      type === 'in_progress'
        ? this.attachmentBlobInProgress
        : type === 'resolved'
          ? this.attachmentBlobResolved
          : null;
    this.camera.selectImage(
      ['camera', 'gallery'],
      (blob: any) => {
        let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg';
        if (type == 'in_progress') {
          this.formDataInProgress.delete('document');
          this.formDataInProgress.append('document', blob, random);
          this.captureImage.inProgressImage = true;
          this.attachmentBlobInProgress = blob;
        } else if (type == 'resolved') {
          this.formDataResolve.delete('document');
          this.formDataResolve.append('document', blob, random);
          this.captureImage.resolveImage = true;
          this.attachmentBlobResolved = blob;
        }
      },
      existingBlob ?? undefined
    );
  }

  actionResolve() {
    if (!this.status) {
      this.common.presentToast('Please select status', 'warning');
    } else if (!this.action_taken) {
      this.common.presentToast('Please enter Action Taken', 'warning');
    } else if (!this.action_taken) {
      this.common.presentToast('Please enter Action Taken', 'warning');
    } else if (!this.captureImage.resolveImage) {
      this.common.presentToast('Please upload image', 'warning');
    } else {
      this.formDataResolve.delete('status');
      this.formDataResolve.delete('document_type');
      this.formDataResolve.delete('action_taken');
      this.formDataResolve.delete('tckt');
      this.formDataResolve.delete('source');

      this.formDataResolve.append('status', this.status);
      this.formDataResolve.append('document_type', 'Attachment');
      this.formDataResolve.append('action_taken', this.action_taken);
      this.formDataResolve.append('tckt', this.requestData.id);
      this.formDataResolve.append('source', environment.source);
      this.actionTicket(this.formDataResolve);
    }
  }

  async assignUser() {
    const modal = await this.modalCtrl.create({
      component: AssignUserComponent,
      cssClass: 'my-modal',
      componentProps: {
        assignUsers: this.assignUsers,
        tckt: this.requestData.id
      }
    });

    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {
        this.navCtrl.pop();
      }
    });
    modal.present();
  }
  //------------===================--------------------======================--------------------======================---------------------==================----------------=============---->

  private readonly webGpsFallback = { lat: 28.445831445524963, lng: 77.30814421380869 };

  private async getCurrentForegroundLocation() {
    if (this.platform.is('capacitor')) {
      await Geolocation.requestPermissions();
      const res = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      return {
        lat: res.coords.latitude,
        lng: res.coords.longitude
      };
    }

    return { ...this.webGpsFallback };
  }

  /** Native app only: background LocationTracker (map shows on browser too) */
  isCapacitorGps(): boolean {
    return this.platform.is('capacitor');
  }

  async setStartLocationFromGps() {
    try {
      const current = await this.getCurrentForegroundLocation();
      this.lat = current.lat;
      this.lng = current.lng;

      await this.initMap(this.lat, this.lng, 'start');
      this.gpsStatus = true;
    } catch (error) {
      console.error(error);
      this.common.presentToast('Unable to fetch current location', 'warning');
    }
  }

  /** Wait for modal/layout paint so #map has real dimensions (replaces fixed 500ms delay). */
  private waitForMapLayout(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  async initMap(lat: any, lng: any, status: string) {
    await this.waitForMapLayout();
    const el = document.getElementById('map');
    if (!el) {
      await new Promise((r) => setTimeout(r, 32));
    }
    const mapEl = document.getElementById('map');
    if (!mapEl || typeof google === 'undefined' || !google.maps) {
      console.warn('Map container or Google Maps API not ready');
      return;
    }

    this.gpsStatus = true;
    const center = { lat: Number(lat), lng: Number(lng) };
    this.map = new google.maps.Map(mapEl, {
      center,
      zoom: 15,
    });
    this.map.addListener('click', (event: any) => this.changeMarker(event.latLng, status));
    this.currentMarker(lat, lng);

    // Ionic modal: first paint often grey until resize + center refresh
    google.maps.event.addListenerOnce(this.map, 'idle', () => {
      google.maps.event.trigger(this.map, 'resize');
      this.map.setCenter(center);
    });
  }

  changeMarker(latLng: any, status: string) {
    if (this.mapStatus) {this.mapStatus.setMap(null)}    
    this.mapStatus = new google.maps.Marker({
      position: latLng,
      map: this.map,
      label: 'S',
      icon: 'assets/img/green-dot.png',
      animation: google.maps.Animation.BOUNCE
    });    
    this.lat = latLng.toJSON().lat;
    this.lng = latLng.toJSON().lng;       
    if (status === 'end') {
      this.specificTicketObj.trip_end_lat = this.lat;
      this.specificTicketObj.trip_end_lng = this.lng;    
      // let val = this.calcDistance(this.lat!, this.lng!, this.specificTicketObj.trip_start_lat, this.specificTicketObj.trip_start_lng).toFixed(2);
      // this.specificTicketObj.distance = val;
      this.common.presentLoading().then(preLoad => {
        this.common.dismissloading();
      });
    }     
  }

  currentMarker(lat: any, long: any) {
    const position = new google.maps.LatLng(lat, long);
    const marker = new google.maps.Marker({ position, title: 'Mobilise', animation: google.maps.Animation.BOUNCE });
    marker.setMap(this.map);
  }

  openTripStartModal() {
    this.isTripModalOpen = true;
  }

  closeTripStartModal() {
    this.isTripModalOpen = false;
  }

  async openTripEndModal() {
    this.isEndTripModalOpen = true;
    if (this.specificTicketObj.trip_type === 'gps') {
      const current = await this.getCurrentForegroundLocation();
      const endLat = current.lat;
      const endLng = current.lng;
      this.initMap(endLat, endLng, 'end');
      this.specificTicketObj.trip_end_lat = endLat;
      this.specificTicketObj.trip_end_lng = endLng;
      // const computedDistanceKm = this.calcDistance(
      //   endLat!,
      //   endLng!,
      //   this.specificTicketObj.trip_start_lat,
      //   this.specificTicketObj.trip_start_lng
      // ).toFixed(2);
      // this.specificTicketObj.distance = computedDistanceKm;
      this.trekPath = this.isCapacitorGps() ? await this.getLocations() : [{
        latitude: 28.43891332576039, longitude: 77.32364796665696
      }, {
        latitude: 28.444880675184887, longitude: 77.30811020300669
      }, {
        latitude: 28.44781728716837, longitude: 77.30776470085033
      }, {
        latitude: 28.45235421762417, longitude: 77.30744390462624
      }, {
        latitude: 28.459815924491107, longitude: 77.30687201571149
      }];    
      setTimeout(() => {
        if (this.trekPath.length > 0) {
          this.initMapRoute(this.trekPath);
        }
      }, 1000)
      
      const pathDistanceKm = this.getPathDistanceKm(this.trekPath);    
      this.specificTicketObj.distance = pathDistanceKm.toFixed(2);      
    }
  }

  async initMapRoute(location: any) {    
  
    // Map center: pehle point par
    const center = { lat: location[0].latitude, lng: location[0].longitude };
  
    this.mapRoute = new google.maps.Map(document.getElementById('mapRoute'), {
      center: center,
      zoom: 12,
    });
  
    // Saare markers add karo
    location.forEach((point: any, index: any) => {
      let color: string;
  
      if (index === 0) {
        color = 'green';                        // Pehla point → green
      } else if (index === location.length - 1) {
        color = 'red';                          // Aakhri point → red
      } else {
        color = 'blue';                         // Beech ke point → blue
      }
  
      this.addColoredMarker(point.latitude, point.longitude, color, index);
    });
  
    // Route path draw karo (polyline)
    this.drawRoutePath(location);
  }
  
  addColoredMarker(lat: number, lng: number, color: string, index: number) {
    const position = new google.maps.LatLng(lat, lng);
  
    const marker = new google.maps.Marker({
      position,
      map: this.mapRoute,
      title: `Point ${index + 1}`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      }
    });
  }
  
  drawRoutePath(location: any[]) {
    const pathCoordinates = location.map(point => ({
      lat: point.latitude,
      lng: point.longitude
    }));
  
    const routePath = new google.maps.Polyline({
      path: pathCoordinates,
      geodesic: true,
      strokeColor: '#4A90E2',   // Route line ka color (blue-ish)
      strokeOpacity: 0.8,
      strokeWeight: 4,
    });
  
    routePath.setMap(this.mapRoute);
  }

  closeTripEndModal() {
    this.isEndTripModalOpen = false;
  }

  submitTripStart() {
    const tripType = this.tripForm.value.tripType;
    if (tripType === 'gps' && (!this.lat || !this.lng)) {
      this.common.presentToast('Please get current location first', 'warning');
      return;
    }
    if (tripType === 'manual') {
      this.submitManualTripStart();
    } else if (tripType === 'gps') {
      this.submitGpsTripStart();
    }
  }

  private submitManualTripStart() {
    if (!this.tripForm.value.trip_start_odometer_reading) {
      this.common.presentToast('Please enter start reading', 'warning');
      return;
    }
    if (!this.captureImage.start_trip) {
      this.common.presentToast('Please capture OD reading image', 'warning');
      return;
    }
    const random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg';
    const formData = this.buildBaseTripFormData('manual');
    formData.append('trip_start_odometer_reading', this.tripForm.value.trip_start_odometer_reading);
    formData.append('trip_start_odometer_img', this.captureImage.start_trip, random);
    this.submitTripApi(formData, 'start', 'manual');
  }

  private submitGpsTripStart() {
    const formData = this.buildBaseTripFormData('gps');
    formData.append('trip_start_lat', this.lat);
    formData.append('trip_start_lng', this.lng);
    this.submitTripApi(formData, 'start', 'gps');
  }

  private buildBaseTripFormData(tripType: 'manual' | 'gps'): FormData {
    const formData = new FormData();
    formData.append('trip_type', tripType);
    formData.append('ticket_id', this.requestData.id);
    formData.append('action', this.specificTicketObj.tckt_trip);
    return formData;
  }

  private validateTollInputPair(imageWarning: string): boolean {
    if (this.tollAmount && !this.captureImage.toll_img) {
      this.common.presentToast(imageWarning, 'warning');
      return false;
    }
    if (!this.tollAmount && this.captureImage.toll_img) {
      this.common.presentToast('Please Enter Toll Amount', 'warning');
      return false;
    }
    return true;
  }

  submitTripApi(formData: any, tripType: 'start' | 'stop', source: 'manual' | 'gps') {
    for (let [key, value] of (formData as any).entries()) {
      console.log(key, value);
    }
    this.common.presentLoading().then(preLoad => {      
      this.httpConcierge.startOrEndTrip(formData).subscribe({
        next: async (data: any) => {
          console.log(data);
          if (data.status) {
            if (this.isCapacitorGps() && source === 'gps' && tripType === 'start') {
              const trackingStarted = await this.startTracking();
              if (!trackingStarted) {
                this.common.presentToast('Trip started, but background tracking is not active yet', 'warning');
              }
            }
            let msg = tripType === 'start' ? data.msg + ' ' + 'Trip ID : ' + data.trip_id : data.msg;
            this.common.presentToast(msg, 'success');
            tripType === 'start' ? this.isTripModalOpen = false : this.isEndTripModalOpen = false;
            if (source === 'gps' && tripType === 'stop') {  
              this.clearLocations();
            }
            setTimeout(() => {
              this.navCtrl.pop();
            }, 1000);

          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error: () => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.common.dismissloading();
        }
      });
    });
  }

  submitTripEndManual() {
    if (!this.endReading) {
      this.common.presentToast('Please enter end reading', 'warning');
      return;
    }
    if (this.endReading < this.specificTicketObj.trip_start_odometer_reading) {
      this.common.presentToast(`End Trip Can't be small then Start Trip`, 'warning');
      return;
    }
    if (!this.captureImage.trip_end) {
      this.common.presentToast('End Trip Image is Mandatory', 'warning');
      return;
    }

    if (!this.validateTollInputPair('Toll Attachment is Mandatory')) {
      return;
    }

    this.onTollAmountBlur();

    let distance = parseInt(this.endReading, 10) - parseInt(this.specificTicketObj.trip_start_odometer_reading, 10);
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg';
    const formData = new FormData();
    formData.append('trip_type', 'manual');
    formData.append('trip_end_odometer_reading', this.endReading);
    formData.append('trip_end_odometer_img', this.captureImage.trip_end, random);
    if (this.captureImage.toll_img) {      
      formData.append('toll_img', this.captureImage.toll_img, random);
    }    
    formData.append('trip_total_distance', distance.toString())
    formData.append('trip_toll', this.tollAmount);
    formData.append('trip_id', this.specificTicketObj.trip_id);
    formData.append('ticket_id', this.requestData.id);
    formData.append('action', this.specificTicketObj.tckt_trip);
    this.submitTripApi(formData, 'stop', 'manual');
  }  

  async openCamera(type: string, status: boolean) {
    let obj = [];
    if (status === true) {
      obj = ['camera', 'gallery'];
    } else {
      obj = ['camera'];
    }
    const existingBlob =
      type === 'start_trip'
        ? this.captureImage.start_trip
        : type === 'end_trip'
          ? this.captureImage.trip_end
          : type === 'toll_img'
            ? this.captureImage.toll_img
            : null;
    const existing =
      existingBlob instanceof Blob ? existingBlob : undefined;
    this.camera.selectImage(
      obj,
      (blob: Blob) => {
        if (type === 'start_trip') {
          this.captureImage.start_trip = blob;
        } else if (type === 'end_trip') {
          this.captureImage.trip_end = blob;
        } else if (type === 'toll_img') {
          this.captureImage.toll_img = blob;
        }
      },
      existing
    );
  }

  async submitTripEndGps() {
    if (!this.validateTollInputPair('Toll Image is Mandatory')) {
      return;
    }

    const current = await this.getCurrentForegroundLocation();
    this.specificTicketObj.trip_end_lat = current.lat;
    this.specificTicketObj.trip_end_lng = current.lng;
    this.initMap(current.lat, current.lng, 'end');

    if (this.isCapacitorGps() && this.getGpsTrackerRunningState()) {
      await this.stopTracking();
    }

    const trekPath = this.isCapacitorGps() ? await this.getLocations() : [];    
    const pathDistanceKm = this.getPathDistanceKm(trekPath);    
    // Prefer real tracked path sum; fallback to straight-line start/end.
    this.specificTicketObj.distance = (pathDistanceKm > 0 ? pathDistanceKm : this.calcDistance(
      current.lat,
      current.lng,
      this.specificTicketObj.trip_start_lat,
      this.specificTicketObj.trip_start_lng
    )).toFixed(2);
    this.onDistanceAdjustBlur();
    this.onTollAmountBlur();

    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg';
    const formData = new FormData();
    formData.append('trek_path', JSON.stringify(trekPath));
    formData.append('trip_type', 'gps');
    formData.append('ticket_id', this.requestData.id);
    formData.append('action', this.specificTicketObj.tckt_trip);
    formData.append('trip_end_lat', this.specificTicketObj.trip_end_lat);
    formData.append('trip_end_lng', this.specificTicketObj.trip_end_lng);
    formData.append('trip_total_distance', this.specificTicketObj.distance);
    formData.append('trip_total_distance_adjusted', this.distanceAdjust);
    formData.append('trip_toll', this.tollAmount);
    if (this.captureImage.toll_img) {
      formData.append('toll_img', this.captureImage.toll_img, random);
    }    
    formData.append('trip_id', this.specificTicketObj.trip_id);
    this.submitTripApi(formData, 'stop', 'gps');
  }

  private calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toLatLngPoint(p: any): { lat: number; lng: number } | null {
    const latRaw = p?.lat ?? p?.latitude ?? p?.coords?.latitude;
    const lngRaw = p?.lng ?? p?.lon ?? p?.long ?? p?.longitude ?? p?.coords?.longitude;
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return { lat, lng };
  }

  private getPathDistanceKm(points: any[]): number {
    if (!Array.isArray(points) || points.length < 2) {
      return 0;
    }
    let total = 0;
    let prev = this.toLatLngPoint(points[0]);
    for (let i = 1; i < points.length; i++) {
      const curr = this.toLatLngPoint(points[i]);
      if (!prev || !curr) {
        prev = curr;
        continue;
      }
      total += this.calcDistance(prev.lat, prev.lng, curr.lat, curr.lng);
      prev = curr;
    }
    return total;
  }

  private clampModelToTwoDecimals(ev: any, key: 'distanceAdjust' | 'tollAmount'): void {
    const cur = (this as any)[key];
    const raw = String(ev?.detail?.value ?? cur ?? '').replace(',', '.');
    if (!raw.includes('.')) {
      return;
    }
    const dot = raw.indexOf('.');
    const intPart = raw.slice(0, dot);
    const frac = raw.slice(dot + 1).replace(/[^\d]/g, '');
    if (frac.length <= 2) {
      return;
    }
    (this as any)[key] = `${intPart}.${frac.slice(0, 2)}`;
  }

  private normalizeModelTwoDecimalsBlur(key: 'distanceAdjust' | 'tollAmount'): void {
    const v = (this as any)[key];
    if (v === '' || v == null) {
      return;
    }
    const n = parseFloat(String(v).replace(',', '.'));
    if (!Number.isFinite(n)) {
      return;
    }
    (this as any)[key] = Number(n.toFixed(2));
  }

  /** Max 2 digits after decimal while typing (e.g. 19.22) */
  clampDistanceAdjustDecimals(ev: any): void {
    this.clampModelToTwoDecimals(ev, 'distanceAdjust');
  }

  onDistanceAdjustBlur(): void {
    this.normalizeModelTwoDecimalsBlur('distanceAdjust');
  }

  clampTollAmountDecimals(ev: any): void {
    this.clampModelToTwoDecimals(ev, 'tollAmount');
  }

  onTollAmountBlur(): void {
    this.normalizeModelTwoDecimalsBlur('tollAmount');
  }

  async startTracking() {
    if (!this.isCapacitorGps()) {
      return false;
    }
    if (this.getGpsTrackerRunningState()) {
      return true;
    }

    try {
      // 1. Background = Always (iOS) / all-the-time (Android) — same flow as concierge.page
      let { allowed: bgAllowed } = await LocationTracker.requestBackgroundPermissionsCheck();
      if (!bgAllowed) {
        await LocationTracker.requestBackgroundPermissions();
        if (this.platform.is('ios')) {
          await new Promise<void>(resolve => setTimeout(resolve, 600));
        }
        bgAllowed = (await LocationTracker.requestBackgroundPermissionsCheck()).allowed;
      }
      if (!bgAllowed) {
        const shouldOpenSettings = await this.showLocationPermissionSettingsPrompt();
        if (shouldOpenSettings) {
          await LocationTracker.requestBackgroundPermissions();
          if (this.platform.is('ios')) {
            await new Promise<void>(resolve => setTimeout(resolve, 600));
          }
          bgAllowed = (await LocationTracker.requestBackgroundPermissionsCheck()).allowed;
        }
      }
      if (!bgAllowed) {
        this.common.presentToast(
          'Background location (Always) is required for GPS trip tracking.',
          'warning'
        );
        return false;
      }

      // 2. Battery optimization (Android only; iOS plugin stubs return allowed)
      if (this.platform.is('android')) {
        const { allowed: batteryAllowed } = await LocationTracker.requestIgnoreBatteryOptimizationsCheck();
        if (!batteryAllowed) {
          await LocationTracker.requestIgnoreBatteryOptimizations();
          const { allowed: batAgain } = await LocationTracker.requestIgnoreBatteryOptimizationsCheck();
          if (!batAgain) {
            return false;
          }
        }
      }

      // 3. Start native background tracker (separate from Geolocation current position)
      const { success } = await LocationTracker.start();
      if (success) {
        this.setGpsTrackerRunningState(true);
        return true;
      }
      return false;
    } catch (e) {
      console.error('startTracking', e);
      this.common.presentToast('Could not start background location tracking.', 'warning');
      return false;
    }
  }

  async stopTracking() {
    if (!this.isCapacitorGps()) {
      return;
    }
    const { success } = await LocationTracker.stop();
    if (success) {
      this.setGpsTrackerRunningState(false);
      console.log('Tracking stopped');
    }
  }

  private setGpsTrackerRunningState(status: boolean) {
    localStorage.setItem(this.gpsTrackerStateKey, status ? '1' : '0');
  }

  private getGpsTrackerRunningState() {
    return localStorage.getItem(this.gpsTrackerStateKey) === '1';
  }

  async getLocations() {
    if (!this.isCapacitorGps()) {
      return [];
    }
    const { locations } = await LocationTracker.getLocations();
    console.log('Locations:', locations);
    return locations;
  }

  async clearLocations() {
    if (!this.isCapacitorGps()) {
      return;
    }
    await LocationTracker.clearLocations();
    console.log('Locations cleared');
  }

  private async showLocationPermissionSettingsPrompt(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: 'Location Permission Required',
      message: this.platform.is('ios')
        ? 'Turn on Location and set it to "Always" for background GPS trips. You can open Settings to change this.'
        : 'Please allow location access all the time for accurate background tracking.',
      mode: this.platform.is('ios') ? 'ios' : 'md',
      buttons: [
        { text: 'Not now', role: 'cancel' },
        { text: 'Open Settings', role: 'confirm' }
      ]
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  async openTripLogs() {
    const modal = await this.modalCtrl.create({
      component: TripLogsComponent,
      cssClass: 'my-modal_',
      componentProps: {
        data: this.requestData.id
      }
    });
    modal.present();
  }

}
