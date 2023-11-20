import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-order-history-detail',
  templateUrl: './order-history-detail.component.html',
  styleUrls: ['./order-history-detail.component.scss'],
})
export class OrderHistoryDetailComponent  implements OnInit {
  order_details: any = [{
    item_code: 'Cambro - 442626',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'pending',
    cat_img: 'assets/meal/veg.png'
  },{
    item_code: 'Cambro - 442627',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'completed',
    cat_img: 'assets/meal/non-veg.png'
  },{
    item_code: 'Cambro - 442626',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'pending',
    cat_img: 'assets/meal/veg.png'
  },{
    item_code: 'Cambro - 442626',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'completed',
    cat_img: 'assets/meal/non-veg.png'
  },{
    item_code: 'Cambro - 442626',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'pending',
    cat_img: 'assets/meal/veg.png'
  },{
    item_code: 'Cambro - 442627',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'completed',
    cat_img: 'assets/meal/non-veg.png'
  },{
    item_code: 'Cambro - 442626',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'pending',
    cat_img: 'assets/meal/veg.png'
  },{
    item_code: 'Cambro - 442626',
    item_name: 'Shahi Paneer',
    item_qty: '15kg',
    cat: 'veg',
    status: 'completed',
    cat_img: 'assets/meal/non-veg.png'
  }];
  loading: any;
  requestedData: any = [];
  myData: any = [];
  constructor(
    private activeRoute: ActivatedRoute,
    private loadingController: LoadingController,
    private httpTo: TodayOrderService,
    private common: CommonService
  ) { }

  ngOnInit() {
    this.activeRoute.queryParams.subscribe((res) => {
      this.requestedData = JSON.parse(res['data']);
      console.log(this.requestedData);
      this.getOrderHistoryDetail();
    });
  }

  getOrderHistoryDetail() {
    this.presentLoading().then(preLoad => {
      this.httpTo.getOrderDetailView(this.requestedData.order_id).subscribe({
        next:(data) => {
          console.log(data);
          if (data.status) {
            this.myData = data.data;
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
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }



}
