import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonDatetime, IonSlides, LoadingController, Platform } from '@ionic/angular';
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
  scanBarcode: any;
  isOnBehalf = 0;
  assignCheckList: any = [];
  attendedCheckList: any = [];
  qrType = 'null';
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
  constructor(
    private common: CommonService,
    private router: Router,
    private httpDigital: DigitalChecklistService,
    private loadingController: LoadingController,
    private platform: Platform,
  ) { }

  ngOnInit() {
    this.common.checkInternet().then(res => {
      if (res) {
        this.isInternet = true;
      } else {
        this.isInternet = false;
      }
    });
    let date = moment().format('YYYY-MM-DD');
    this.common.setBarcode('');
    this.deleteCheckList(moment().subtract(7, 'day').format('YYYY-MM-DD'));

    this.createCustomCalendar(date);
    // this.getForkData();
  }

  getForkData() {
    let data: any, output: any
    data = [{
      schedule_id:1,
      name: 'abc',
      url: 'https://hr-access.herokuapp.com/https://ifmsuat.mobilisepro.com/backend/api/setups/app-menu/get_mobile_app_mnu',
    },{
      schedule_id:2,
      name: 'def',
      url: 'https://hr-access.herokuapp.com/https://ifmsuat.mobilisepro.com/backend/api/complaints/get_assign_ticket_master?limit=10&page=1&ticket_type=not_resolved'
    },{
      schedule_id:3,
      name: 'ghi',
      url: 'https://hr-access.herokuapp.com/https://ifmsuat.mobilisepro.com/backend/api/complaints/dash/mobile_app_engineer_dashboard'
    }]

    output = data.map((item: any) => ({
      method: 'get',
      url: item.url,
      data: {...item}
    }));

    this.httpDigital.postDynamicData(output).subscribe({
      next:(data) => {
        console.log(data);
      },
      error:() => {},
      complete:() => {}
    })
  }

  ionViewDidLeave() {
    this.common.setBarcode('');
    this.dismissloading();
  }

  ionViewDidEnter() {
    this.getCheckListCurrentDate(this.selectedDate);
    let bar = this.common.getBarcode();
    if (bar) {
      this.common.setBarcode('');
      if (this.qrType == 'otherbarcode') {
        console.log('Your Barcode is ' + bar);
        let temp, temp1;
        temp = bar;
        temp1 = temp.split('/');
        this.scanBarcode = temp1[5];
      } else {
        let temp, temp1;
        temp = bar;
        temp1 = temp.split('/');
        console.log(temp1);
        const obj = {
          sch_id: this.qrType,
          enc_barcode: temp1[5],
          type: 'checklist',
        }
        this.verifyBarcode(obj);
        return;
      }
    }
    if (this.segmentStatus == 'attended') {
      return;
    }
    // if (!this.scanBarcode) {
    //   this.getSchedule(this.selectedDate);
    // } else {
    //   this.getScheduleUsingBarcode(this.scanBarcode);
    // }
  }

  sync() {
    console.log(this.selectedDate);
    this.assignCheckList = [];
    this.attendedCheckList = [];
    this.deleteCheckList(this.selectedDate);
    setTimeout(() => {
      this.getCheckListCurrentDate(this.selectedDate);
    },500);

  }

  async getCheckListCurrentDate(date: string) {
    const friendsObservable = liveQuery (() => db.checklist.where({schedule_date: date}).toArray());
    const sub = friendsObservable.subscribe({
      next:(data) => {
        this.allChecklist = data;
        this.assignCheckList = this.allChecklist.filter((val: any) => val.schedule_status === 'assigned');
        this.attendedCheckList = this.allChecklist.filter((val: any) => val.schedule_status !== 'assigned');
        console.log(this.allChecklist.length + '=' + this.isInternet);
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
            this.assignCheckList = this.allChecklist.filter((val: any) => val.schedule_status == 'assigned');
            this.attendedCheckList = this.allChecklist.filter((val: any) => val.schedule_status == 'attended' || val.schedule_status === 'closed');
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
    console.log(checkListData);
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
    console.log(dat);
    this.slides.slideTo(dat.ind - 3);
    for (var i = 0 ; i < this.dateArr.length; i++) {
      if (dat.date == this.dateArr[i].date) {
        this.dateArr[i].isSelect= true;
      } else {
        this.dateArr[i].isSelect= false;
      }
    }
    this.selectedDate = dat.fulldate;
    console.log(this.selectedDate);
    this.assignCheckList = [];
    this.attendedCheckList = [];
    this.getCheckListCurrentDate(this.selectedDate);
  }


  openFillReport(data: any) {
    console.log(data);
    this.openPageUrl(data);
    return;
    if (this.platform.is('capacitor')) {
      if (!data.barcode  || data.schedule_status === 'attended') {
        this.router.navigateByUrl('/digital-checklist/fill-report/' + data.schedule_id + '/' + this.isOnBehalf);
      } else {
        this.qrType = data.schedule_id;
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
    this.allChecklist = [];
    this.qrType = 'otherbarcode';
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
