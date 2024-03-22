import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonDatetime, IonSlides, LoadingController, Platform } from '@ionic/angular';
import * as moment from 'moment';
import { CommonService } from 'src/app/provider/common/common.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { environment } from 'src/environments/environment';
import { db } from '../../provider/local-db/local-db.service';
import { liveQuery } from 'dexie';
@Component({
  selector: 'app-digital-checklist',
  templateUrl: './digital-checklist.page.html',
  styleUrls: ['./digital-checklist.page.scss'],
})
export class DigitalChecklistPage implements OnInit {
  @ViewChild(IonSlides) slides!: IonSlides;
  @ViewChild('popoverDatetime')  popoverDatetime!: IonDatetime;
  temp: any = [];
  assignCheckList$: any;
  segmentStatus = 'assigned';
  allChecklist: any = [];
  loading: any;
  selectedDate = moment().format('YYYY-MM-DD');
  // selectedDate = '2024-01-19';
  scanBarcodeDetail: any = {
    isScanBarcode: false,
    QRType: '',
    QRValue: ''
  };
  isOnBehalf = 0;
  assignCheckList: any = [];
  attendedCheckList: any = [];



  slideBanner = {
    initialSlide: 0,
    slidesPerView: 5,
    autoplay: false,
    breakpoints: {
      320: {
        slidesPerView: 5,
      },
      480: {
        slidesPerView: 6,
      },
      530: {
        slidesPerView: 7,
      },
      640: {
        slidesPerView: 8,
      },
      700: {
        slidesPerView: 9,
      },
    }
  };
  dateArr: any = [];
  isInternet!: boolean;
  userData: any = [];
  constructor(
    private common: CommonService,
    private router: Router,
    private httpDigital: DigitalChecklistService,
    private loadingController: LoadingController,
    private platform: Platform,
    private alertController: AlertController
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
    let date = moment().format('YYYY-MM-DD');
    this.common.setBarcode('');
    this.deleteCheckList(moment().subtract(7, 'day').format('YYYY-MM-DD'));
    this.createCustomCalendar(date);
    // this.getForkData();
  }

  // getForkData() {
  //   let data: any, output: any
  //   data = [{
  //     schedule_id:1,
  //     name: 'abc',
  //     url: 'https://hr-access.herokuapp.com/https://ifmsuat.mobilisepro.com/backend/api/setups/app-menu/get_mobile_app_mnu',
  //   },{
  //     schedule_id:2,
  //     name: 'def',
  //     url: 'https://hr-access.herokuapp.com/https://ifmsuat.mobilisepro.com/backend/api/complaints/get_assign_ticket_master?limit=10&page=1&ticket_type=not_resolved'
  //   },{
  //     schedule_id:3,
  //     name: 'ghi',
  //     url: 'https://hr-access.herokuapp.com/https://ifmsuat.mobilisepro.com/backend/api/complaints/dash/mobile_app_engineer_dashboard'
  //   }]

  //   output = data.map((item: any) => ({
  //     method: 'get',
  //     url: item.url,
  //     data: {...item}
  //   }));

  //   this.httpDigital.postDynamicData(output).subscribe({
  //     next:(data) => {
  //       console.log(data);
  //     },
  //     error:() => {},
  //     complete:() => {}
  //   })
  // }

  ionViewDidLeave() {
    this.common.setBarcode('');
    this.dismissloading();
  }

  ionViewDidEnter() {
    let split, type, ecn_key, bar = this.common.getBarcode();
    if (bar) {
      console.log(bar);
      this.scanBarcodeDetail.isScanBarcode = true;
      this.common.setBarcode('');
      split = bar.split('/');
      if (split.length === 6) {
        type = split[4];
        ecn_key = split[5];
        let val = this.common.decryptValue(ecn_key);
        console.log(val);
        this.scanBarcodeDetail.QRType = type;
        this.scanBarcodeDetail.QRValue = val;
        if (val) {
          this.getCheckListByBarcode(type, val);
        } else {
          this.common.presentToast('Invalid Encryption', 'warning');
        }
      } else {
        this.common.presentToast('You are Scan Wrong QR Code', 'warning');
      }
    } else if(this.scanBarcodeDetail.isScanBarcode) {
      this.getCheckListByBarcode(this.scanBarcodeDetail.QRType, this.scanBarcodeDetail.QRValue);
    } else {
      this.getCheckListCurrentDate(this.selectedDate);
    }

    // if (bar) {
    //   this.common.setBarcode('');
    //   if (this.qrType == 'otherbarcode') {
    //     console.log('Your Barcode is ' + bar);
    //     let temp, temp1;
    //     temp = bar;
    //     temp1 = temp.split('/');
    //     this.scanBarcode = temp1[5];
    //   } else {
    //     let temp, temp1;
    //     temp = bar;
    //     temp1 = temp.split('/');
    //     console.log(temp1);
    //     const obj = {
    //       sch_id: this.qrType,
    //       enc_barcode: temp1[5],
    //       type: 'checklist',
    //     }
    //     this.verifyBarcode(obj);
    //     return;
    //   }
    // }
    // if (this.segmentStatus == 'attended') {
    //   return;
    // }
    // if (!this.scanBarcode) {
    //   this.getSchedule(this.selectedDate);
    // } else {
    //   this.getScheduleUsingBarcode(this.scanBarcode);
    // }https://ifmsuat.mobilisepro.com/#/create-ticket-qr-code/eyJpdiI6IlNob0lsa3Z6T01NU2htUEthVWk4dVE9PSIsInZhbHVlIjoiRTY2VWhtWmNqSS94WUh5eUJVS2pYZDZiOVczeUZ3VjRWeG9JT1BQS0NBYz0iLCJtYWMiOiIzNGQ1Njk3ZmQ4NmZkOTMyM2ZhNzIwODFmN2I2YWYzNTU0M2VmOWE0MjVjMTkyMDAxMTA2MDg4MTljM2FkOWNlIn0%3D
  }

