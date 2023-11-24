import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, ModalController, NavController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';
import { DriverDetailComponent } from './driver-detail/driver-detail.component';
import { LaunchNavigator } from '@awesome-cordova-plugins/launch-navigator/ngx';

@Component({
  selector: 'app-today-order',
  templateUrl: './today-order.page.html',
  styleUrls: ['./today-order.page.scss'],
})
export class TodayOrderPage implements OnInit {
  // todayOrder: any = [{
  //   order_id: 'OD1982',
  //   pick_time: '11:00',
  //   delivery_time: '12:30',
  //   box: '125/05',
  //   pc: '100023',
  //   location: 'Google Campus',
  //   color: 'danger'
  // },{
  //   order_id: 'OD1982',
  //   pick_time: '11:00',
  //   delivery_time: '12:30',
  //   box: '125/05',
  //   pc: '100023',
  //   location: 'Google Campus',
  //   color: 'warning'
  // },{
  //   order_id: 'OD1982',
  //   pick_time: '11:00',
  //   delivery_time: '12:30',
  //   box: '125/05',
  //   pc: '100023',
  //   location: 'Google Campus',
  //   color: 'success'
  // },{
  //   order_id: 'OD1982',
  //   pick_time: '11:00',
  //   delivery_time: '12:30',
  //   box: '125/05',
  //   pc: '100023',
  //   location: 'Google Campus',
  //   color: 'tertiary'
  // },{
  //   order_id: 'OD1982',
  //   pick_time: '11:00',
  //   delivery_time: '12:30',
  //   box: '125/05',
  //   pc: '100023',
  //   location: 'Google Campus',
  //   color: 'danger'
  // },{
  //   order_id: 'OD1982',
  //   pick_time: '11:00',
  //   delivery_time: '12:30',
  //   box: '125/05',
  //   pc: '100023',
  //   location: 'Google Campus',
  //   color: 'medium'
  // },{
  //   order_id: 'OD1982',
  //   pick_time: '11:00',
  //   delivery_time: '12:30',
  //   box: '125/05',
  //   pc: '100023',
  //   location: 'Google Campus',
  //   color: 'danger'
  // },{
  //   order_id: 'OD1982',
  //   pick_time: '11:00',
  //   delivery_time: '12:30',
  //   box: '125/05',
  //   pc: '100023',
  //   location: 'Google Campus',
  //   color: 'danger'
  // },{
  //   order_id: 'OD1982',
  //   pick_time: '11:00',
  //   delivery_time: '12:30',
  //   box: '125/05',
  //   pc: '100023',
  //   location: 'Google Campus',
  //   color: 'secondary'
  // }];
  todayOrder: any = [];
  id: any;
  loading: any
  constructor(
    private router: Router,
    private activeRoute: ActivatedRoute,
    private httpTo: TodayOrderService,
    private loadingController: LoadingController,
    private common: CommonService,
    private modalCtrl: ModalController,
    private launchNavigator: LaunchNavigator,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    this.id = this.activeRoute.snapshot.paramMap.get('id');
    console.log(this.id);

  }

  ionViewDidEnter() {
    this.getDriverTodayOrder(this.id)
  }

  getDriverTodayOrder(id: string) {
    this.todayOrder = [];
    this.presentLoading().then(preLoad => {
      this.httpTo.getTodayOrderDriver(id).subscribe({
        next:(data) => {
          if (data.status) {
            this.todayOrder = data.data;
          } else {
            this.common.presentToast(data.msg , 'warning');
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

  async openDriverModal(dat: any) {
    console.log('my site');
    const modal = await this.modalCtrl.create({
      component: DriverDetailComponent,
      cssClass: 'my-modal2',
      componentProps: { requestedData: dat }
    });
    modal.present();
  }

  openGoogleMap(lat: any, lng: any) {
    console.log(lat);
    if (!lat || !lng) {
      alert('Latitude and Longitude not availabe');
      return;
    }
    this.launchNavigator.navigate([parseFloat(lat), parseFloat(lng)], {
      start: [28.65137795955116, 77.27685944140623]
    }).catch(err => {
      alert(JSON.stringify(err));
    });
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

  orderReached(data: any) {
    if (data.ord_status === 9) {
      this.common.presentToast('Order Already Reached on site', 'warning');
      return;
    }
    this.presentLoading().then(preLoad => {
      this.httpTo.orderReached(data.order_id).subscribe({
        next:(res) => {
          if (res.status) {
            this.common.presentToast(res.msg,'success');
            data.ord_status = 9;
            data.order_status_label = 'Reached on site';
          } else {
            this.common.presentToast(res.msg, 'warning')
          }
        },
        error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.dismissloading();
        },
        complete:() => {
          this.dismissloading();
        }
      })
    })

  }



  viewBox(data: any) {
    if (this.id === '1') {
      this.router.navigate(['/today-order/order-detail'], {
        queryParams: {
          data: JSON.stringify(data),
        }
      });
    } else if (this.id === '2') {
      // this.router.navigateByUrl('/today-order/order-received');
      this.router.navigate(['/today-order/order-received'], {
        queryParams: {
          data: JSON.stringify(data),
        }
      });
    }
  }

  history() {
    this.router.navigateByUrl('/today-order/order-history');
  }

  orderReceived() {
    this.router.navigateByUrl('/today-order/order-received');
  }

}
