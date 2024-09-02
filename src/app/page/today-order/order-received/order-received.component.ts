import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, NavController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { MyAssetGetService } from 'src/app/provider/my-asset-get/my-asset-get.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-order-received',
  templateUrl: './order-received.component.html',
  styleUrls: ['./order-received.component.scss'],
})

export class OrderReceivedComponent  implements OnInit {
  order_details: any = [];
  updateArr: any = [];
  requestedData: any  = [];
  loading: any;
  index1!: number;
  index2!: number;
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
      this.common.setBarcode('');
      let decBarcode = this.common.decryptValue(bar);
      if(this.updateArr[this.index1].data[this.index2].ext_asset_id === decBarcode) {
        this.updateArr[this.index1].data[this.index2].isReceivedEnable = true;
        this.updateArr[this.index1].data[this.index2].showErr = false;
        this.updateArr[this.index1].data[this.index2].received_qty = this.updateArr[this.index1].data[this.index2].dispatch_qty;
        this.updateArr[this.index1].data[this.index2].isReceivedEnable = true;
              //     this.order_details[this.index].isReceivedEnable = true;
              // this.order_details[this.index].showErr = false;
              // this.order_details[this.index].received_qty = this.order_details[this.index].dispatch_qty;
              // this.order_details[this.index].isScan = true;
      } else {
        this.common.presentToast('You are scanning wrong QR Code ' + decBarcode, 'warning');
      }
      // if (this.platform.is('capacitor')) {
      //   // this.getDecBarcode(bar)
      //   let decBarcode = this.common.decryptValue(bar);
      //   console.log(this.updateArr);
      //   console.log(this.updateArr[this.index1][this.index2]);
      // } else {
      //   // this.order_details[this.index].isReceivedEnable = true;
      //   // this.order_details[this.index].showErr = false;
      //   // this.order_details[this.index].received_qty = this.order_details[this.index].dispatch_qty;
      //   // this.order_details[this.index].isScan = true;
      //   setTimeout(() => {
      //     // this.order_details[this.index].isAutoFocus = true;
      //   }, 100);
      // }
    }
  }

  getDecBarcode(enc_barcode: string) {
    // this.presentLoading().then(preLoad => {
    //   this.httpAsset.getDecBarcode(enc_barcode).subscribe({
    //     next:(data) => {
    //       console.log(data);
    //       if (data.status) {
    //         let barcode = data.data.text;
    //         if (barcode === this.order_details[this.index].ext_asset_id) {
    //           this.order_details[this.index].isReceivedEnable = true;
    //           this.order_details[this.index].showErr = false;
    //           this.order_details[this.index].received_qty = this.order_details[this.index].dispatch_qty;
    //           this.order_details[this.index].isScan = true;
    //           setTimeout(() => {
    //             this.order_details[this.index].isAutoFocus = true;
    //           }, 100);
    //         } else {
    //           this.common.presentToast('Your are Scanning wrong QR Code', 'warning');
    //         }
    //       } else {
    //         this.common.presentToast(data.msg, 'warning');
    //       }
    //     },
    //     error:() => {
    //       this.dismissloading();
    //       this.common.presentToast(environment.errMsg, 'danger');
    //     },
    //     complete:() => {
    //       this.dismissloading();
    //     }
    //   })
    // })
  }

  ScanBarcode(i: number, j: number){

    if (this.requestedData.ord_status === 9) {
      // this.index = ind;
      console.log(i, j);
      this.index1 = i;
      this.index2 = j
      this.router.navigateByUrl('/barcode');
    } else {
      this.common.presentToast('you not receive order before reached', 'warning');
    }
  }

  inputQty(dat: any, ev: any) {
    console.log(dat);
    console.log(ev.target.value);
    if (ev.target.value < 0 || ev.target.value == 0) {
      dat.received_qty = 0
      return;
    }
    if (ev.target.value > dat.dispatch_qty) {
      this.common.presentToast('You can not enter more than order Qty ' + dat.dispatch_qty , 'warning');
      dat.received_qty = '';
      return
    }
    const value = ev.target.value;
    const decimalIndex = value.indexOf('.');
    if (decimalIndex !== -1 && value.length - decimalIndex - 1 > 2) {
        dat.received_qty = value.slice(0, decimalIndex + 2);
    }
  }

  getOrderDetail() {
    this.presentLoading().then(preLoad => {
      this.httpTo.getTodayOrderDetail(this.requestedData.order_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.order_details = data.data;
            for (var i = 0; i < this.order_details.length; i++) {
              this.order_details[i].received_temperature = this.order_details[i].temperature
              if (!this.order_details[i].received_qty ) {
                this.order_details[i].isRec = false;
                this.order_details[i].isReceivedEnable = this.order_details[i].pack_type === 1 ? true: false;
                this.order_details[i].received_qty = this.order_details[i].pack_type === 1 ? this.order_details[i].dispatch_qty: 0
              } else {
                this.order_details[i].already_rec = this.order_details[i].received_qty
                this.order_details[i].isReceivedEnable = true;
                this.order_details[i].isRec = true;
              }
            }
            this.updateArr = this.groupByItemName(this.order_details);
            console.log(this.updateArr);
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
    });
  }

  groupByItemName(items: any) {
    const grouped: { [key: string]: any } = {};

    items.forEach((item: any) => {
      if (!grouped[item.item_name]) {
        grouped[item.item_name] = {
          item_name: item.item_name,
          ext_asset_id: item.ext_asset_id,
          received_temperature: item.received_temperature,
          txn_id: item.txn_id,
          cat_image: item.cat_image,
          data: []
        };
      }
      grouped[item.item_name].data.push(item);
    });
    return Object.values(grouped);
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
    this.updateArr.forEach((element: any) => {
      console.log(element);
      if (!element.received_temperature) {
        this.common.presentToast('Please Receive Temperature for ' + element.item_name , 'warning');
        return;
      }
      for (var i = 0 ; i < element.data.length; i++) {
        if (!element.data[i].received_qty || element.data[i].received_qty == 0 || !element.data[i].isRec) {
          result = result + 1;
          element.data[i].showErr = true
        } else {
          element.data[i].showErr = false
        }
      }
    });
    if (result > 0) {
      this.common.presentToast('Please Receive All Qty', 'warning');
      return;
    } else {
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

  changeFun(dat: any) {
    if (dat.received_qty &&  (dat.already_rec == dat.received_qty)) {
      dat.isRec = true;
      return;
    }
    dat.isRec = false;
    dat.isScan = true;
  }

  changeRecQty(dat: any) {
    if (dat.received_qty < 0) {
      this.common.presentToast(`You can't less than 0 qty`,  'warning');
      return;
    }

    if (dat.received_qty > dat.dispatch_qty) {
      this.common.presentToast(`You can't Receive more than Dispatch Qty ${dat.dispatch_qty}`, 'warning');
      return;
    }
    // console.log(dat);
    // return;
    this.presentLoading().then(preLoad => {
      this.httpTo.reciveOrder(dat).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            dat.already_rec = dat.received_qty;
            dat.isRec = true;
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

  updateTemp(dat: any) {
    if (!dat.received_temperature) {
      this.common.presentToast('Please Receive Temperature', 'warning');
      return;
    }
    const formData = new FormData();
    formData.append('temperature', dat.received_temperature);
    formData.append('txn_id', dat.txn_id);
    this.presentLoading().then(preLoad => {
      this.httpTo.updateTemp(formData).subscribe({
        next:(data: any) => {
          if (data.status) {
            dat.temperature_status = true
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
