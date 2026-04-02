import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController, NavController, Platform } from '@ionic/angular';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { ConciergeService } from 'src/app/provider/concierge/concierge.service';
import { environment } from 'src/environments/environment';
import { AssignUserComponent } from '../assign-user/assign-user.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Geolocation } from '@capacitor/geolocation';
import { LocationTracker } from 'capacitor-location-tracker-sqlite';
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
    private platform: Platform) {
    this.activeRoute.queryParams.subscribe((res) => {
      this.requestData = JSON.parse(res['data']);
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

  private async getCurrentForegroundLocation() {
    if (this.platform.is('capacitor')) {
      const res = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      return {
        lat: res.coords.latitude,
        lng: res.coords.longitude
      };
    }

    return {
      lat: 28.445831445524963,
      lng: 77.30814421380869
    };
  }

  async selectStartGpsLocation() {
    try {
      const current = await this.getCurrentForegroundLocation();
      this.lat = current.lat;
      this.lng = current.lng;
      this.initMap(this.lat, this.lng, 'start');

      const trackingStarted = await this.startTracking();
      if (!trackingStarted) {
        this.common.presentToast('Location selected, but background tracking is not active yet', 'warning');
      }
    } catch (error) {
      console.error(error);
      this.common.presentToast('Unable to fetch current location', 'warning');
    }
  }

  async initMap(lat: any, lng: any, status: string) {    
    await new Promise(resolve => setTimeout(resolve, 500));
    this.gpsStatus = true;
    this.map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: lat, lng: lng },
      zoom: 15,
    });
    this.map.addListener('click', (event: any) => this.changeMarker(event.latLng, status));
    this.currentMarker(lat, lng);
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
      let val = this.calcDistance(this.lat!, this.lng!, this.specificTicketObj.trip_start_lat, this.specificTicketObj.trip_start_lng).toFixed(2);
      this.specificTicketObj.distance = val;
      this.common.presentLoading().then(preLoad => {
        this.common.dismissloading();
      });
    }     
  }

  currentMarker(lat: any, long: any) {
    const position = new google.maps.LatLng(lat, long);
    const marker = new google.maps.Marker({ position, title: 'Mobilise' });
    marker.setMap(this.map);
  }

  openStartTripModal() {
    this.isTripModalOpen = true;
  }

  closeStartTripModal() {
    this.isTripModalOpen = false;
  }

  async openEndTripModal() {
    this.isEndTripModalOpen = true;
    if (this.specificTicketObj.trip_type === 'gps') {
      const current = await this.getCurrentForegroundLocation();
      const lat = current.lat;
      const lng = current.lng;
      this.initMap(lat, lng, 'end');
      this.specificTicketObj.trip_end_lat = lat;
      this.specificTicketObj.trip_end_lng = lng;
      let val = this.calcDistance(lat!, lng!, this.specificTicketObj.trip_start_lat, this.specificTicketObj.trip_start_lng).toFixed(2);
      this.specificTicketObj.distance = val;      
    }
  }

  closeEndTripModal() {
    this.isEndTripModalOpen = false;
  }

  submitStartTrip() {
    const tripType = this.tripForm.value.tripType;
    if (tripType === 'gps' && (!this.lat || !this.lng)) {
      this.common.presentToast('Please get current location first', 'warning');
      return;
    }
    if (tripType === 'manual') {
      if (!this.tripForm.value.trip_start_odometer_reading) {
        this.common.presentToast('Please enter start reading', 'warning');
        return;
      }
      if (!this.captureImage.start_trip) {
        this.common.presentToast('Please capture OD reading image', 'warning');
        return;
      }
      let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg';
      const formData = new FormData();
      formData.append('trip_type', 'manual');
      formData.append('trip_start_odometer_reading', this.tripForm.value.trip_start_odometer_reading);
      formData.append('trip_start_odometer_img', this.captureImage.start_trip, random);
      formData.append('ticket_id', this.requestData.id);
      formData.append('action', this.specificTicketObj.tckt_trip);
      this.submitTripAction(formData, 'start', 'manual');
    } else if (tripType === 'gps') {
      const formData = new FormData();
      formData.append('trip_type', 'gps');
      formData.append('ticket_id', this.requestData.id);
      formData.append('action', this.specificTicketObj.tckt_trip);
      formData.append('trip_start_lat', this.lat);
      formData.append('trip_start_lng', this.lng);
      this.submitTripAction(formData, 'start', 'gps');
    }
  }

  submitTripAction(formData: any, tripType: 'start' | 'stop', source: 'manual' | 'gps') {
    for (let [key, value] of (formData as any).entries()) {
      console.log(key, value);
    }
    this.common.presentLoading().then(preLoad => {      
      this.httpConcierge.startOrEndTrip(formData).subscribe({
        next: async (data: any) => {
          console.log(data);
          if (data.status) {
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

  submitManualTripEnd() {
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

    if (this.tollAmount && !this.captureImage.toll_img) {
      this.common.presentToast('Toll Attachment is Mandatory', 'warning');
      return;
    } 
    if (this.captureImage.toll_img && !this.tollAmount) {
      this.common.presentToast('Please Enter Toll Amount', 'warning');
      return;
    }

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
    this.submitTripAction(formData, 'stop', 'manual');
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

  async submitGpsTripEnd() {
    if (this.tollAmount && !this.captureImage.toll_img) {
      this.common.presentToast('Toll Image is Mandatory', 'warning');
      return;
    }

    if (!this.tollAmount && this.captureImage.toll_img) {
      this.common.presentToast('Toll Amount is Mandatory', 'warning');
      return;
    }

    const current = await this.getCurrentForegroundLocation();
    this.specificTicketObj.trip_end_lat = current.lat;
    this.specificTicketObj.trip_end_lng = current.lng;
    this.initMap(current.lat, current.lng, 'end');
    this.specificTicketObj.distance = this.calcDistance(
      current.lat,
      current.lng,
      this.specificTicketObj.trip_start_lat,
      this.specificTicketObj.trip_start_lng
    ).toFixed(2);

    if (this.getGpsTrackerRunningState()) {
      await this.stopTracking();
    }

    const trekPath = await this.getLocations();

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
    this.submitTripAction(formData, 'stop', 'gps');
  }

  private calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async startTracking() {    
    if (this.getGpsTrackerRunningState()) {
      return true;
    }

    // 1. Background permission check
    const { allowed: bgAllowed } = await LocationTracker.requestBackgroundPermissionsCheck();
    if (!bgAllowed) {
      await LocationTracker.requestBackgroundPermissions(); // Opens app settings
      return false;
    }

    // 2. Battery optimization check (IMPORTANT - tracking band ho sakti hai otherwise)
    const { allowed: batteryAllowed } = await LocationTracker.requestIgnoreBatteryOptimizationsCheck();
    if (!batteryAllowed) {
      await LocationTracker.requestIgnoreBatteryOptimizations(); // Opens battery settings
      return false;
    }

    // 3. Start tracking
    const { success } = await LocationTracker.start();
    if (success) {
      this.setGpsTrackerRunningState(true);
      console.log('Tracking started');
      return true;
    } else {
      console.error('Failed to start');
      return false;
    }
  }

  async stopTracking() {
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
    const { locations } = await LocationTracker.getLocations();
    console.log('Locations:', locations);
    return locations;
  }

  async clearLocations() {
    await LocationTracker.clearLocations();
    console.log('Locations cleared');
  }

}
