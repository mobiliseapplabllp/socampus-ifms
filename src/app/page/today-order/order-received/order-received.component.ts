import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoadingController, NavController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-order-received',
  templateUrl: './order-received.component.html',
  styleUrls: ['./order-received.component.scss'],
})
export class OrderReceivedComponent  implements OnInit {
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
  //   status: 'completed',
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
  //   status: 'completed',
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
  //   status: 'completed',
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
  //   status: 'completed',
  //   cat_img: 'assets/meal/non-veg.png'
  // }];
  order_details: any = [];
  requestedData: any  = [];
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


  async presentLoading(msg?: any) {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please Wait...',
      duration: 8000
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  submit() {
    let result = 0;
    console.log(this.order_details);
    for (var i = 0; i < this.order_details.length;i++) {
      if (!this.order_details[i].rec_qty) {
        result = result + 1;
        this.order_details[i].showErr = true
        break;
      } else {
        this.order_details[i].showErr = false
      }
    }
    if (result > 0) {
      this.common.presentToast('Please Receive All Qty', 'warning');
    } else {
      console.log('saved');
      this.finalOrder();

    }
  }

  finalOrder() {
    this.presentLoading().then(preLoad => {
      this.httpTo.reciveOrderFinal(this.requestedData.order_id).subscribe({
        next:(data) => {
          console.log(data);
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.navCtrl.pop();
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

  changeRecQty(dat: any) {
    console.log(dat);
    this.presentLoading().then(preLoad => {
      this.httpTo.reciveOrder(dat).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
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
}
