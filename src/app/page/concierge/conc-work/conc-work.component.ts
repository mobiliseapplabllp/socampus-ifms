import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController, NavController } from '@ionic/angular';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { ConciergeService } from 'src/app/provider/concierge/concierge.service';
import { environment } from 'src/environments/environment';
import { AssignUserComponent } from '../assign-user/assign-user.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  inProgressImage = false;
  resolveImage = false;
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
  endOdFileName: any = '';
  endOdImage: any;
  tripForm!: FormGroup;
  isTripModalOpen = false;
  isEndTripModalOpen = false;
  tripStarted = false;
  tripTypeSelected: any = '';
  lat: any = '';
  long: any = '';
  fileName: any = '';
  selectedImage: any;
  previewUrl: any = '';

  private DUMMY_START_LAT = 28.6139;
  private DUMMY_START_LONG = 77.2090;
  private DUMMY_END_LAT = 28.7041;
  private DUMMY_END_LONG = 77.1025;

  constructor(
    private activeRoute: ActivatedRoute,
    private common: CommonService,
    private httpConcierge: ConciergeService,
    private camera: CameraService,
    private fb: FormBuilder,
    private navCtrl: NavController,
    private modalCtrl: ModalController) {
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
    this.tripForm.get('tripType')?.valueChanges.subscribe(val => {
      this.tripForm.patchValue({ startReading: '' });
      this.selectedImage = null;
      this.fileName = '';
      this.lat = '';
      this.long = '';
    });
  }

  initForm() {
    this.tripForm = this.fb.group({
      tripType: ['gps', Validators.required],
      startReading: ['']
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
            this.assignUsers = data.data.assignUsers
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
    this.inProgressImage = false;
    this.resolveImage = false;
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
    this.camera.selectImage(['camera', 'gallery'], (blob: any) => {
      let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
      if (type == 'in_progress') {
        this.formDataInProgress.delete('document');
        this.formDataInProgress.append('document', blob, random);
        this.inProgressImage = true;
      } else if (type == 'resolved') {
        this.formDataResolve.delete('document');
        this.formDataResolve.append('document', blob, random);
        this.resolveImage = true;
      }
    });
  }

  actionResolve() {
    if (!this.status) {
      this.common.presentToast('Please select status', 'warning');
    }
    // else if (!this.problem_reported) {
    //   this.common.presentToast('Please enter remark', 'warning');
    // } 
    else if (!this.action_taken) {
      this.common.presentToast('Please enter Action Taken', 'warning');
    } else if (!this.action_taken) {
      this.common.presentToast('Please enter Action Taken', 'warning');
    } else if (!this.resolveImage) {
      this.common.presentToast('Please upload image', 'warning');
    } else {
      this.formDataResolve.delete('status');
      this.formDataResolve.delete('document_type');
      // this.formDataResolve.delete('problem_reported');
      this.formDataResolve.delete('action_taken');
      // this.formDataResolve.delete('scope_of_work');
      this.formDataResolve.delete('tckt');
      this.formDataResolve.delete('source');

      this.formDataResolve.append('status', this.status);
      this.formDataResolve.append('document_type', 'Attachment');
      // this.formDataResolve.append('problem_reported', this.problem_reported);
      this.formDataResolve.append('action_taken', this.action_taken);
      // this.formDataResolve.append('scope_of_work', this.scope_of_work);
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

openTripModal() {
  this.isTripModalOpen = true;
}

closeTripModal() {
  this.isTripModalOpen = false;
}

openEndTripModal() {
  this.isEndTripModalOpen = true;
}

closeEndTripModal() {
  this.isEndTripModalOpen = false;
}

startTrip() {
  const tripType = this.tripForm.value.tripType;
  if (tripType === 'gps' && (!this.lat || !this.long)) {
    this.common.presentToast('Please get current location first', 'warning');
    return;
  }
  if (tripType === 'manual') {
    if (!this.tripForm.value.startReading) {
      this.common.presentToast('Please enter start reading', 'warning');
      return;
    }
    if (!this.selectedImage) {
      this.common.presentToast('Please capture OD reading image', 'warning');
      return;
    }
  }
  this.tripTypeSelected = tripType;
  this.tripStarted = true;
  this.closeTripModal();
}

async tripAttachment() {
  //, 'gallery'
  this.camera.selectImage(['camera'], (blob: Blob) => {
    this.selectedImage = blob;
    this.fileName = Date.now() + '.jpg';
  });
}


  gpsTracking() {
    this.lat = this.DUMMY_START_LAT;
    this.long = this.DUMMY_START_LONG;
    console.log('GPS Start (dummy):', this.lat, this.long);
  }

  endTripGps() {
    this.endLat = this.DUMMY_END_LAT;
    this.endLong = this.DUMMY_END_LONG;
    this.totalDistance = this.calcDistance(this.lat, this.long, this.endLat, this.endLong).toFixed(2);
    console.log('GPS Trip Ended:', { startLat: this.lat, startLong: this.long, endLat: this.endLat, endLong: this.endLong, totalDistance: this.totalDistance });
    this.tripStarted = false;
    this.closeEndTripModal();
  }

  endTripManual() {
    if (!this.endReading) {
      this.common.presentToast('Please enter end reading', 'warning');
      return;
    }
    const distance = this.endReading - this.tripForm.value.startReading;
    console.log('Manual Trip Ended:', { startReading: this.tripForm.value.startReading, endReading: this.endReading, distance, toll: this.tollAmount });
    this.tripStarted = false;
    this.closeEndTripModal();
  }

  endOdAttachment() {
    this.camera.selectImage(['camera', 'gallery'], (blob: Blob) => {
      this.endOdImage = blob;
      this.endOdFileName = Date.now() + '.jpg';
    });
  }

  private calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

}
