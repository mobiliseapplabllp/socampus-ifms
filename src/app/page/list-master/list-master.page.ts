import { Component, OnInit } from '@angular/core';
import { CommonService } from 'src/app/provider/common/common.service';
import { db } from '../../provider/local-db/local-db.service';
import { liveQuery } from 'dexie';
import { AlertController, LoadingController, ModalController, Platform, } from '@ionic/angular';
import { Router } from '@angular/router';
import { SosComponent } from './sos/sos.component';
import { App } from '@capacitor/app';
import { LoginService } from 'src/app/provider/login/login.service';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { take } from 'rxjs';
import { stat } from 'fs';
import { cordovaInstance } from '@awesome-cordova-plugins/core';
// CKMS - cambro QR scan
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { CambroStatusComponent } from './cambro-status/cambro-status.component';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-list-master',
  templateUrl: './list-master.page.html',
  styleUrls: ['./list-master.page.scss'],
})
export class ListMasterPage implements OnInit {
  notiticationCount = 0;
  userData: any = [];
  userName!: string;
  eventChange = false;
  didEnter = false;
  isLoading!: boolean;
  isInternet!: boolean;
  DGArr: any = [];
  subs: any;
  count = 0;
  appUpdate: any = {};
  currentVersion!: string;
  isAndroid!: boolean;
  isPunchIn = false;
  /** CKMS - QR se cambro status dekhna hai (barcode page se wapas aane par) */
  isScanQr!: boolean;
  loading: any;
  constructor(
    private common: CommonService,
    private alertController: AlertController,
    private router: Router,
    private modalCtrl: ModalController,
    private platform: Platform,
    private httpLogin: LoginService,
    private httpTo: TodayOrderService,
    private loadingController: LoadingController,
    private iab: InAppBrowser,) {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      this.userName = this.userData.user_name;      
    }
  }

  ngOnInit(): void {
    this.common.getAppVersionObs().pipe(take(1)).subscribe(data => {
      this.appUpdate = data;
      if (this.platform.is('android')) {
        this.isAndroid = true;
        App.getInfo().then(res => {
          const curVersion = res.version.toString();
          this.currentVersion = curVersion.toString();
          if (this.appUpdate.is_view && this.appUpdate.forceupdate && (this.appUpdate.vesrion !== this.currentVersion)) {
            this.openPlayStore(this.appUpdate.url);
            this.common.presentToast('Please Update your App', 'warning');
          } else if (!this.appUpdate.status) {
            this.getAppVersion();
          }
        });
      }
    });
    this.getPunchStatus();
  }

  getAppVersion() {
    let platform;
    if (this.platform.is('android')) {
      platform = 'android';
    } else if (this.platform.is('ios')) {
      platform = 'ios';
    } else {
      platform = 'android'
    }
    this.httpLogin.getAppVersion(platform).subscribe({
      next: (data) => {
        this.appUpdate = data;
        if (this.appUpdate.is_view && this.appUpdate.forceupdate && (this.appUpdate.vesrion !== this.currentVersion)) {
          this.openPlayStore(this.appUpdate.url);
          this.common.presentToast('Please Update your App', 'warning');
        }
      },
      error: () => {

      },
      complete: () => {

      }
    })
  }

  openPlayStore(url: string) {    
    this.iab.create(url, '_system', 'location=no,zoom=yes');
  }

  downloadApp(url: string) {
    if (url) {
      this.common.presentToast('Please install latest application', 'secondary');
      this.common.openDoc(url);
    } else {
      this.common.presentToast('Download URL not found', 'warning');
    }
  }

  openBarcode() {
    this.isScanQr = true;
    this.router.navigateByUrl('/barcode');
  }

  ionViewWillEnter() {
    // CKMS - barcode page se cambro ka QR lekar laute hain, tab home ka normal
    // load nahi chalta, sirf cambro status kholte hain
    if (this.isScanQr) {
      const bar = this.common.getBarcode();
      if (bar) {
        this.isScanQr = false;
        this.common.setBarcode('');
        this.presentLoading().then(preLoad => {
          this.httpTo.getCambroStatus(bar).subscribe({
            next: (data) => {
              if (data.status) {
                this.openCambroStatus(data.data);
              } else {
                this.common.presentToast(data.msg, 'warning');
              }
            },
            error: () => {
              this.dismissloading();
              this.common.presentToast(environment.errMsg, 'danger');
            },
            complete: () => {
              this.dismissloading();
            }
          });
        });
      }
      return;
    }

    this.subs = this.common.getHomeLoadStatus().subscribe(val => {
      if (val) {
        this.changeEvent();
      }
    });
    this.didEnter = true;
    setTimeout(() => {
      this.subs.unsubscribe();
      this.didEnter = false;
    }, 1500);
    this.getHomeLoad();
    this.getNotification();
  }

  async openCambroStatus(data: any) {
    const modal = await this.modalCtrl.create({
      component: CambroStatusComponent,
      cssClass: 'my-modal',
      backdropDismiss: false,
      componentProps: {
        data: data
      }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role == 'true') {
      }
    });
    modal.present();
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...',
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  getHomeLoad() {
    this.common.checkInternet().then(res => {
      if (res) {
        this.isInternet = true;
        this.getOffLineCheckList();
      } else {
        this.isInternet = false
      }
    });
  }

  async getOffLineCheckList() {
    const friendsObservable = liveQuery(() => db.checklist.where({ offline_save: "true" }).toArray());
    const sub = friendsObservable.subscribe({
      next: (data) => {
        this.DGArr = data;
        if (this.DGArr.length > 0 && this.count == 0) {
          this.count = 1;
          this.presentAlertConfirm();
        }
        setTimeout(() => {
          sub.unsubscribe();
        }, 1000);
      }
    });
  }

  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Offline Data',
      message: 'You have some offline Data Save, do you want to push to server',
      mode: 'ios',
      buttons: [{
        text: 'Cancel',
        handler: (data) => {

        }
      }, {
        text: 'YES',
        handler: (data) => {
          this.openPageRoute();
        }
      }]
    });
    await alert.present();
  }

  changeEvent() {
    this.eventChange = true;
    this.isLoading = true;
    setTimeout(() => {
      this.eventChange = false;
      this.isLoading = false;
      this.common.setHomeLoadStatus(false);
    }, 1500);
  }

  handleRefresh(event: any) {
    event.target.complete();
    this.isLoading = true;
    this.getHomeLoad();
    this.changeEvent();
    this.getNotification();
    this.loginPingApi();
  }

  loginPingApi() {
    this.httpLogin.loginPingApi().subscribe({
      next:(data: any) => {
        console.log(data);
        if (data.status) {
          let val = data.data.current_punch_status === 'IN' || data.data.current_punch_status === 'FORCE_PUNCH_IN' ? true: false;
          this.httpLogin.setPunchStatus(val);
        }
      },
      error:() => {

      },
      complete:() => {

      }
    });
  }

  openPageRoute() {
    this.router.navigateByUrl('/list-master/offline-data');
  }

  testRoute(url: string) {
    this.router.navigateByUrl(url);
  }

  async openSosModal() {
    const modal = await this.modalCtrl.create({
      component: SosComponent,
      componentProps: {}
    });
    modal.present();
  }
  notification(url: string) {
    this.router.navigateByUrl(url);
  }

  getNotification() {
    const obj = {
      status: 'unread'
    }
    this.httpLogin.getNotification(obj).subscribe({
      next: (data) => {
        if (data.status) {
          this.notiticationCount = data.count;
        } else {
          this.notiticationCount = 0;
        }
      }
    });
  }

  getPunchStatus() {
    this.httpLogin.getPunchStatus().subscribe((status: any) => {      
      this.isPunchIn = status;      
    });
  }
}
