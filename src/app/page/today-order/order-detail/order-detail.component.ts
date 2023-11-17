import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoadingController, NavController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
})
export class OrderDetailComponent  implements OnInit {
  requestedData: any = [];
  // order_details: any = [{
  //   item_code: 'Cambro - 442626',
  //   item_name: 'Shahi Paneer',
  //   item_qty: '15kg',
  //   cat: 'veg',
  //   status: 'pending',
  //   cat_img: 'assets/meal/veg.png'
  // },{
  //   item_code: 'Cambro - 442627',
  //   item_name: 'Shahi Paneer',
  //   item_qty: '15kg',
  //   cat: 'veg',
  //   status: 'picked',
  //   cat_img: 'assets/meal/non-veg.png'
  // },{
  //   item_code: 'Cambro - 442626',
  //   item_name: 'Shahi Paneer',
  //   item_qty: '15kg',
  //   cat: 'veg',
  //   status: 'pending',
  //   cat_img: 'assets/meal/veg.png'
  // },{
  //   item_code: 'Cambro - 442626',
  //   item_name: 'Shahi Paneer',
  //   item_qty: '15kg',
  //   cat: 'veg',
  //   status: 'picked',
  //   cat_img: 'assets/meal/non-veg.png'
  // },{
  //   item_code: 'Cambro - 442626',
  //   item_name: 'Shahi Paneer',
  //   item_qty: '15kg',
  //   cat: 'veg',
  //   status: 'pending',
  //   cat_img: 'assets/meal/veg.png'
  // },{
  //   item_code: 'Cambro - 442627',
  //   item_name: 'Shahi Paneer',
  //   item_qty: '15kg',
  //   cat: 'veg',
  //   status: 'picked',
  //   cat_img: 'assets/meal/non-veg.png'
  // },{
  //   item_code: 'Cambro - 442626',
  //   item_name: 'Shahi Paneer',
  //   item_qty: '15kg',
  //   cat: 'veg',
  //   status: 'pending',
  //   cat_img: 'assets/meal/veg.png'
  // },{
  //   item_code: 'Cambro - 442626',
  //   item_name: 'Shahi Paneer',
  //   item_qty: '15kg',
  //   cat: 'veg',
  //   status: 'picked',
  //   cat_img: 'assets/meal/non-veg.png'
  // }]
  order_details: any = [];
  isAllFull!: boolean;
  loading: any;
  constructor(
    private activeRoute: ActivatedRoute,
    private httpTo: TodayOrderService,
    private loadingController: LoadingController,
    private common: CommonService,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    this.activeRoute.queryParams.subscribe((res) => {
      this.requestedData = JSON.parse(res['data']);
      console.log(this.requestedData);
    });
    this.getOrderDetail();
  }

  getOrderDetail() {
    this.presentLoading().then(preLoad => {
      this.httpTo.getTodayOrderDetail(this.requestedData.order_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.order_details = data.data;
            console.log(this.order_details);
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

  pick(dat: any) {
    let result = 0;
    dat.isPick = true;
    for (var i = 0 ; i < this.order_details.length; i++) {
      if (!this.order_details[i].isPick) {
        result = result + 1;
      }
    }
    if (result > 0) {
      this.isAllFull = false;
    } else {
      this.isAllFull = true;
    }
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

  dispatchOrder() {
    this.presentLoading().then(preLoad => {
      this.httpTo.orderDispatch(this.requestedData.order_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.navCtrl.pop();
          } else {
            this.common.presentToast(data.msg, 'danger');
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
}
