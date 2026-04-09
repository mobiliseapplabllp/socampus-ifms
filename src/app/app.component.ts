import { Component, NgZone } from '@angular/core';
import { LoginService } from './provider/login/login.service';
import { App } from '@capacitor/app';
import { Router } from '@angular/router';
import { ListMasterService } from './provider/list-master/list-master.service';
import { AlertController, Platform } from '@ionic/angular';
import { StatusBar, Style } from '@capacitor/status-bar';
import { UserIdleService } from 'angular-user-idle';
import { CommonService } from './provider/common/common.service';
import { environment } from 'src/environments/environment';
import { checklist, db } from './provider/local-db/local-db.service';
import { CapacitorCookies } from '@capacitor/core';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { Geolocation } from '@capacitor/geolocation';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  userInfo: any = []
  myMenu: any = [];
  loading: any;
  appVersion!: string;
  isAndroid!: boolean;
  isPunchIn = false;
  private isProgrammaticChange = false;
  constructor(
    private loginPro: LoginService,
    private router: Router,
    private listMaster: ListMasterService,
    private platform: Platform,
    private userIdle: UserIdleService,
    private alertController: AlertController,
    private httpLogin: LoginService,
    private common: CommonService,
    private iab: InAppBrowser) {
    this.platform.ready().then(res => {
      this.initApp();
      this.getUserData();      
      this.loginPro.getPunchStatus().subscribe((status: any) => {        
        this.setPunchIn(status);         
      });
    });
  }

  initApp() {
    this.getAppVersion();
    if (this.platform.is('capacitor')) {
      StatusBar.setOverlaysWebView({ overlay: false });
      StatusBar.setBackgroundColor({ 'color': '#040E51' })
      App.getInfo().then(res => {
        this.appVersion = res.version
      });

    }
    this.router.navigateByUrl('/login/splash');
    this.initIdle();
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

  isEnglish(text: string): boolean {
    // Allow A-Z, a-z, 0-9, spaces, and all common keyboard symbols
    const englishRegex = /^[\x20-\x7E°]*$/;
    return englishRegex.test(text);
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
        if (data.status) {
          let serverApp = data.data;
          this.common.setAppVersion(data.data);
          if (this.platform.is('capacitor')) {
            if (serverApp.is_view && serverApp.forceupdate && (serverApp.vesrion !== this.appVersion)) {
              this.common.presentToast('Please Update your App', 'warning');
              setTimeout(() => {
                this.openPlayStore(serverApp.url);
              }, 1500);
            }
          }
        }
      },
      error: () => {

      },
      complete: () => {

      }
    });
  }

  openPlayStore(url: string) {    
    this.iab.create(url, '_system', 'location=no,zoom=yes');
  }

  appUrl() {
    alert(environment.url2);
  }

  refreshTokenOnly() {
    this.common.presentLoading().then(preLoad => {
      this.httpLogin.refreshToken().subscribe({
        next: (data) => {
          localStorage.setItem('token1', data.refresh);
        },
        error: () => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.common.dismissloading();
        }
      })
    });
  }

  refreshToken() {
    this.common.presentLoading().then(res => {
      this.httpLogin.refreshToken().subscribe({
        next: (data) => {
          if (data.status) {
            localStorage.setItem('token1', data.refresh);
            const userTemp = localStorage.getItem('user');
            if (userTemp) {
              this.httpLogin.username.next(JSON.parse(userTemp));
              console.log(this.userInfo);
            }
            this.router.navigateByUrl('/list-master', { replaceUrl: true });
          } else {
            this.common.presentToast(data.info, 'warning');
            this.presentAlertConfirmCache();
          }
        },
        error: () => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
          this.presentAlertConfirmCache();
        },
        complete: () => {
          this.common.dismissloading();
        }
      })
    })
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
      }, {
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
    this.router.navigateByUrl('/login', { replaceUrl: true });
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
      }, {
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
      // if (this.userInfo.current_punch_status === 'IN') {        
      //   this.setPunchIn(true);
      //   this.loginPro.setPunchStatus(true);
      // } else if (this.userInfo.current_punch_status === 'OUT') {        
      //   this.setPunchIn(false);
      //   this.loginPro.setPunchStatus(false);
      // }      
    });

    this.listMaster.getData().subscribe((val: any) => {
      this.myMenu = val;
    });
  }

  // getIpAddress() {
  //   this.httpLogin.getIPAddress().subscribe({
  //     next:(data: any) => {
  //       const ip = data.ip || '0.0.0.0';
  //       this.saveIpAddress(ip);
  //     },
  //     error:() => {
  //       this.saveIpAddress('0.0.0.0');
  //     }
  //   });
  // }

  logout() {
    this.common.presentLoading().then(preLoad => {
      this.httpLogin.logout('0.0.0.0').subscribe({
        next: (data: any) => {
          if (data.status) {
            this.reset();
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error: () => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.common.dismissloading();
        }
      });
    })

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

  private setPunchIn(value: boolean) {    
    this.isProgrammaticChange = true;
    this.isPunchIn = value;
    setTimeout(() => this.isProgrammaticChange = false, 100);
  }

  togglePunch(event: any) {    
    if (this.isProgrammaticChange) return;
    this.isPunchIn = event.detail.checked;
    if (this.isPunchIn) {
      void this.punchInOutApi('IN');
    } else {
      void this.punchInOutApi('OUT');
    }
  }

  private revertPunchToggleAfterFailure(type: string) {
    this.setPunchIn(type === 'IN' ? false : true);
  }

  async punchInOutApi(type: string) {
    let latitude: number;
    let longitude: number;

    if (this.platform.is('capacitor')) {
      try {
        const perm = await Geolocation.requestPermissions();
        if (perm.location === 'denied') {
          this.common.presentToast('Please enable your location', 'warning');
          this.revertPunchToggleAfterFailure(type);
          return;
        }
        const res = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 20000,
        });
        latitude = res.coords.latitude;
        longitude = res.coords.longitude;
      } catch {
        this.common.presentToast('Please enable your location', 'warning');
        this.revertPunchToggleAfterFailure(type);
        return;
      }
    } else {
      latitude = 28.443433897705546;
      longitude = 77.31187477565328;
    }

    const payload = {
      type,
      latitude,
      longitude,
      source: 'MOBILE',
      actionType: 'REGULAR',
      userId: this.userInfo.id,
    };
    this.common.presentLoading().then(() => {
      this.listMaster.punchIn(payload).subscribe({
        next: (res: any) => {
          if (res.status) {
            const val = type === 'IN';
            this.loginPro.setPunchStatus(val);
          } else {
            this.common.presentToast(res.msg || 'Punch failed', 'warning');
            this.revertPunchToggleAfterFailure(type);
          }
        },
        error: () => {
          this.revertPunchToggleAfterFailure(type);
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.common.dismissloading();
        },
      });
    });
  }
}
