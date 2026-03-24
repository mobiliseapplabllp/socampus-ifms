import { Component, OnInit } from '@angular/core';
import { CommonService } from 'src/app/provider/common/common.service';
import { db } from '../../provider/local-db/local-db.service';
import { liveQuery } from 'dexie';
import { AlertController, ModalController, Platform, } from '@ionic/angular';
import { Router } from '@angular/router';
import { SosComponent } from './sos/sos.component';
import { App } from '@capacitor/app';
import { LoginService } from 'src/app/provider/login/login.service';
import { stat } from 'fs';
import { cordovaInstance } from '@awesome-cordova-plugins/core';
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
  constructor(
    private common: CommonService,
    private alertController: AlertController,
    private router: Router,
    private modalCtrl: ModalController,
    private platform: Platform,
    private httpLogin: LoginService) {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      this.userName = this.userData.user_name;      
    }
  }

  ngOnInit(): void {
    this.common.getAppVersionObs().subscribe(data => {
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
    window.open(url);
  }

  downloadApp(url: string) {
    if (url) {
      this.common.presentToast('Please install latest application', 'secondary');
      this.common.openDoc(url);
    } else {
      this.common.presentToast('Download URL not found', 'warning');
    }
  }

  ionViewWillEnter() {
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
    this.loginPingApi();
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
    this.loginPingApi();
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
