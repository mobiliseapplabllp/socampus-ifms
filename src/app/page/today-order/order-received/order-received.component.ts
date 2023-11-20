import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, NavController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-order-received',
  templateUrl: './order-received.component.html',
  styleUrls: ['./order-received.component.scss'],
})
export class OrderReceivedComponent  implements OnInit {
  order_details: any = [];
  requestedData: any  = [];
  loading: any;
  index: any;
  constructor(
    private activeRoute: ActivatedRoute,
    private httpTo: TodayOrderService,
    private loadingController: LoadingController,
    private common: CommonService,
    private navCtrl: NavController,
    private router: Router,
    private platform: Platform

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
        if (this.order_details[this.index].qr_value === bar) {
          this.order_details[this.index].isReceivedEnable = true;
          this.order_details[this.index].showErr = false;
          setTimeout(() => {
            this.order_details[this.index].isAutoFocus = true;
          }, 100);
        } else {
          this.common.presentToast('Your are Scanning wrong QR Code', 'warning');
        }
      } else {
        this.order_details[this.index].isReceivedEnable = true;
        this.order_details[this.index].showErr = false;
        setTimeout(() => {
          this.order_details[this.index].isAutoFocus = true;
        }, 100);
      }
      this.common.setBarcode('');
    }
  }

  ScanBarcode(dat: any, ind: any){
    if (this.requestedData.ord_status === 9) {
      this.index = ind;
      this.router.navigateByUrl('/barcode');
    } else {
      this.common.presentToast('you not receive order before reached', 'warning');
    }

  }

  inputQty(dat: any, ev: any) {
    console.log(dat);
    console.log(ev.target.value);
    if (ev.target.value > dat.dispatch_qty) {
      this.common.presentToast('You can not enter more than order Qty ' , 'warning');
      dat.received_qty = '';
    }
  }

  getOrderDetail() {
    this.presentLoading().then(preLoad => {
      this.httpTo.getTodayOrderDetail(this.requestedData.order_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.order_details = data.data;
            for (var i = 0; this.order_details.length; i++) {
              if (this.order_details[i].received_qty == 0) {
                this.order_details[i].isReceivedEnable = false;
                this.order_details[i].isReceived = false;
              } else {
                this.order_details[i].isReceivedEnable = true;
                this.order_details[i].isReceived = true;
              }
            }
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
      if (!this.order_details[i].received_qty) {
        result = result + 1;
        this.order_details[i].showErr = true
      } else {
        this.order_details[i].showErr = false
      }
    }
    if (result > 0) {
      this.common.presentToast('Please Receive All Qty', 'warning');
      return;
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
            dat.isReceived = true;
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
