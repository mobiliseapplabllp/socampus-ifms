import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonDatetime, IonSlides, LoadingController, Platform } from '@ionic/angular';
import * as moment from 'moment';
import { CommonService } from 'src/app/provider/common/common.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-digital-checklist',
  templateUrl: './digital-checklist.page.html',
  styleUrls: ['./digital-checklist.page.scss'],
})
export class DigitalChecklistPage implements OnInit {
  @ViewChild(IonSlides) slides!: IonSlides;
  @ViewChild('popoverDatetime')  popoverDatetime!: IonDatetime;
  segmentStatus = 'assigned';
  allChecklist: any = [];
  loading: any;
  selectedDate = moment().format('YYYY-MM-DD');
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
  dateTEMP: any;
  constructor(
    private common: CommonService,
    private router: Router,
    private httpDigital: DigitalChecklistService,
    private loadingController: LoadingController,
    private platform: Platform,
  ) { }

  ngOnInit() {
    this.common.setBarcode('');
    let date = moment().format('YYYY-MM-DD');
    console.log(date);
    this.createCustomCalendar(date);
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

  ionViewDidLeave() {
    this.common.setBarcode('');
    this.dismissloading();
  }

  ionViewDidEnter() {
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
    if (!this.scanBarcode) {
      this.getSchedule(this.selectedDate);
    } else {
      this.getScheduleUsingBarcode(this.scanBarcode);
    }
  }

  getSchedule(date: any) {
    this.allChecklist = [];
    this.assignCheckList = [];
    this.attendedCheckList = [];
    this.isOnBehalf = 0;
    this.presentLoading().then(preLoad => {
      this.httpDigital.getScheduleHistory(date).subscribe({
        next:(data) => {
          console.log(data);
          if (data.status) {
            this.allChecklist = data.data;
            this.assignCheckList = this.allChecklist.filter((val: any) => val.schedule_status == 'assigned');
            this.attendedCheckList = this.allChecklist.filter((val: any) => val.schedule_status == 'attended');
            this.isOnBehalf = 0;
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
          // let todayDate = moment().format('YYYY-MM-DD'), lastCheckListDate = localStorage.getItem('lastCheckListDate');
          // if (lastCheckListDate != todayDate) {
          //   localStorage.setItem('lastCheckListDate', '');
          //   localStorage.setItem('checkListData', '');
          //   this.getOfflineCheckListFromServer();
          // }
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

  getOfflineCheckListFromServer() {
    this.presentLoading('Checklist save in offline. it may take time').then(preLoad => {
      this.httpDigital.getOfflineCheckListFromServer().subscribe({
        next:(data: any) => {
          localStorage.setItem('lastCheckListDate', moment().format('YYYY-MM-DD'));
          localStorage.setItem('checkListData', JSON.stringify(data));
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

  getScheduleUsingBarcode(loc_id: any) {
    this.isOnBehalf = 0;
    this.assignCheckList = [];
    this.attendedCheckList = [];
    this.presentLoading().then(preLoad => {
      this.httpDigital.getSceduleMissed(loc_id).subscribe(data => {
        console.log(data);
        this.dismissloading();
        if (data.status) {
          this.isOnBehalf = 1;
          this.allChecklist = data.data;
          this.assignCheckList = this.allChecklist.filter((val: any) => val.schedule_status == 'assigned');
          this.attendedCheckList = this.allChecklist.filter((val: any) => val.schedule_status == 'attended');
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      }, err => {
        this.dismissloading();
      })
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
    // console.log(this.selectedDate + '=' + ev.target.value);
    // return;
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
    this.getSchedule(dat.fulldate);
  }


  openFillReport(data: any) {
    if (!data.barcode || data.schedule_status === 'attended') {
      this.router.navigateByUrl('/digital-checklist/fill-report/' + data.schedule_id + '/' + this.isOnBehalf);
    } else {
      this.qrType = data.schedule_id;
      this.router.navigateByUrl('/barcode');
    }
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
      console.log('nx');
      let next = moment(this.selectedDate).add(1, 'day').format('YYYY-MM-DD');
      this.selectedDate = next;
      this.getSchedule(this.selectedDate);
    } else {
      console.log('pre');
      let prev = moment(this.selectedDate).subtract(1, 'day').format('YYYY-MM-DD');
      this.selectedDate = prev;
      this.getSchedule(this.selectedDate);
    }
  }


  openBarcode() {
    this.allChecklist = [];
    this.qrType = 'otherbarcode';
    this.router.navigateByUrl('/barcode');
  }
}