  myCheckList() {
    this.scanBarcodeDetail.isScanBarcode = false;
    this.scanBarcodeDetail.QRType = '';
    this.scanBarcodeDetail.QRValue = '';
    this.getCheckListCurrentDate(this.selectedDate);
  }

  getCheckListByBarcode(type: string, val: any) {
    if (type === 'complaint-qr-code') {
      var friendsObservable = liveQuery (() => db.checklist.where({loc_id:parseInt(val, 10)}).toArray());
    } else if (type === 'create-ticket-qr-code') {
      var friendsObservable = liveQuery (() => db.checklist.where({barcode:val}).toArray());
    } else {
      return
    }
    const sub = friendsObservable.subscribe({
      next:(data) => {
        this.allChecklist = data;
        this.assignCheckList = this.allChecklist.filter((val: any) => val.schedule_status === 'assigned');
        this.attendedCheckList = this.allChecklist.filter((val: any) => val.schedule_status !== 'assigned');
        setTimeout(() => {
          sub.unsubscribe();
        }, 1000);
      }
    });
  }

  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'REFRESH DIGITAL CHECKLIST?',
      message: 'are you sure want to Refresh Digital Checklist?',
      mode: 'ios',
      buttons: [{
        text: 'Cancel',
          handler: (data) => {
            console.log("Cancel");
          }
        },{
          text: 'YES',
          handler: (data) => {
            this.checkOfflineStatus();
          }
        }]
    });
    await alert.present();
  }

  async checkOfflineStatus() {
    const friendsObservable = liveQuery (() => db.checklist.where({offline_save: "true"}).toArray());
    const sub = friendsObservable.subscribe({
      next:(data) => {
        console.log(data);
        if (data.length > 0) {
          setTimeout(() => {
            sub.unsubscribe();
          }, 500);
          this.common.presentToastWithOk('Warning!!! You have ' + data.length + ' Digital Checklist saved in your local Db Please Submit these checklist to server otherwise your saved Checklist will destroyed ', 'danger');
          this.router.navigateByUrl('/list-master/offline-data');
          return;
        }
        this.assignCheckList = [];
        this.attendedCheckList = [];
        this.deleteCheckList(this.selectedDate);
        setTimeout(() => {
          sub.unsubscribe();
          this.getCheckListCurrentDate(this.selectedDate);
        },500);
      }
    });
  }

  async getCheckListCurrentDate(date: string) {
    const friendsObservable = liveQuery (() => db.checklist.where({schedule_date: date, assign_to: this.userData.id}).or('schedule_status').notEqual('assigned').toArray());
    // const friendsObservable = liveQuery (() => db.checklist.where({schedule_date: date, assign_to: this.userData.id}).or({schedule_date: date}).toArray());
    const sub = friendsObservable.subscribe({
      next:(data) => {
        this.allChecklist = data;
        this.assignCheckList = this.allChecklist.filter((val: any) => val.schedule_status === 'assigned');
        this.attendedCheckList = this.allChecklist.filter((val: any) => val.schedule_status !== 'assigned');
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
    this.presentLoading('Checklist Save in offline. it may take time').then(preLoad => {
      this.httpDigital.getOfflineCheckListFromServer(date).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.allChecklist = data.data;
            console.log(this.allChecklist);
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

  async deleteCheckList(date: any) {
    let newDate = moment(date).add(1, 'day').format('YYYY-MM-DD');
    await db.checklist.where("schedule_date").below(newDate).delete();
  }

  async clearChecList() {
    return await db.checklist.clear();
  }

  getScheduleUsingBarcode(loc_id: any) {
    this.isOnBehalf = 0;
    this.assignCheckList = [];
    this.attendedCheckList = [];
    this.presentLoading().then(preLoad => {
      this.httpDigital.getSceduleMissed(loc_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.isOnBehalf = 1;
            this.allChecklist = data.data;
            this.assignCheckList = this.allChecklist.filter((val: any) => val.schedule_status == 'assigned');
            this.attendedCheckList = this.allChecklist.filter((val: any) => val.schedule_status == 'attended');
          } else {
            this.common.presentToast(data.msg, 'warning');
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

  openPage(url: string) {
    this.router.navigateByUrl(url);
  }

  async presentLoading(msg?: any) {
    let message;
    if(msg) {
      message = msg
    } else {
      message = 'Please Wait.';
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

  changeDateComponent(ev: any) {
    this.selectedDate = moment(ev.detail.value).format('YYYY-MM-DD');
    const data = {
      date: moment(ev.detail.value).format('DD'),
      day: moment(ev.detail.value).format('dddd')[0],
      fulldate: moment(ev.detail.value).format('YYYY-MM-DD'),
      ind: parseInt(moment(ev.detail.value).format('DD'), 10),
    }
    this.createCustomCalendar(moment(ev.detail.value).format('YYYY-MM-DD'));
    this.changeCalendarDate(data);
    this.popoverDatetime.confirm(true);
  }

  changeCalendarDate(dat: any) {
    this.slides.slideTo(dat.ind - 3);
    for (var i = 0 ; i < this.dateArr.length; i++) {
      if (dat.date == this.dateArr[i].date) {
        this.dateArr[i].isSelect= true;
      } else {
        this.dateArr[i].isSelect= false;
      }
    }
    this.selectedDate = dat.fulldate;
    this.assignCheckList = [];
    this.attendedCheckList = [];
    this.getCheckListCurrentDate(this.selectedDate);
  }


  openFillReport(data: any) {
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
    return;
    if (this.platform.is('capacitor')) {
      if (!data.barcode  || data.schedule_status === 'attended') {
        this.router.navigateByUrl('/digital-checklist/fill-report/' + data.schedule_id + '/' + this.isOnBehalf);
      } else {
        // this.qrType = data.schedule_id;
        this.router.navigateByUrl('/barcode');
      }
    } else {
      this.router.navigateByUrl('/digital-checklist/fill-report/' + data.schedule_id + '/' + this.isOnBehalf);
    }
  }

  openPageUrl(data: any) {
    this.router.navigate(['/digital-checklist/fill-report/'], {
      queryParams: {
        // data: JSON.stringify(data),
        isOnBehalf: this.isOnBehalf,
        schedule_id: data.schedule_id
      }
    });
  }

  verifyBarcode(obj: any){
    this.presentLoading().then(preLoad => {
      this.httpDigital.verifyAssetByQr(obj).subscribe({
        next:(dat: any) => {
          if (dat.status) {
            this.common.presentToast(dat.msg, 'success');
            this.router.navigateByUrl('/digital-checklist/fill-report/' + obj.sch_id + '/' + this.isOnBehalf);
          } else {
            this.common.presentToast(dat.msg, 'warning');
          }
        }, error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        }, complete:() => {
          this.dismissloading();
        }
      })
    })
  }

  changeDate(action: any) {
    if (action == 'next') {
      let next = moment(this.selectedDate).add(1, 'day').format('YYYY-MM-DD');
      this.selectedDate = next;
    } else {
      let prev = moment(this.selectedDate).subtract(1, 'day').format('YYYY-MM-DD');
      this.selectedDate = prev;
    }
  }

  openBarcode() {
    // if (!this.isInternet) {
    //   this.common.presentToast('Internet Not Working', 'warning');
    //   return
    // }
    this.allChecklist = [];
    this.router.navigateByUrl('/barcode');
  }

  createCustomCalendar(DATE: any) {
    let status: any, index = 0 ,end: any;
    end = moment(DATE).endOf('month').format('DD');
    this.dateArr = [];
    for (let i = 1; i <= end ; i++) {
      if (moment(DATE).format('YYYY-MM-DD') ==  moment(DATE).startOf('month').add(i - 1, 'day').format('YYYY-MM-DD')) {
        status = true;
        index = i;
      } else {
        status = false
      }
      this.dateArr.push({
        date: moment(DATE).startOf('month').add(i - 1, 'day').format('DD'),
        day: moment(DATE).startOf('month').add(i - 1, 'day').format('dddd')[0],
        isSelect: status,
        ind: i,
        fulldate : moment(DATE).startOf('month').add(i - 1, 'day').format('YYYY-MM-DD')
      })
    }
    setTimeout(() => {
      this.slides.slideTo(index - 3);
    }, 50);
  }
}
