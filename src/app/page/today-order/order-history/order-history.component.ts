import { Component, OnInit, ViewChild } from '@angular/core';
import { Route, Router } from '@angular/router';
import { IonSlides, LoadingController } from '@ionic/angular';
import * as moment from 'moment';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-order-history',
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.scss'],
})
export class OrderHistoryComponent  implements OnInit {
  @ViewChild(IonSlides) slides!: IonSlides;
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
  history: any = [];
  isApiHit!: boolean
  id!: string;
  loading: any;
  constructor(
    private router: Router,
    private httpTo: TodayOrderService,
    private loadingController: LoadingController,
    private common: CommonService
  ) { }

  ngOnInit() {
    let start: any, end: any;
    end = moment().endOf('month').format('DD');
    let status, index = 0;
    for (let i = 1; i <= end ; i++) {
      if (moment().format('YYYY-MM-DD') ==  moment().startOf('month').add(i - 1, 'day').format('YYYY-MM-DD')) {
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
    this.getOrderHistory(moment().format('YYYY-MM-DD'));
  }

  changeDate(dat: any) {
    this.slides.slideTo(dat.ind - 3);
    for (var i = 0 ; i < this.dateArr.length; i++) {
      if (dat.date == this.dateArr[i].date) {
        this.dateArr[i].isSelect= true
        console.log(this.dateArr[i]);
        this.getOrderHistory(this.dateArr[i].fulldate);
      } else {
        this.dateArr[i].isSelect= false
      }
    }
  }

  status() {

  }

  getOrderHistory(date: string) {
    const data = {
      sdate: date,
      edate: date
    }
    this.presentLoading().then(preLoad => {
      this.httpTo.getOrderHistory(data).subscribe({
        next:(data) => {
          console.log(date);
          if (data.status) {
            this.history = data.data.data
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.dismissloading();
        },complete:() => {
          this.isApiHit = true;
          this.dismissloading();
        }
      });
    })

  }

  async presentLoading(msg?: any) {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please Wait...',
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  orderDetails(data: any) {
    this.router.navigate(['/today-order/order-history-detail'], {
      queryParams: {
        data: JSON.stringify(data),
      }
    });
  }

}
