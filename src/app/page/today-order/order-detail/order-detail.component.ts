import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, NavController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { MyAssetGetService } from 'src/app/provider/my-asset-get/my-asset-get.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
})
export class OrderDetailComponent  implements OnInit {
  requestedData: any = [];
  order_details: any = [];
  loading: any;
  index: any;
  decQr!: string;
  constructor(
    private activeRoute: ActivatedRoute,
    private httpTo: TodayOrderService,
    private loadingController: LoadingController,
    private common: CommonService,
    private navCtrl: NavController,
    private router: Router,
    private platform: Platform,
    private httpAsset: MyAssetGetService
  ) { }

  ngOnInit() {
    this.common.setBarcode('');
    this.activeRoute.queryParams.subscribe((res) => {
      this.requestedData = JSON.parse(res['data']);
      console.log(this.requestedData);
    });
    this.getOrderDetail();
  }

  ionViewDidEnter() {
    let bar = this.common.getBarcode();
    if (bar) {
      if (this.platform.is('capacitor')) {
        this.getDecBarcode(bar)
      } else {
        this.order_details[this.index].isPack = true;
        this.order_details[this.index].showErr = false;
      }
      this.common.setBarcode('');
    }
  }

  getDecBarcode(enc_barcode: string) {
    this.presentLoading().then(preLoad => {
      this.httpAsset.getDecBarcode(enc_barcode).subscribe({
        next:(data) => {
          console.log(data);
          if (data.status) {
            let barcode = data.data.text;
            if (barcode === this.order_details[this.index].ext_asset_id) {
              this.order_details[this.index].isPack = true;
            } else {
              this.common.presentToast('Your are Scanning wrong QR Code', 'warning');
            }
            // let temp, firstDigit,lastDigit;
            // temp = data.data.text;
            // firstDigit = temp.slice(0, 4);
            // lastDigit = temp.slice(-6);

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

  // pick(dat: any) {
  //   let result = 0;
  //   dat.isPick = true;
  //   for (var i = 0 ; i < this.order_details.length; i++) {
  //     if (!this.order_details[i].isPick) {
  //       result = result + 1;
  //     }
  //   }
  //   if (result > 0) {
  //     this.isAllFull = false;
  //   } else {
  //     this.isAllFull = true;
  //   }
  // }

  scanBarcode(data: any,ind: any) {
    this.index = ind;
    this.decQr = data.qr_value;
    this.router.navigateByUrl('/barcode');
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
    if (this.order_details.length === 0) {
      this.common.presentToast('No Data Found', 'warning');
      return;
    }
    let result = 0;
    for (var i = 0;i < this.order_details.length; i++) {
      if (!this.order_details[i].isPack) {
        this.order_details[i].showErr = true;
        result = result + 1;
      } else {
        this.order_details[i].showErr = false;
      }
    }
    if (result > 0) {
      this.common.presentToast('Please Pick All Cambro Box', 'warning');
      return;
    }
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
