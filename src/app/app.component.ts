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
import { ModalController } from '@ionic/angular';
import { TrackingMapComponent } from './page/list-master/tracking-map/tracking-map.component';
import { TrackingDebugComponent } from './page/list-master/tracking-debug/tracking-debug.component';
import { PermissionGuideComponent } from './shared/permission-guide/permission-guide.component';
import {
  LiveTrackerService,
  LiveTrackerStatus,
  PermissionKey
} from './provider/live-tracker/live-tracker.service';

interface PermissionRow {
  key: PermissionKey;
  label: string;
  granted: boolean;
}


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

  // ---- Location tracking (Availability ke saath) ----
  trackingSupported = false;
  trackingStatus: LiveTrackerStatus | null = null;
  permissions: PermissionRow[] = [];
  allGranted = false;
  /**
   * BehaviorSubject subscribe karte hi apni default value (false) bhej deta hai.
   * Wo server ka jawab nahi hota - us par tracking band kar di to chalti hui
   * tracking ka session hi ud jaata. Isliye pehla emission chhod dete hain.
   */
  private punchStatusSeen = false;
  /** Ek waqt me ek hi start/stop - do emission saath aa jayein to bhi */
  private trackingSyncBusy = false;
  /** Punch API chal rahi hai - button tab tak band */
  punchBusy = false;
  /** Title par 5 tap = chhupa hua test screen */
  private titleTaps = 0;
  private titleTapTimer: any = null;
  constructor(
    private loginPro: LoginService,
    private router: Router,
    private listMaster: ListMasterService,
    private platform: Platform,
    private userIdle: UserIdleService,
    private alertController: AlertController,
    private httpLogin: LoginService,
    private common: CommonService,
    private liveTracker: LiveTrackerService,
    private modalCtrl: ModalController,
    private zone: NgZone,
    private iab: InAppBrowser) {
    this.platform.ready().then(res => {
      this.initApp();
      this.getUserData();
      this.listenAppResume();
      this.loginPro.getPunchStatus().subscribe((status: any) => {        
        this.setPunchIn(status);
        const firstValue = !this.punchStatusSeen;
        this.punchStatusSeen = true;
        if (status) {
          // Server kehta hai punch in hai - tracking band ho to chalu kar do.
          // Pehle emission ho ya baad ka, IN par hamesha chalana hai
          void this.syncTrackingWithPunch('IN', true);
        } else if (!firstValue) {
          // OUT par tabhi band karo jab ye server ka asli jawab ho - subject ki
          // default value (false) par band kiya to chalti tracking ka session ud jaata
          void this.syncTrackingWithPunch('OUT', true);
        }
      });
    });
  }

  initApp() {
    this.getAppVersion();
    if (this.platform.is('capacitor')) {
      // App ab hamesha status bar ke neeche tak jaati hai (MainActivity), aur uski
      // jagah CSS se chhodi jaati hai - plugin se false karte to dono ladte
      StatusBar.setOverlaysWebView({ overlay: true });
      // Overlay ke saath background ka koi asar nahi hota - rang header ke primary se
      // aata hai. Icons safed rehne chahiye, warna gehre neele par dikhte hi nahi
      StatusBar.setStyle({ style: Style.Dark });
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
    // Subject sirf usi session me bharta hai jisme login hua tha - app dobara kholne
    // par khali hota hai, isliye menu me "User" dikh raha tha. Saved user pehle lo.
    // Isi se punch payload ka userId bhi aata hai
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        this.userInfo = JSON.parse(saved);
      } catch (e) {
        console.error('saved user read', e);
      }
    }
    this.loginPro.getUserDataObs().subscribe((dat: any) => {
      // Khali array/object aaye to saved wala mat mitao
      if (!dat || Array.isArray(dat) || !Object.keys(dat).length) {
        return;
      }
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

  /**
   * Punch In / Out - pehle poochho, phir API. Pehle yahan toggle tha, par wo apne aap
   * chal padta tha: API fail hui ya trip chalu hone se rukna pada, to toast to aata
   * tha par toggle galat haalat me atka rehta tha. Ab haal sirf server ke jawab se
   * badalta hai (setPunchIn), UI apni marzi se kuch nahi badalta.
   */
  async confirmPunch(): Promise<void> {
    if (this.punchBusy) {
      return;
    }
    const goingIn = !this.isPunchIn;

    // Trip chalu ho to punch out hone hi mat do - pehle native stop() mana karta tha,
    // par ab punch API pehle chalti hai, to server par punch out ho jaata aur trip
    // adhoori chalti rehti. Jaanch API se pehle honi chahiye
    if (!goingIn) {
      const trip = await this.liveTracker.activeTrip();
      if (trip) {
        this.common.presentToast(
          `Finish the active trip (#${trip.id}) before punching out`, 'warning');
        return;
      }
    }

    const alert = await this.alertController.create({
      header: goingIn ? 'Punch In' : 'Punch Out',
      message: goingIn
        ? 'You will be marked available and location tracking will start.'
        : 'You will be marked not available and location tracking will stop.',
      mode: 'ios',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: goingIn ? 'Punch In' : 'Punch Out',
          handler: () => {
            void this.punchInOutApi(goingIn ? 'IN' : 'OUT');
          }
        }
      ]
    });
    await alert.present();
  }

  // ------------------------------------------------- location tracking

  /**
   * Menu khulte hi permission aur tracking ka haal taaza karo - settings se wapas
   * aane par koi page change nahi hota, isliye yahi ek bharosemand mauka hai.
   */
  async refreshTracking(): Promise<void> {
    this.trackingSupported = this.liveTracker.isSupported();
    if (!this.trackingSupported) {
      return;
    }
    const status = await this.liveTracker.checkStatus();
    this.trackingStatus = status;
    void this.liveTracker.syncActiveTrip();
    this.permissions = [
      { key: 'gps', label: 'Location Services (GPS)', granted: status.gps },
      { key: 'location', label: 'Location (Always Allow)', granted: status.location },
      { key: 'battery', label: 'Battery Optimization', granted: status.battery },
      { key: 'notifications', label: 'Notifications', granted: status.notifications },
      { key: 'activity', label: 'Physical Activity', granted: status.activityPermission },
    ];
    this.allGranted = this.permissions.every(p => p.granted);
  }

  /**
   * Sirf development ke liye - browser me permission guide ka UI dekhne ka raasta,
   * kyunki wahan permission list dikhti hi nahi (native plugin nahi hota).
   * Production build me ye kuch nahi karta.
   */
  async devOpenPermissionGuide(): Promise<void> {
    if (environment.isProd) {
      return;
    }
    const modal = await this.modalCtrl.create({
      component: PermissionGuideComponent
    });
    await modal.present();
  }

  /** Row tap - seedha usi setting par, user ko dhoondhna na pade */
  async fixPermission(row: PermissionRow): Promise<void> {
    if (row.granted) {
      return;
    }
    // "Allow all the time" Android khud nahi poochta - Settings me teen tap lagte
    // hain. Seedha Settings kholne par engineer wahan atak jaata tha, isliye
    // pehle chhota guide dikhate hain
    if (row.key === 'location') {
      // Poora page - sheet me teen screenshot scroll karne me tang the
      const modal = await this.modalCtrl.create({
        component: PermissionGuideComponent
      });
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (!data?.open) {
        return;
      }
    }
    await this.liveTracker.openSetting(row.key);
    // Runtime wali permission (location/notification/activity) yahin mil jaati hai,
    // to list turant hari ho jaye. Settings screen wali resume par pakdi jaayegi
    await this.refreshTracking();
  }

  /**
   * Settings se wapas aane par koi page change nahi hota aur menu pehle se khula
   * rehta hai - isliye permission list wahin purani dikhti thi. Resume par refresh
   * karna hi ek bharosemand mauka hai.
   */
  private listenAppResume(): void {
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        this.zone.run(() => void this.refreshTracking());
      }
    });
  }

  /** "i" - permission status aur is session ka poora path map par (testing) */
  async openTrackingDetails(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: TrackingMapComponent,
      componentProps: {
        status: this.trackingStatus,
        permissions: this.permissions
      }
    });
    await modal.present();
    await modal.onDidDismiss();
    await this.refreshTracking();
  }

  /** Availability title par 5 tap, 3 second ke andar - chhupa hua debug screen */
  onAvailabilityTap(): void {
    this.titleTaps++;
    if (this.titleTapTimer) {
      clearTimeout(this.titleTapTimer);
    }
    this.titleTapTimer = setTimeout(() => this.titleTaps = 0, 3000);
    if (this.titleTaps >= 5) {
      this.titleTaps = 0;
      void this.openTrackingDebug();
    }
  }

  private async openTrackingDebug(): Promise<void> {
    const modal = await this.modalCtrl.create({ component: TrackingDebugComponent });
    await modal.present();
    await modal.onDidDismiss();
    await this.refreshTracking();
  }

  /**
   * Punch ke saath hi tracking - available hue to chalu, nahi to band.
   *
   * @param silent app khulte waqt server ke status se mila rahe hain - engineer ne
   *               abhi kuch dabaya nahi, isliye error ka toast dikhana theek nahi
   */
  private async syncTrackingWithPunch(type: string, silent = false): Promise<void> {
    this.trackingSupported = this.liveTracker.isSupported();
    if (!this.trackingSupported || this.trackingSyncBusy) {
      return;
    }
    this.trackingSyncBusy = true;
    try {
      // Native se poochho ki abhi chal rahi hai ya nahi - chalu ko dobara start
      // karne se session reset ho jaata (points, distance, path sab saaf)
      const status = await this.liveTracker.checkStatus();
      if (type === 'IN' && !status.running) {
        this.trackingStatus = await this.liveTracker.start();
      } else if (type === 'OUT' && status.running) {
        this.trackingStatus = await this.liveTracker.stop();
      }
      await this.refreshTracking();
    } catch (e: any) {
      // Trip chalu ho to native stop mana kar deta hai - wo galti nahi, suraksha hai
      console.error('tracking with punch', e);
      if (!silent) {
        this.common.presentToast(e?.message || 'Could not change location tracking', 'warning');
      }
      await this.refreshTracking();
    } finally {
      this.trackingSyncBusy = false;
    }
  }

  get trackingStale(): boolean {
    if (!this.trackingStatus?.running) {
      return false;
    }
    const last = this.trackingStatus.lastFixAt || this.trackingStatus.startedAt || 0;
    return last > 0 && (Date.now() - last) > 10 * 60 * 1000;
  }

  get trackingText(): string {
    if (!this.trackingStatus?.running) {
      return 'Location tracking off';
    }
    const last = this.trackingStatus.lastFixAt || 0;
    if (!last) {
      return 'Tracking on · waiting for location';
    }
    const mins = Math.floor((Date.now() - last) / 60000);
    if (mins <= 0) {
      return 'Tracking on · updated just now';
    }
    return `Tracking on · updated ${mins} min ago`;
  }

  /**
   * Button wale UI me "revert" ki zaroorat nahi - haal chhua hi nahi jaata jab tak
   * server haan na kahe. Naam purana rakha hai taaki baaki jagah ka code na toote.
   */
  private revertPunchToggleAfterFailure(type: string) {
    this.punchBusy = false;
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
    this.punchBusy = true;
    this.common.presentLoading().then(() => {
      this.listMaster.punchIn(payload).subscribe({
        next: (res: any) => {
          if (res.status) {
            const val = type === 'IN';
            this.loginPro.setPunchStatus(val);
            // Punch hi tracking ka switch hai - IN par chalu, OUT par band
            void this.syncTrackingWithPunch(type);
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
          this.punchBusy = false;
          this.common.dismissloading();
        },
      });
    });
  }
}
