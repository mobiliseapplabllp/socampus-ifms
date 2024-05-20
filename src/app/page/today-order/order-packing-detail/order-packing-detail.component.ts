import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, LoadingController, ModalController, NavController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';
import { OrderPackingModalComponent } from '../order-packing-modal/order-packing-modal.component';
import { MyAssetGetService } from 'src/app/provider/my-asset-get/my-asset-get.service';
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
  cambroArr: any = [];
  scanValue = 0;
  scanData: any = {};
  isModalOpen = false;
  packCambro: any = {};
  constructor(
    private activeRoute: ActivatedRoute,
    private httpTo: TodayOrderService,
    private loadingController: LoadingController,
    private common: CommonService,
    private actionSheetCtrl: ActionSheetController,
    private router: Router,
    private modalCtrl: ModalController,
    private httpAsset: MyAssetGetService,
    private modal: ModalController,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    this.activeRoute.queryParams.subscribe((res) => {
      this.requestedData = JSON.parse(res['data']);
    });
    this.getDispathOrderDetail(this.requestedData.order_id);
  }

  ionViewDidEnter() {
    let bar = this.common.getBarcode();
    if (bar) {
      this.getDecBarcode(bar);
    }
  }

  getDecBarcode(enc_barcode: string) {
    this.presentLoading().then(preLoad => {
      this.httpAsset.getDecBarcode(enc_barcode).subscribe({
        next:(data) => {
          console.log(data);
          if (data.status) {
            // let tempQR = data.data.text;
            let tempQR = '1016000001'
            const obj = this.cambroArr.filter((val: any) => val.ext_asset_id === tempQR);
            if (obj.length > 0) {
              this.openModal(obj[0])
            } else {
              this.common.presentToast(`You are Scanning Wrong QR ${tempQR}`, 'warning')
            }
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

  async openModal(obj: Object) {
    const modal = await this.modalCtrl.create({
      component: OrderPackingModalComponent,
      cssClass: 'my-modal',
      backdropDismiss:false,
      componentProps: {
        scanData: this.scanData,
        cambroData: obj
      }
    });
    modal.onWillDismiss().then((disModal: any) => {
      console.log(disModal);
      if (disModal.role == true) {
        this.getDispathOrderDetail(this.requestedData.order_id);
      }
    });
    modal.present();
  }

  setOpen(val: any, data: any, isOpen: boolean) {
    this.packCambro = val;
    this.packCambro.item_name = data.item_name;
    this.isModalOpen = isOpen;
  }

  finalPack() {
    this.presentLoading().then(preLoad => {
      const obj = [{order_id: this.requestedData.order_id}];
      this.httpTo.actionOrderPack(obj).subscribe({
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
    });
  }

  onWillDismiss(){
    this.isModalOpen = false
  }

  getDispathOrderDetail(order_id: any) {
    this.presentLoading().then(preLoad => {
      this.httpTo.getDispathOrderDetail(order_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.basicDetails = data.data;
            this.orderArr = data.txn_data;
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

  updateTemperature(dat: any) {
    console.log(dat);
    const obj = {
      temperature: dat.temperature,
      txn_id: dat.txn_id
    }
    this.presentLoading().then(preLoad => {
      this.httpTo.updateTemperature(obj).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            dat.is_temperature = true
          } else {
            this.common.presentToast(data.msg, 'warning');
            dat.is_temperature = false
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

  getCamroByPc(pc_id: string) {
    this.cambroArr = [];
    this.httpTo.getCambroByPC(pc_id).subscribe({
      next:(data) => {
        if (data.status) {
          this.cambroArr = data.data;
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

  async presentActionSheet(dat: any) {
    const actionSheet = await this.actionSheetCtrl.create({
      mode: 'ios',
      buttons: [{
        text: 'Scan Cambro Box',
        handler:() => {
          this.action(1, dat);
        }
      },{
        text: 'Scan Tray',
        handler:() => {
          this.action(2, dat);
        }
      },{
        text: 'Cancel',
        role: 'cancel',
        handler:() => {
        }
      }],
    });
    actionSheet.present();
  }

  action(val: number, data: any) {
    this.scanValue = val;
    this.scanData = data;
    this.router.navigateByUrl('/barcode');
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

  cancel() {
    this.modal.dismiss(null, 'cancel');
  }

  confirm() {
    this.modal.dismiss(null, 'confirm');
  }


}
