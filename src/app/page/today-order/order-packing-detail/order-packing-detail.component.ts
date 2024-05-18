import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-order-packing-detail',
  templateUrl: './order-packing-detail.component.html',
  styleUrls: ['./order-packing-detail.component.scss'],
})
export class OrderPackingDetailComponent  implements OnInit {
  requestedData: any = [];
  loading: any;
  orderArr: any = [];
  basicDetails: any = {};
  driverArr: any = [];
  constructor(
    private activeRoute: ActivatedRoute,
    private httpTo: TodayOrderService,
    private loadingController: LoadingController,
    private common: CommonService
  ) { }

  ngOnInit() {
    this.activeRoute.queryParams.subscribe((res) => {
      this.requestedData = JSON.parse(res['data']);
      console.log(this.requestedData);
      this.getDispathOrderDetail(this.requestedData.order_id);
    });
  }

  getDispathOrderDetail(order_id: any) {
    this.presentLoading().then(preLoad => {
      this.httpTo.getDispathOrderDetail(order_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.basicDetails = data.data;
            this.orderArr = data.txn_data;
            console.log(this.basicDetails);
            console.log(this.orderArr);
            this.getCamroByPc(this.basicDetails.cpu_pc_id);
            this.getDriverByPc(this.basicDetails.pc_id);
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

  getCamroByPc(pc_id: string) {
    this.httpTo.getCambroByPC(pc_id).subscribe({
      next:(data) => {
        console.log(data);
        if (data.status) {
          this.driverArr = data.data;
        }
      },
      error:() => {

      },
      complete:() => {

      }
    })
  }

  getDriverByPc(pc_id: string) {
    this.httpTo.getDriverByPc(pc_id).subscribe({
      next:(data) => {
        console.log(data);
      },
      error:() => {

      },
      complete:() => {

      }
    })
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

  packAction() {

  }



}
