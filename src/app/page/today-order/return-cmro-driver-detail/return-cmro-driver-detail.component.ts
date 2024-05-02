import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { MyAssetGetService } from 'src/app/provider/my-asset-get/my-asset-get.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-return-cmro-driver-detail',
  templateUrl: './return-cmro-driver-detail.component.html',
  styleUrls: ['./return-cmro-driver-detail.component.scss'],
})
export class ReturnCmroDriverDetailComponent  implements OnInit {
  id: any;
  type: any;
  cambroList: any  = [];
  loading: any;
  constructor(
    private activeRoute: ActivatedRoute,
    private httpTo: TodayOrderService,
    private common: CommonService,
    private loadingController: LoadingController,
    private navCtrl: NavController,
    private router: Router,
    private httpAsset: MyAssetGetService,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.id = this.activeRoute.snapshot.paramMap.get('id'); // id is return_id
    this.type = this.activeRoute.snapshot.paramMap.get('type'); // 1 for driver 2 for cpu
    this.getCambroReturnDetails();
  }

  ionViewDidEnter() {
    let bar = this.common.getBarcode();
    if (bar) {
      this.common.setBarcode('');
      this.getDecBarcode(bar);
    }
  }

  getDecBarcode(enc_barcode: string) {
    this.presentLoading().then(preLoad => {
      this.httpAsset.getDecBarcode(enc_barcode).subscribe({
        next:(data) => {
          if (data.status) {
            let decBarcode = data.data.text;
            this.cambroPicked(decBarcode);
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.dismissloading();
        },
        complete:() => {
          this.dismissloading();
        }
      });
    })
  }

  cambroPicked(decBarcode: string) {
    let isFound = false;
    for (var i  = 0; i < this.cambroList.length; i++) {
      if (this.cambroList[i].ext_asset_id === decBarcode) {
        this.cambroList[i].isPack = true;
        isFound = true;
        this.common.presentToast('QR Found Successfully,', 'success');
        this.repeatLoop();
        return;
      } else if (i === this.cambroList.length - 1 && !isFound) {
        this.presentAlertConfirm();
      }
    }
  }

  async presentAlertConfirm() {
    const confirm = await this.alertCtrl.create({
      header: 'Not Found.',
      message: 'This QR Not Found.. Do you want to Try again!!!',
      buttons: [{
        text: 'Disagree',
        handler: () => {
          console.log('Disagree clicked');
        }
      }, {
        text: 'Agree',
        handler: () => {
          this.repeatLoop();
        }
      }]
    });
    await confirm.present();
  }

  repeatLoop() {
    let checkEmpty = this.cambroList.filter((val: any) => !val.isPack);
    if (checkEmpty.length > 0) {
      this.scanBarcode();
    } else {
      this.common.presentToast('All Cambro Packed, please final Submit', 'tertiary');
    }
  }

  getCambroReturnDetails() {
    this.presentLoading().then(preLoad => {
      this.httpTo.getReturnCambroDetails(this.id).subscribe({
        next:(data) => {
          if (data.status) {
            this.cambroList = data.data;
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

  async presentLoading() {
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

  dispathCambro(){
    this.presentLoading().then(preLoad => {
      this.httpTo.dispatchCambro(this.id).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.navCtrl.pop();
          } else {
            this.common.presentToast(data.msg, 'warning')
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

  receiveCambro() {
    this.presentLoading().then(preLoad => {
      this.httpTo.receiveCambro(this.id).subscribe({
        next:(data) => {
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

  scanBarcode() {
    this.router.navigateByUrl('/barcode');
  }
}
