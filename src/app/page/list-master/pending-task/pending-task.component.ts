import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { LoadingController, ModalController, Platform } from '@ionic/angular';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';
import { CommonService } from 'src/app/provider/common/common.service';
import * as moment from 'moment';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { PmCalService } from 'src/app/provider/pm-cal/pm-cal.service';
import { MeterService } from 'src/app/provider/meter/meter.service';
import { AssignTicketComponent } from '../../complaint/assign-ticket/assign-ticket.component';
import { PmAssignComponent } from '../../pm-cal/pm-assign/pm-assign.component';
import { SiteDetailComponent } from '../../complaint/site-detail/site-detail.component';
import { TicketHistoryComponent } from '../../complaint/ticket-history/ticket-history.component';
import { TicketTypeComponent } from '../../complaint/ticket-type/ticket-type.component';
import { Router } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { liveQuery } from 'dexie';
import { db } from '../../../provider/local-db/local-db.service';
@Component({
  selector: 'app-pending-task',
  templateUrl: './pending-task.component.html',
  styleUrls: ['./pending-task.component.scss'],
})
export class PendingTaskComponent  implements OnInit {
  @Input() eventChange: any;
  @Input() didEnter: any;
  loading: any;
  pendingTask = true;
  segments = 'helpdesk';
  page = 1;
  pendingTicket: any = [];
  allChecklist: any = [];
  assignCheckList: any = [];
  attendedCheckList: any = [];
  pmsList: any = [];
  meterInfo: any = [];
  formData = new FormData();
  userData: any;
  isInternet: any;
  qrType!: string;
  qrObject: any = {};
  constructor(
    private loadingController: LoadingController,
    private httpCompalint: ComplaintService,
    private common: CommonService,
    private httpDigital: DigitalChecklistService,
    private httpPm: PmCalService,
    private modalCtrl: ModalController,
    private httpMeter: MeterService,
    private router: Router,
    private platform: Platform
  ) { }

