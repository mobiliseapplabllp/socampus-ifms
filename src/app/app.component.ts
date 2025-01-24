import { Component, NgZone } from '@angular/core';
import { LoginService } from './provider/login/login.service';
import { App } from '@capacitor/app';
import { Router } from '@angular/router';
import { ListMasterService } from './provider/list-master/list-master.service';
import { AlertController, LoadingController, Platform } from '@ionic/angular';
import { StatusBar, Style } from '@capacitor/status-bar';
import { UserIdleService } from 'angular-user-idle';
import { CommonService } from './provider/common/common.service';
import { environment } from 'src/environments/environment';
import { checklist, db } from './provider/local-db/local-db.service';
// import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import { CapacitorCookies } from '@capacitor/core';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  userInfo: any = [];
  myMenu: any = [];
  loading: any;
  appVersion!: string;
  isAndroid!: boolean;
  constructor(
    private loginPro: LoginService,
    private router: Router,
    private listMaster: ListMasterService,
    private platform: Platform,
    private userIdle: UserIdleService,
    private alertController: AlertController,
    private httpLogin: LoginService,
    private loadingController: LoadingController,
    private common: CommonService,
    private zone: NgZone) {
      this.platform.ready().then(res => {
        this.initApp()
        this.getUserData();
      });
  }

  initApp() {
    this.getAppVersion();
    if (this.platform.is('capacitor')){
      // PrivacyScreen.enable();
      StatusBar.setOverlaysWebView({overlay: false});
      StatusBar.setBackgroundColor({'color': '#040E51'})
      App.getInfo().then(res => {
        this.appVersion = res.version
      });
      this.router.navigateByUrl('/login/splash');
      this.initIdle();
    } else {
      this.router.navigateByUrl('/login/splash');
      this.initIdle();
    }
    return;
    const isLogin = localStorage.getItem('isAlreadyLogin');
    if (!isLogin) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
    } else {
      this.common.checkInternet().then(res => {
        if (res) {
          // this.refreshToken();
          this.router.navigateByUrl('/login', { replaceUrl: true });
        } else {
          this.common.presentToast('You are in Offline Mode', 'warning')
          this.router.navigateByUrl('/list-master', { replaceUrl: true });
        }
      });
    }
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
      next:(data) => {
        if (data.status) {
          this.common.setAppVersion(data.data);
        }
      },
      error:() => {

      },
      complete:() => {

      }
    })
  }

  appUrl() {
    alert(environment.url2);
  }

  refreshTokenOnly() {
    this.presentLoading().then(preLoad => {
      this.httpLogin.refreshToken().subscribe({
        next:(data) => {
          localStorage.setItem('token1', data.refresh);
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

  refreshToken() {
    this.presentLoading().then(res => {
      this.httpLogin.refreshToken().subscribe({
        next:(data) => {
          if (data.status) {
            localStorage.setItem('token1', data.refresh);
            const userTemp = localStorage.getItem('user');
            if (userTemp) {
              this.httpLogin.username.next(JSON.parse(userTemp));
            }
            this.router.navigateByUrl('/list-master', { replaceUrl: true });
          } else {
            this.common.presentToast(data.info, 'warning');
            this.presentAlertConfirmCache();
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
          this.presentAlertConfirmCache();
        },
        complete:() => {
          this.dismissloading();
        }
      })
    })
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait..'
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  initIdle() {
    this.userIdle.startWatching();
    this.userIdle.onTimerStart().subscribe();
    this.userIdle.onTimeout().subscribe(() => {
      this.stop();
      this.stopWatching();
      this.presentAlertConfirm();
    });
  }

  async presentAlertConfirmCache() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Error!!!',
      message: environment.errMsg,
      mode: 'ios',
      buttons: [{
        text: 'RESET',
          handler: (data) => {
            this.cleanDb();
          }
        },{
          text: 'RETRY',
          handler: (data) => {
            this.refreshToken();
          }
        }]
    });
    await alert.present();
  }

  async cleanDb() {
    await db.checklist.clear();
    localStorage.clear();
    this.router.navigateByUrl('/login', {replaceUrl: true});
  }

  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Session Timeout',
      message: 'Your session will expire soon, do you want to refresh?',
      mode: 'ios',
      buttons: [{
        text: 'Cancel',
          handler: (data) => { }
        },{
          text: 'YES',
          handler: (data) => {
            this.startWatching()
            this.restart();
            this.refreshTokenOnly();
          }
        }]
    });
    await alert.present();
  }

  stop() {
    this.userIdle.stopTimer();
  }

  stopWatching() {
    this.userIdle.stopWatching();
  }

  startWatching() {
    this.userIdle.startWatching();
  }

  restart() {
    this.userIdle.resetTimer();
  }

  getUserData() {
    this.loginPro.getUserDataObs().subscribe((dat: any) => {
      this.userInfo = dat;
    });

    this.listMaster.getData().subscribe((val: any) => {
      this.myMenu = val;
    });
  }

  async reset() {
    localStorage.clear();
    CapacitorCookies.clearAllCookies();
    await db.checklist.clear();
    if (this.platform.is('android')) {
      App.exitApp();
    } else {
      this.router.navigateByUrl('/login');
    }
  }

  openPage(data: any) {
    this.router.navigateByUrl(data.link);
  }
}
