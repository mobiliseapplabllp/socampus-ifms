import { Component, OnInit } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-travel-detail',
  templateUrl: './travel-detail.component.html',
  styleUrls: ['./travel-detail.component.scss'],
})
export class TravelDetailComponent  implements OnInit {
  tkts_id: any;
  travelMode: any = [];
  loading: any;
  travelNote!: string;
  selectedTravel: any = [];

  travelType!: string;
  remark!: string;
  formData = new FormData();
  img1: any;
  img2: any;
  canDoTravel = 0;
  constructor(
    private modalCtrl: ModalController,
    private httpComplaint: ComplaintService,    
    private common: CommonService,
    private camera: CameraService
  ) { }

  ngOnInit() {
    this.getTravelType();
  }

  getTravelType() {
    this.common.presentLoading().then(preLoad => {
      this.httpComplaint.getTravelType(this.tkts_id, 'gps').subscribe({
        next:(data) => {
          if (data.status) {
            this.travelNote = data.data?.travelInfo.remarkNote;
            this.travelMode = data.data?.travelType;
            this.canDoTravel = data.data?.travelInfo.canDoTravel;
            this.formData.append('dist_from_site', data.data?.travelInfo.distance_in_km);
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading();
        }
      })
    })
  }

  changeTravel(ev: any) {
    this.selectedTravel = this.travelMode.filter((val: any) => val.value === ev.target.value)[0];
  }

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  async presentActionSheet(val: any) {
    this.camera.selectImage(['camera'], (blob: Blob) => {
      this.readImg(blob, val);
    });
  }

  async readImg(photo: any, imageno: any) {
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
    if (imageno === 1) {
      this.img1 = random;
      this.formData.delete('travelImg1');
      this.formData.append('travelImg1', photo, random);
    } else if (imageno === 2) {
      this.img2 = random;
      this.formData.delete('travelImg2');
      this.formData.append('travelImg2', photo, random );
    }
    this.common.presentLoading().then(preLoad => {
      this.common.dismissloading();
    });
  }

  // async readImg(photo: any, imageno: any) {
  //   let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
  //   const response = await fetch(photo.webPath);
  //   const blob = await response.blob();
  //   if (imageno === 1) {
  //     this.img1 = random;
  //     this.formData.delete('travelImg1');
  //     this.formData.append('travelImg1', blob, random);
  //   } else if (imageno === 2) {
  //     this.img2 = random;
  //     this.formData.delete('travelImg2');
  //     this.formData.append('travelImg2', blob, random );
  //   }
  //   this.common.presentLoading().then(preLoad => {
  //     this.common.dismissloading();
  //   });
  // }

  submit() {
    if (!this.travelType) {
      this.common.presentToast('Please Select Trave Mode', 'warning');
    } else if (!this.remark) {
      this.common.presentToast('Please Select Remark', 'warning');
    } else if (this.selectedTravel.num_img_req === 1 && !this.img1) {
      this.common.presentToast('Selfie 1 is Required', 'warning');
    } else if(this.selectedTravel.num_img_req === 2 && (!this.img1 || !this.img2 )) {
      this.common.presentToast('Selfie 1 and Selfie 2 both are Required', 'warning');
    } else {
      this.formData.delete('travelType');
      this.formData.delete('remark');
      this.formData.delete('source');
      this.formData.delete('startTravel');
      this.formData.delete('ticketId');
      this.formData.delete('travelNote');

      this.formData.append('travelType', this.travelType);
      this.formData.append('remark', this.remark);
      this.formData.append('source', environment.source);
      this.formData.append('startTravel', '1');
      this.formData.append('ticketId', this.tkts_id);
      this.formData.append('travelNote', this.travelNote);
      this.common.presentLoading().then(preLoad => {
        this.httpComplaint.submitTravelInfo(this.formData).subscribe({
          next:(data) => {
            if(data.status) {
              this.common.presentToast(data.msg, 'success');
              this.common.setHomeLoadStatus(true);
              this.closeModal(this.tkts_id, true);
            } else {
              this.common.presentToast(data.msg, 'warning');
            }
          },
          error:() => {
            this.common.dismissloading();
            this.common.presentToast(environment.errMsg, 'danger');
          },
          complete:() => {
            this.common.dismissloading();
          }
        })
      });
    }
  }
}