  ngOnInit() {
    this.common.checkInternet().then(res => {
      if (res) {
        this.isInternet = true;
      } else {
        this.isInternet = false;
      }
    });
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
    }
  }

  ngOnChanges() {
    if (this.eventChange) {
      this.getData();
    }
    if (this.didEnter) {
      let split, ecn_key, val ,bar = this.common.getBarcode();
      this.common.setBarcode('');
      if (bar && this.qrType === 'verify') {
        this.qrType = '';
        split = bar.split('/');
        if (split.length === 6) {
          ecn_key = split[5];
          val = this.common.decryptValue(ecn_key);
          if (this.qrObject.barcode === val) {
            this.openFillReport(this.qrObject);
          } else {
            this.common.presentToastWithOk('You are Scan Wrong QR Code ' + val, 'warning');
          }
        } else {
          this.common.presentToast('You are Scan Wrong QR Code', 'warning');
        }
      } else if (bar && this.qrType === 'verify_meter') {
        split = bar.split('/');
        ecn_key = split[split.length - 1];
        val = this.common.decryptValue(ecn_key);
        if (this.qrObject.ext_id === val) {
          this.qrObject.isQrVerify = true;
        } else {
          this.common.presentToastWithOk(`You are Scanning Wrong QR Code. ${val}`, 'warning');
        }
      } else if (bar && this.qrType === 'pms') {
        split = bar.split('/');
        ecn_key = split[split.length - 1];
        val = this.common.decryptValue(ecn_key);
        if (this.qrObject.ext_asset_id === val) {
          this.openFillReportPms(this.qrObject);
        } else {
          this.common.presentToastWithOk(`You are Scanning Wrong Asset QR Code. ${val}`, 'warning');
        }
      } else if (bar && this.qrType === 'loc-verify') {
        split = bar.split('/');
        if (split.length === 6) {
          ecn_key = split[5];
          let val = this.common.decryptValue(ecn_key);
          if (this.qrObject.loc_id === parseInt(val, 10)) {
            this.openFillReport(this.qrObject);
          } else {
            this.common.presentToast('You are Scan Wrong Location QR Code ' + val, 'warning');
          }
        } else {
          this.common.presentToast('You are Scan Wrong QR Code', 'warning');
        }
      }
    }
  }

  getData() {
    if (this.segments === 'helpdesk') {
      this.page = 1;
      this.pendingTicket = [];
      this.getPendingTicket();
    } else if (this.segments === 'digital') {
      this.checkCurrentDateDG(moment().format('YYYY-MM-DD'));
    } else if (this.segments === 'pms') {
      this.getPendingPms();
    } else if (this.segments === 'meter') {
      this.getPendingMeter();
    }
  }

  myCustom(ev: any) {
    this.page = 1;
    this.pendingTicket = [];
    this.getPendingTicket();
  }

  clickCustomSegment(val: string) {
    this.segments = val;
    if (val === 'helpdesk') {
      this.getPendingTicket();
    } else if (val === 'digital') {
      this.checkCurrentDateDG(moment().format('YYYY-MM-DD'));
    } else if (val === 'pms') {
      this.getPendingPms();
    } else if (val === 'meter') {
      this.getPendingMeter();
    }
  }

  checkCurrentDateDG(date: string) {
    const friendsObservable = liveQuery (() => db.checklist.where({schedule_date: date}).toArray());
    const sub = friendsObservable.subscribe({
      next:(data) => {
        this.allChecklist = data;
        this.assignCheckList = this.allChecklist.filter((val: any) => val.schedule_status === 'assigned' && val.assign_to === this.userData.id);
        this.attendedCheckList = this.allChecklist.filter((val: any) => val.schedule_status !== 'assigned' && val.assign_to === this.userData.id);
        if (this.allChecklist.length === 0 && this.isInternet) {
          this.getOfflineCheckListFromServer(date);
        }
        setTimeout(() => {
          sub.unsubscribe();
        }, 1000);
      }
    });
  }

  getOfflineCheckListFromServer(date: string) {
    this.presentLoading('Please Wait, Application is Fetching your Data').then(preLoad => {
      this.httpDigital.getOfflineCheckListFromServer(date).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.allChecklist = data.data;
            this.assignCheckList = this.allChecklist.filter((val: any) => val.schedule_status === 'assigned' && val.assign_to === this.userData.id);
            this.attendedCheckList = this.allChecklist.filter((val: any) => val.schedule_status !== 'assigned' && val.assign_to === this.userData.id);
            this.addBulkCheckList(this.allChecklist);
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg + ' In Saving Checklist Offline Mode', 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      })
    })
  }

  async addBulkCheckList(checkListData: any) {
    await db.checklist.bulkAdd(checkListData);
  }

  getPendingTicket() {
    this.httpCompalint.getTicketMaster(null, this.page).subscribe({
      next:(data) => {
        if (data.status) {
          this.page = this.page + 1;
          this.pendingTicket = [...this.pendingTicket, ...data.data.data];
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      },
      error:() => {
        this.dismissloading();
        this.common.presentToast(environment.errMsg, 'warning');
      },
      complete:() => {
        this.dismissloading();
      }
    });
  }

  async openSite(data:any) {
    const modal = await this.modalCtrl.create({
      component: SiteDetailComponent,
      cssClass: 'my-modal2',
      componentProps: { ticketData: data }
    });
    modal.present();
  }

  async history(tkts_id: any) {
    const modal = await this.modalCtrl.create({
      component: TicketHistoryComponent,
      cssClass: 'my-modal',
      componentProps: { ticket_id: tkts_id }
    });
    modal.present();
  }

  fsr(ticket_id: number) {}

  async work_now(allData: any) {
    this.presentLoading().then(preLoad => {
      this.httpCompalint.checkTicketConfirm(allData.tkts_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.openTicketWork(allData);
          } else {
            this.openTicketTypeModal(allData, data.locations, data.data);
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    });
  }

  openTicketWork(data: any) {
    this.router.navigate(['complaint/ticket-work'], {
      queryParams: {
        data: JSON.stringify(data),
      }
    });
  }

  async openTicketTypeModal(allData: any, locations: any, data: any) {
    const modal = await this.modalCtrl.create({
      component: TicketTypeComponent,
      cssClass: 'my-modal',
      componentProps: { allData:  allData, locations: locations, requestData1: data }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        // this.greetEvent.emit(true);
      }
    });
    modal.present();
  }

  loadData(event: any) {
    setTimeout(() => {
      event.target.complete();
    }, 3000);
    this.getPendingTicket();
  }

  getSchedule(date: any) {
    this.allChecklist = [];
    this.assignCheckList = [];
    this.attendedCheckList = [];
    this.presentLoading().then(preLoad => {
      this.httpDigital.getScheduleHistory(date).subscribe({
        next:(data) => {
          if (data.status) {
            this.allChecklist = data.data;
            this.assignCheckList = this.allChecklist.filter((val: any) => val.schedule_status == 'assigned');
            this.attendedCheckList = this.allChecklist.filter((val: any) => val.schedule_status == 'attended');
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger')
        },
        complete:() => {
          this.dismissloading();
        }
      })
    })
  }

  getPendingPms(){
    this.presentLoading().then(() => {
      this.httpPm.getPm(1, 1).subscribe({
        next:(dat) => {
          if (dat.status) {
            this.pmsList = dat.data.data;
            this.pmsList = this.pmsList.filter((val: any) => val.stage_id === 1);
          } else {
            this.pmsList = [];
            this.common.presentToast(dat.msg, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'warning');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    });
  }

  verifyQr(data: any) {
    if (data.barcode) {
      this.qrType = 'verify';
      this.qrObject = data;
      this.router.navigateByUrl('/barcode');
    } else {
      this.qrType = 'loc-verify';
      this.qrObject = data;
      this.router.navigateByUrl('/barcode');
      // this.openFillReport(data);
    }
  }

  openBarcode(type: string, dat: any) {
    if (!this.platform.is('capacitor') && type === 'verify') {
      dat.isQrVerify = true;
      return;
    }
    this.qrType = type;
    this.qrObject = dat;
    this.router.navigateByUrl('/barcode');
  }

  openFillReport(data: any) {
    if (this.platform.is('capacitor')) {
      if (data.schedule_status !== 'assigned') {
        this.openPageUrl(data);
      } else {
        const pastDate = moment(data.sch_dateTime).format('YYYY-MM-DD');
        const currentDate = moment(moment().format('YYYY-MM-DD'));
        if (!currentDate.isSame(pastDate)) {
          this.common.presentToast('You can fill only Current Date Checklist', 'warning');
          return;
        }
        const pastDateTime = moment(data.sch_dateTime);
        const currentDateTime = moment();
        const isCurrentDatetimeBigger = currentDateTime.isAfter(pastDateTime);
        if (!isCurrentDatetimeBigger) {
          this.common.presentToast('You cant fill Checklist before Time, this Checklist time is ' + moment(data.sch_dateTime).format('h:mm:ss'), 'warning')
          return;
        }
        this.openPageUrl(data);
      }
    } else {
      this.openPageUrl(data);
    }
  }

  openPageUrl(data: any) {
    this.router.navigate(['/digital-checklist/fill-report/'], {
      queryParams: {
        isOnBehalf: 0,
        schedule_id: data.schedule_id
      }
    });
  }

  // openFillReport(data: any) {
  //   const pastDate = moment(data.sch_dateTime).format('YYYY-MM-DD');
  //   const currentDate = moment(moment().format('YYYY-MM-DD'));
  //   if (!currentDate.isSame(pastDate)) {
  //     this.common.presentToast('You can fill only Current Date Checklist', 'warning');
  //     return;
  //   }
  //   const pastDateTime = moment(data.sch_dateTime);
  //   const currentDateTime = moment();
  //   const isCurrentDatetimeBigger = currentDateTime.isAfter(pastDateTime);
  //   if (!isCurrentDatetimeBigger) {
  //     this.common.presentToast('You cant fill Checklist before Time, this Checklist time is ' + moment(data.sch_dateTime).format('h:mm:ss'), 'warning')
  //     return;
  //   }
  //   this.openPageUrl(data);
  // }

  // openPageUrl(data: any) {
  //   this.router.navigate(['/digital-checklist/fill-report/'], {
  //     queryParams: {
  //       isOnBehalf: 0,
  //       schedule_id: data.schedule_id
  //     }
  //   });
  // }

  uploadPtw(dat: any) {}

  viewAttachment(url: string) {
    this.common.openDoc(url);
  }

  getPendingMeter() {
    this.presentLoading().then(preLoad => {
      this.httpMeter.getPendingWo().subscribe({
        next:(data) => {
          if (data.status) {
            this.meterInfo = data.data;
          } else {
            this.common.presentToast(data.info, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    })
  }

  checkPhotoCondition(dat: any, type: any) {
    if (dat.is_gllry_upld_allwd == 1) {
      this.presentActionSheet(1, dat , type);
    } else if (dat.is_gllry_upld_allwd == 0) {
      this.presentActionSheet(0, dat , type);
    } else {
      alert('Gallery is Undefined ' + dat.is_gllry_upld_allwd);
    }
  }

  async presentActionSheet(val: any, data: any, type: any) {
    const takePicture = async () => {
      var obj: any = {};
      if (val === 1) {
        obj = {
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.Uri,
        }
      } else {
        obj = {
          quality: 80,
          allowEditing: false,
          source: CameraSource.Camera,
          resultType: CameraResultType.Uri,
        }
      }
      const image = await Camera.getPhoto(obj);
      this.readImg(image, data ,type)
    };
    takePicture();
  }

  async readImg(photo: any, data: any,type: any) {
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    if (type == 'consumption') {
      this.formData.delete('img1');
      this.formData.append('img1', blob, random);
      data.isConsumptionImg = true;
      for (var i = 0; i < this.meterInfo.length;i++) {
        if (data.wo_id !== this.meterInfo[i].wo_id) {
          this.meterInfo[i].isConsumptionImg = false;
        }
      }
    } else if (type == 'generate_reading') {
      this.formData.delete('img2');
      this.formData.append('img2', blob, random);
      data.isGenerationImg = true;
      for (var i = 0; i < this.meterInfo.length;i++) {
        if (data.wo_id !== this.meterInfo[i].wo_id) {
          this.meterInfo[i].isGenerationImg = false;
        }
      }
    } else if (type === 'other') {
      this.formData.delete('img3');
      this.formData.append('img3', blob, random);
      data.isOtherImg = true;
      for (var i = 0; i < this.meterInfo.length;i++) {
        if (data.wo_id !== this.meterInfo[i].wo_id) {
          this.meterInfo[i].isOtherImg = false;
        }
      }
    }
    this.presentLoading().then(preLoad => {
      setTimeout(() => {
        this.dismissloading();
      }, 500)
    })
  }

  updRead(dat: any) {
    if (this.checkConsumptionCondition(dat) && this.checkGenertionCondition(dat) && this.checkOtherCondition(dat)) {
      const obj = {
        wo_id: dat.wo_id,
        consume_reading: dat.consumption_reading || '',
        gen_reading: dat.generate_reading || '',
        new_oth_reading: dat.other_reading || '',
        con_remark: dat.con_remark || '',
        gen_remark: dat.gen_remark || '',
        oth_remark: dat.oth_remark || '',
        ideal_reading: dat.ideal_reading || '',
        meter_id: dat.meter_id,
      };
      this.save(obj, dat);
    }
  }

  updateReading(dat: any, type: any) {
    if (type === 'consumption' ) {
      if (this.checkConsumptionCondition(dat)) {
        const obj = {
          wo_id: dat.wo_id,
          consume_reading: dat.consumption_reading,
        }
        this.save(obj, dat);
      }
    } else if (type === 'generation') {
      if (this.checkGenertionCondition(dat)) {
        const obj = {
          wo_id: dat.wo_id,
          gen_reading: dat.generate_reading
        }
        this.save(obj, dat);
      }
    } else if (type === 'both') {
      if (this.checkConsumptionCondition(dat) && this.checkGenertionCondition(dat) && this.checkOtherCondition(dat)) {
        const obj = {
          wo_id: dat.wo_id,
          consume_reading: dat.consumption_reading,
          gen_reading: dat.generate_reading,
          new_oth_reading: dat.other_reading
        }
        this.save(obj, dat);
      }
    }
  }

  checkConsumptionCondition(dat: any) {
    if (dat.is_consumption == 1 && !dat.consumption_reading) {
      this.common.presentToast('Consumption Reading is Mandatory', 'tertiary');
      return false;
    } else if (dat.is_consumption == 1 && dat.is_remark_req == 1 && !dat.con_remark) {
      this.common.presentToast('Consumption Remark is Mandatory', 'tertiary');
      return false;
    } else if (dat.is_consumption == 1 && dat.is_img_req && !dat.isConsumptionImg) {
      this.common.presentToast('Consumption Image is Mandatory', 'tertiary');
      return false;
    } else {
      return true;
    }
    // if (!dat.consumption_reading) {
    //   alert('Please Enter Consumption Reading');
    //   return false;
    // } else if (dat.is_img_req == 1 && !dat.isConsumptionImg) {
    //   alert('Consumption Image is Required');
    //   return false;
    // } else {
    //   return true;
    // }
  }

  checkGenertionCondition(dat: any) {
    if (dat.is_generation == 1 && !dat.generate_reading) {
      this.common.presentToast('Generation Reading is Mandatory', 'tertiary');
      return false;
    } else if (dat.is_generation == 1 && dat.is_remark_req == 1 && !dat.gen_remark) {
      this.common.presentToast('Generation Remark is Mandatory', 'tertiary');
      return false;
    } else if (dat.is_generation == 1 && dat.is_img_req && !dat.isGenerationImg) {
      this.common.presentToast('Generation Image is Mandatory', 'tertiary');
      return false;
    } else {
      return true;
    }
    // if (!dat.generate_reading) {
    //   alert('Please Enter Generate Reading');
    //   return false;
    // } else if (dat.is_img_req == 1 && !dat.isGenerationImg) {
    //   alert('Generation Image is Required');
    //   return false;
    // } else {
    //   return true;
    // }
  }

  checkOtherCondition(dat: any) {
    if (dat.oth_read == 1 && !dat.other_reading) {
      this.common.presentToast('Other Reading is Mandatory', 'tertiary');
      return false;
    } else if (dat.oth_read == 1 && dat.is_remark_req == 1 && !dat.oth_remark) {
      this.common.presentToast('Other Remark is Mandatory', 'tertiary');
      return false;
    } else if (dat.oth_read == 1 && dat.is_img_req && !dat.isOtherImg) {
      this.common.presentToast('Other Image is Mandatory', 'tertiary');
      return false;
    } else {
      return true;
    }
    // if (!dat.other_reading && dat.oth_read == 1) {
    //   alert('Other Reading is Required');
    //   return false;
    // } else {
    //   return true;
    // }
  }


  save(obj: any, dat: any) {
    for (let key in obj) {
      this.formData.delete(key);
      this.formData.append(key, obj[key]);
    }
    this.presentLoading().then(preLoad => {
      this.httpMeter.updateReading(this.formData).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            dat.isRemove = true
            setTimeout(() => {
              this.meterInfo = this.meterInfo.filter((val: any) => val.wo_id !== obj.wo_id);
            }, 500);
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.dismissloading();
        },
        complete:() => {
          this.dismissloading();
        }
      });
    })
  }

  checkPms(type: string, data: any) {
    if (data.ext_asset_id) {
      this.openBarcode(type, data);
    } else {
      this.openFillReportPms(data);
    }
  }

  openFillReportPms(dat: any) {
    this.router.navigate(['/pm-calibration/pm-report'], {
      queryParams: {
        data: JSON.stringify(dat),
      }
    });
  }

  //   openFillReport(data: any) {
  //   if (data.ext_asset_id) {
  //     this.selectedObj = data;
  //     this.openBarcode(data)
  //   } else {
  //     this.openPage(data);
  //   }
  // }

  // openBarcode(data: any) {
  //   this.router.navigateByUrl('/barcode');
  // }

  openPage(data: any) {
    this.router.navigate(['/pm-calibration/pm-report'], {
      queryParams: {
        data: JSON.stringify(data),
      }
    });
  }

  changePendingTask() {
    this.presentLoading().then(preLoad => {
      this.pendingTask = !this.pendingTask;
      this.dismissloading();
    })
  }

  async assignTicket(ticket_id: any,  data: any) {
    const modal = await this.modalCtrl.create({
      component: AssignTicketComponent,
      cssClass: 'my-modal',
      componentProps: {
        ticket_id: ticket_id,
        allData: data
      }
    });
    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {
        this.getPendingTicket();
      }
    });
    modal.present();
  }

  async pmAssign(dat: any) {
    const modal = await this.modalCtrl.create({
      component: PmAssignComponent,
      cssClass: 'my-modal',
      componentProps: { data: dat }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {
        this.pmsList = this.pmsList.filter((val:any) => val.wo_id !== dat.wo_id);
      }
    });
    modal.present();
  }

  async presentLoading(msg?: string) {
    let message;
    if (msg) {
      message = msg;
    } else {
      message = 'Please Wait'
    }
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: message,
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }
}
