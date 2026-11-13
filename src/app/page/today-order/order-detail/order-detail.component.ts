import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, NavController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { MyAssetGetService } from 'src/app/provider/my-asset-get/my-asset-get.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';

import { ord_dispatch, db } from '../../../provider/local-db-dispatch/local-db-dispatch.service';
import { liveQuery } from 'dexie';
import * as moment from 'moment';
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
  isApiHit!: boolean;
  // decQr!: string;
  todayDate = moment().format('YYYY-MM-DD');
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
    db.orderDispatch.filter(order => order.date !== this.todayDate).delete().then(res => {
      this.getOrderDetail();
    })
  }

  ionViewDidEnter() {
    let bar = this.common.getBarcode();
    if (bar) {
      this.common.setBarcode('');
      let count = 0,barcode = this.common.decryptValue(bar);
      if (!this.index) {
        const check = this.order_details.filter((val: any) => val.ext_asset_id === barcode);
        if (check.length === 0) {
          this.common.presentToast(`You are scanning wrong cambro ` + barcode, 'warning');
          this.openScan();
          return;
        }

        for (var i = 0; i < this.order_details.length; i++) {
          if (this.order_details[i].ext_asset_id === barcode) {
            count = count + 1;
            if (this.order_details[i].isPack === true) {
              this.common.presentToast('Cambro No. ' + barcode + ' is already picked.. ', 'warning');
              this.openScan();
              return;
            } else {
              this.updateInLocalDb(i, 0);
            }
          }
        }
      } else {
        if (barcode === this.order_details[this.index].ext_asset_id) {
          this.updateInLocalDb(this.index, 1);
        } else {
          this.common.presentToast('You are scan wrong QR Code ' + barcode, 'warning');
        }        
      }

    }
  }

  updateInLocalDb(ind: number, type_id: number) {
    this.order_details[ind].isPack = true;
    const arr = this.order_details.filter((val: any) => val.isPack) || [];
    if (arr.length === this.order_details.length) {
      this.common.presentToast('All Receipe Packed Successfully', 'success');
      return
    } else {
      const obj: any = [];
      for (var i = 0; i < arr.length;i++) {
        obj.push({
          order_id: arr[i].order_id,
          txn_id: arr[i].txn_id,
          isPack: arr[i].isPack,
          date: this.todayDate
        })
      }
      db.orderDispatch.where({order_id: this.requestedData.order_id}).delete().then(delRes => {
        db.orderDispatch.bulkAdd(obj).then(res => {
          if (type_id === 0) {
            this.openScan();
            return
          }
        });
      })
    }
  }

  getOrderDetail() {
    this.presentLoading().then(preLoad => {
      this.httpTo.getTodayOrderDetail(this.requestedData.order_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.order_details = data.data;

            this.getOffLineAssetList();
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.isApiHit = true
          this.dismissloading();
        }
      })
    })
  }

  async getOffLineAssetList() {
    const friendsObservable = liveQuery (() => db.orderDispatch.where({order_id: this.requestedData.order_id}).toArray());
    const sub = friendsObservable.subscribe({
      next:(data) => {
        const localData = data;
        this.order_details = this.order_details.map((item1: any) => {
          const matchingItem = localData.find(item2 => item2.txn_id === item1.txn_id);
          if (matchingItem) {
            return { ...item1, isPack: true };
          }
          return item1;
        });
        setTimeout(() => {
          sub.unsubscribe();
        }, 1000);
      }
    });
  }

  scanBarcode(data: any,ind: any) {
    this.index = ind;
    // this.decQr = data;
    this.router.navigateByUrl('/barcode');
  }

  openScan() {
    this.index = null;
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

  dummy() {
    if (!this.platform.is('capacitor')) {
      for (var i = 0; i < this.order_details.length; i++) {
        this.order_details[i].isPack = true;
      }
    }
  }
}
