import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonDatetime, IonSlides, LoadingController, ModalController } from '@ionic/angular';
import * as moment from 'moment';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';
import { CkmsSiteComponent } from '../ckms-site/ckms-site.component';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';

@Component({
  selector: 'app-ckms-dashboard',
  templateUrl: './ckms-dashboard.component.html',
  styleUrls: ['./ckms-dashboard.component.scss'],
})
export class CkmsDashboardComponent  implements OnInit {
  @ViewChild(IonSlides) slides!: IonSlides;
  @ViewChild('popoverDatetime')  popoverDatetime!: IonDatetime;
  segment = 'preparing';
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
  orderConfirm: any = [];
  orderPack: any = [];
  orderDispatch: any = [];
  orderReceived: any = [];
  loading: any;
  orderConfirmation: any = [];
  isFilter!: boolean;
  pc_id_desc!: string;
  pc_id!: any;
  type_id: any;
  mealType: any = [];
  selectedDate!: string;
  todayDate!: string;
  constructor(
    private loadingController: LoadingController,
    private httpTo: TodayOrderService,
    private common: CommonService,
    private router: Router,
    private modalCtrl: ModalController,
    private httpComplaint: ComplaintService
  ) { }

  ngOnInit() {
    this.selectedDate = moment().format('YYYY-MM-DD');
    this.todayDate = this.selectedDate;
    const obj = {
      date: moment().format('YYYY-MM-DD')
    }
    this.getOrderDetails(obj);
    this.getMealType();
    this.scrollCalendar(this.selectedDate);
  }

  scrollCalendar(selectedDate: string) {
    let start: any, end: any;
    end = moment().endOf('month').format('DD');
    let status, index = 0;
    for (let i = 1; i <= end ; i++) {
      if (selectedDate ==  moment().startOf('month').add(i - 1, 'day').format('YYYY-MM-DD')) {
        status = true;
        index = i;
      } else {
        status = false
      }
      this.dateArr.push({
        date: moment().startOf('month').add(i - 1, 'day').format('DD'),
        day: moment().startOf('month').add(i - 1, 'day').format('dddd')[0],
        isSelect: status,
        ind: i,
        fulldate : moment().startOf('month').add(i - 1, 'day').format('YYYY-MM-DD')
      })
    }
    setTimeout(() => {
      this.slides.slideTo(index - 3);
    }, 50);
  }

  getMealType() {
    this.httpComplaint.getMealType().subscribe({
      next:(data) => {
        if (data.status) {
          this.mealType = data.data;
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      },
      error:() => {
        this.common.presentToast(environment.errMsg + 'Err: Meal Type Error', 'danger');
      }
    })
  }

  changeDate(dat: any) {
    this.pc_id = '';
    this.pc_id_desc = '';
    this.type_id = '';
    this.slides.slideTo(dat.ind - 3);
    for (var i = 0 ; i < this.dateArr.length; i++) {
      if (dat.date == this.dateArr[i].date) {
        this.dateArr[i].isSelect= true
        this.selectedDate = this.dateArr[i].fulldate
        const obj = {
          date: this.dateArr[i].fulldate
        }
        this.getOrderDetails(obj);

      } else {
        this.dateArr[i].isSelect= false
      }
    }
  }

  search() {
    const obj = {
      pc_id: this.pc_id ?? '',
      type_id: this.type_id ?? '',
      date: this.selectedDate
    }
    console.log(obj);
    this.getOrderDetails(obj);
  }

  async openCkmsSite() {
    const modal = await this.modalCtrl.create({
      component: CkmsSiteComponent,
      cssClass: 'my-modal',
      backdropDismiss:false,
      componentProps: { }
    });
    modal.onWillDismiss().then(disModal => {
      console.log(disModal);
      if (disModal.role) {
        this.pc_id_desc = disModal.data.label;
        this.pc_id = disModal.data.value
      }
    });
    modal.present();
  }

  changeDateComponent(ev: any) {
    this.pc_id = '';
    this.pc_id_desc = '';
    this.type_id = '';
    let index, dat ,temp = moment(ev.detail.value).format('YYYY-MM-DD');
    for (var i = 0 ; i < this.dateArr.length; i++) {
      if (temp == this.dateArr[i].fulldate) {
        this.dateArr[i].isSelect= true
        this.selectedDate = this.dateArr[i].fulldate
        this.slides.slideTo(this.dateArr[i].ind - 3);
      } else {
        this.dateArr[i].isSelect= false
      }
    }
    this.popoverDatetime.confirm(true);
    this.selectedDate = moment(ev.detail.value).format('YYYY-MM-DD');
    const obj = {
      date: this.selectedDate
    }
    this.getOrderDetails(obj);

  }

  getOrderDetails(obj: Object) {
    this.orderConfirm = [];
    this.orderPack = [];
    this.orderDispatch = [];
    this.orderReceived = [];
    this.presentLoading().then(preLoad => {
      this.httpTo.getOrderForDispatch(obj).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.orderConfirm = data.data.OrderConfirm;
            this.orderPack = data.data.OrderPacked;
            this.orderDispatch = data.data.OrderDispatch;
            this.orderReceived = data.data.OrderReceived

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
      })
    })
  }

  openConfirmPage(dat: any) {
    this.router.navigate(['/today-order/order-pack-detail'], {
      queryParams: {
        data: JSON.stringify(dat),
      }
    });
  }

  orderDetails(data: any) {
    this.router.navigate(['/today-order/order-detail'], {
      queryParams: {
        data: JSON.stringify(data),
      }
    });
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...'
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

}
