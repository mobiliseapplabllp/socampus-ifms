import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonDatetime, IonSlides, Platform } from '@ionic/angular';
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
  today = moment().format('YYYY-MM-DD')
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
  qrType = 'site';
  qrObject: any = {};
  isLoop!: boolean;
  offset = 0;
  TOTAL_CHECKLIST = 0;
  constructor(
    private common: CommonService,
    private router: Router,
    private httpDigital: DigitalChecklistService,
    private platform: Platform,
    private alertController: AlertController) {
  }

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
    this.deleteCheckList(moment().subtract(3, 'day').format('YYYY-MM-DD'));
    this.createCustomCalendar(date);
  }

  ionViewDidLeave() {
    this.common.setBarcode('');
    this.common.dismissloading();
  }

  // ionViewDidEnter() {
  //   let split, type, ecn_key, bar = this.common.getBarcode();
  //   this.common.setBarcode('');
  //   if (this.qrType === 'site') {
  //     if (bar) {
  //       this.scanBarcodeDetail.isScanBarcode = true;
  //       split = bar.split('/');
  //       if (split.length === 6) {
  //         type = split[4];
  //         ecn_key = split[5];
  //         let val = this.common.decryptValue(ecn_key);
  //         this.scanBarcodeDetail.QRType = type;
  //         this.scanBarcodeDetail.QRValue = val;
  //         if (val) {
  //           this.getCheckListByBarcode(type, val);
  //         } else {
  //           this.common.presentToast('Invalid Encryption', 'warning');
  //         }
  //       } else {
  //         this.common.presentToast('You are Scan Wrong QR Code', 'warning');
  //       }
  //     } else if(this.scanBarcodeDetail.isScanBarcode) {
  //       this.getCheckListByBarcode(this.scanBarcodeDetail.QRType, this.scanBarcodeDetail.QRValue);
  //     } else {
  //       this.checkCurrentDateDG(this.selectedDate);
  //     }
  //   } else if (this.qrType === 'verify') {
  //     this.qrType = 'site';
  //     split = bar.split('/');
  //     if (split.length === 6) {
  //       ecn_key = split[5];
  //       let val = this.common.decryptValue(ecn_key);
  //       this.qrType = 'site'
  //       if (this.qrObject.barcode === val) {
  //         this.openFillReport(this.qrObject);
  //       } else {
  //         this.common.presentToast('You are Scan Wrong QR Code ' + val, 'warning');
  //       }
  //     } else {
  //       this.common.presentToast('You are Scan Wrong QR Code', 'warning');
  //     }
  //   } else if (this.qrType === 'loc-verify') {
  //     this.qrType = 'site';
  //     split = bar.split('/');
  //     if (split.length === 6) {
  //       ecn_key = split[5];
  //       let val = this.common.decryptValue(ecn_key);
  //       if (this.qrObject.loc_id === parseInt(val, 10)) {
  //         this.openFillReport(this.qrObject);
  //       } else {
  //         this.common.presentToast('You are Scan Wrong Location QR Code ' + val, 'warning');
  //       }
  //     } else {
  //       this.common.presentToast('You are Scan Wrong QR Code', 'warning');
  //     }
  //   }
  // }

  ionViewDidEnter() {    
    const bar = this.common.getBarcode();
    this.common.setBarcode('');    
    if (!bar && this.qrType === 'site') {
      if (this.scanBarcodeDetail.isScanBarcode) {
        this.getCheckListByBarcode(this.scanBarcodeDetail.QRType, this.scanBarcodeDetail.QRValue);
      } else {
        this.checkCurrentDateDG(this.selectedDate);
      }
      return;
    }

    const split = bar?.split('/') || [];
    if (split.length !== 6) {
      this.common.presentToast('You are Scan Wrong QR Code', 'warning');
      return;
    }

    const type = split[4];
    const ecn_key = split[5];
    const val = this.common.decryptValue(ecn_key);

    switch (this.qrType) {
      case 'site':
      this.scanBarcodeDetail.isScanBarcode = true;
      this.scanBarcodeDetail.QRType = type;
      this.scanBarcodeDetail.QRValue = val;

      if (val) {
        this.getCheckListByBarcode(type, val);
      } else {
        this.common.presentToast('Invalid Encryption', 'warning');
      }
      break;

      case 'verify':
        this.qrType = 'site';
        if (this.qrObject.barcode === val) {
          this.openFillReport(this.qrObject);
        } else {
          this.common.presentToast(`You are Scan Wrong QR Code ${val}`, 'warning');
        }
      break;

      case 'loc-verify':
        this.qrType = 'site';
        if (this.qrObject.loc_id === parseInt(val, 10)) {
          this.openFillReport(this.qrObject);
        } else {
          this.common.presentToast(`You are Scan Wrong Location QR Code ${val}`, 'warning');
        }
      break;
    }
  }

  myCheckList() {
    this.scanBarcodeDetail.isScanBarcode = false;
    this.scanBarcodeDetail.QRType = '';
    this.scanBarcodeDetail.QRValue = '';
    this.checkCurrentDateDG(this.selectedDate);
  }

  getCheckListByBarcode(type: string, val: any) {
    if (type === 'complaint-qr-code') {
      var friendsObservable = liveQuery (() => db.checklist.where({loc_id:parseInt(val, 10), schedule_date: moment().format('YYYY-MM-DD')}).toArray());
    } else if (type === 'create-ticket-qr-code') {
      var friendsObservable = liveQuery (() => db.checklist.where({barcode:val, schedule_date: moment().format('YYYY-MM-DD')}).toArray());
    } else {
      return
    }
    const sub = friendsObservable.subscribe({
      next:(data) => {
        this.allChecklist = data;
        this.assignCheckList = this.allChecklist.filter((val: any) => val.schedule_status === 'assigned');
        this.attendedCheckList = this.allChecklist.filter((val: any) => val.schedule_status !== 'assigned');
        this.assignCheckList.sort((a: any, b: any) => {
          return new Date(a.sch_dateTime).getTime() - new Date(b.sch_dateTime).getTime();
        });
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
        this.common.presentLoading('Deleteing Data from Local Database').then(preLoad => {
          db.checklist.where("schedule_date").equals(this.selectedDate).delete().then(async res => {
            this.common.dismissloading();
            this.offset = 0;
            this.TOTAL_CHECKLIST = 0;
            this.getOfflineCheckListFromServer(this.selectedDate, 0);
          });
        })


        setTimeout(() => {
          sub.unsubscribe();
        },500);
      }
    });
  }

  checkCurrentDateDG(date: string) {
    this.common.presentLoading().then(preLoad => {
      const friendsObservable = liveQuery (() => db.checklist.where({schedule_date: date}).sortBy('sch_dateTime'));
      const sub = friendsObservable.subscribe({
        next:(data) => {
          this.common.dismissloading();
          this.allChecklist = data;
          // console.log(this.allChecklist);
          // console.log(this.userData.id);
          this.assignCheckList = this.allChecklist.filter((val: any) => val.schedule_status === 'assigned' && val.assign_to === this.userData.id);
          this.attendedCheckList = this.allChecklist.filter((val: any) => val.schedule_status !== 'assigned' && val.assign_to === this.userData.id);
          if (this.allChecklist.length === 0 && this.isInternet) {
            this.getOfflineCheckListFromServer(date, 0);
          }
          setTimeout(() => {
            sub.unsubscribe();
          }, 1000);
        }, error:() => {
          this.common.presentToast('Please clean your phone Cache', 'warning');
          this.common.dismissloading();
        }
      });
    })

  }

  getOfflineCheckListFromServer(date: string, offset: number) {
    let percentage,tmp_per, msg;
    if (this.offset && this.TOTAL_CHECKLIST) {
      tmp_per = ((this.offset * 100) / this.TOTAL_CHECKLIST);
      if (tmp_per > 100) {
        tmp_per = 100;
        percentage = tmp_per.toFixed(2);
      } else {
        percentage = tmp_per.toFixed(2);
      }
      msg = 'Please Wait, Application is Fetching your Data ' + percentage + '%';
    } else {
      msg = 'Please Wait, Application is Fetching your Data ';
    }
    this.common.presentLoading(msg).then(preLoad => {
      this.httpDigital.getOfflineCheckListFromServer(date, offset).subscribe({
        next:(data: any) => {
          if (data.status) {
            if(data.data?.data.length > 0) {
              this.isLoop = true;
              this.allChecklist = data.data.data;
              if (this.offset === 0) {
                this.TOTAL_CHECKLIST = data.data.total;
              }
              this.addBulkCheckList(this.allChecklist);
            } else {
              this.isLoop = false;
              this.checkCurrentDateDG(this.selectedDate);
            }
          } else {
            this.common.presentLoading().then(preLoad => {
              const friendsObservable = liveQuery (() => db.checklist.where({schedule_date: date}).sortBy('sch_dateTime'));
              const sub = friendsObservable.subscribe({
                next:(data) => {
                  this.common.dismissloading();
                  this.allChecklist = data;
                  this.assignCheckList = this.allChecklist.filter((val: any) => val.schedule_status === 'assigned' && val.assign_to === this.userData.id);
                  this.attendedCheckList = this.allChecklist.filter((val: any) => val.schedule_status !== 'assigned' && val.assign_to === this.userData.id);
                  setTimeout(() => {
                    sub.unsubscribe();
                  }, 1000);
                }
              });
            });
          }
        },
        error:(err: any) => {                    
          this.common.dismissloading();
          if (err.message === 'TIMEOUT') {
            const retry = confirm('Timeout error. Do you want to retry the request?');
            if (retry) {          
              this.getOfflineCheckListFromServer(date, offset);
            }
          } else {
            this.common.presentToast(environment.errMsg + ' In Saving Checklist Offline Mode', 'danger');
          }          
        },
        complete:() => {
          this.common.dismissloading();
        }
      })
    })
  }

  async addBulkCheckList(checkListData: any) {    
    await db.checklist.bulkPut(checkListData).then(res => {
      if (this.isLoop && this.TOTAL_CHECKLIST > 300) {
        this.offset = this.offset + 300;
        this.getOfflineCheckListFromServer(this.selectedDate, this.offset);
      } else {
        this.checkCurrentDateDG(this.selectedDate);
      }
    });
    // await db.checklist.where("schedule_date").equals(this.selectedDate).delete().then(async res => {
    //   await db.checklist.bulkAdd(checkListData);
    // });
  }

  async deleteCheckList(date: any) {
    // let newDate = moment(date).add(3, 'day').format('YYYY-MM-DD');
    await db.checklist.where("schedule_date").below(date).delete();
  }

  async clearChecList() {
    return await db.checklist.clear();
  }

  openPage(url: string) {
    this.router.navigateByUrl(url);
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
    this.checkCurrentDateDG(this.selectedDate);
  }

  verifyQr(data: any) {
    if (this.platform.is('capacitor')) {
      if (data.barcode) {
        this.qrType = 'verify';
        this.qrObject = data;
        this.router.navigateByUrl('/barcode');
      } else {
        this.qrType = 'loc-verify';
        this.qrObject = data;
        this.router.navigateByUrl('/barcode');
      }
    } else {
      this.openFillReport(data);
      // if (data.barcode) {
      //   this.qrType = 'verify';
      //   this.qrObject = data;
      //   this.router.navigateByUrl('/barcode');
      // } else {
      //   this.qrType = 'loc-verify';
      //   this.qrObject = data;
      //   this.router.navigateByUrl('/barcode');
      // }
    }

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
        isOnBehalf: this.isOnBehalf,
        schedule_id: data.schedule_id
      }
    });
  }

  // verifyBarcode(obj: any){
  //   this.common.presentLoading().then(preLoad => {
  //     this.httpDigital.verifyAssetByQr(obj).subscribe({
  //       next:(dat: any) => {
  //         if (dat.status) {
  //           this.common.presentToast(dat.msg, 'success');
  //           this.router.navigateByUrl('/digital-checklist/fill-report/' + obj.sch_id + '/' + this.isOnBehalf);
  //         } else {
  //           this.common.presentToast(dat.msg, 'warning');
  //         }
  //       }, error:() => {
  //         this.common.dismissloading();
  //         this.common.presentToast(environment.errMsg, 'danger');
  //       }, complete:() => {
  //         this.common.dismissloading();
  //       }
  //     })
  //   })
  // }

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
    this.allChecklist = [];
    this.qrType = 'site';
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
