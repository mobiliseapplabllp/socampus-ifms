import { Component, NgZone, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, MenuController, ModalController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { LoginService } from 'src/app/provider/login/login.service';
import { environment } from 'src/environments/environment';
import { PushNotifications } from '@capacitor/push-notifications';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { env } from 'process';
import { App } from '@capacitor/app';
import { CameraService } from 'src/app/provider/camera/camera.service';
import * as moment from 'moment';
import { take } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  login = { userid: 'Admin', password: '' };
  submitted = false;
  userValue: any = [];
  isHidden = true;
  public loginForms!: FormGroup;
  loading: any;
  isLogin: any = [];
  isPassword = true;
  isAndroid!: boolean;
  mypass = true;
  video: any;
  fcmToken: any;
  viewCondition = 'sso' // 1. sso, 2. login, 3. multi_factor, 4.forgot_pass, 5. verification)code 6. create_new_pass
  otpConfig = {
    length: 4,
    allowNumbersOnly:true,
    inputClass: 'custom-otp-input',
    containerClass: 'custom-otp-container'
  };
  otp: any;
  sendMobileMsg!: string;
  appUpdate: any = [];
  currentVersion: any = [];
  isProduction = environment.isProd;
  appVersion!: string;
  isDateValid!: boolean;
  // Shared options for every in-app browser (SSO). Toolbar poora off hai - iOS par wo
  // niche translucent "Done" + back/forward buttons deta tha jo SSO flow me kaam ke nahi.
  // Browser ab sirf khud band hota hai: loadstart par redirect match hone par, ya loaderror par.
  private readonly iabOptions = 'location=no,zoom=yes,toolbar=no';
  // True while an SSO in-app browser is open, so the login footer can hide behind its toolbar.
  ssoBrowserOpen = false;
  constructor(
    private formbuilder: FormBuilder,
    private platform: Platform,
    private menu: MenuController,
    private loadingController: LoadingController,
    private router: Router,
    private loginPro: LoginService,
    private common: CommonService,
    private iab: InAppBrowser,
    private zone: NgZone,
    private camera: CameraService) {
    this.loginForms = this.formbuilder.group({
      userid: ['MOBPUNEET', Validators.required],
      password: ['Aiagent@987654321' , Validators.required],
    });
  }


  ngOnInit() {    
    if (moment().format('YYYY-MM-DD') === '2025-09-19') {
      this.isDateValid = true;      
    }
    this.common.setBarcode('');
    if (this.platform.is('capacitor')) {
      this.initFcm();
      App.getInfo().then(res => {
        this.appVersion = res.version
      });
    } else {
      this.appVersion = '1.1';
    }
  }  

  initFcm() {
    const addListeners = async () => {
      await PushNotifications.addListener('registration', token => {
        this.fcmToken = token.value;
      });

      await PushNotifications.addListener('registrationError', err => {        
      });

      await PushNotifications.addListener('pushNotificationReceived', notification => {        
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', notification => {        
      });
    }

    const registerNotifications = async () => {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        throw new Error('User denied permissions!');
      }

      await PushNotifications.register();
    }

    const getDeliveredNotifications = async () => {
      const notificationList = await PushNotifications.getDeliveredNotifications();      
    }
    addListeners();
    registerNotifications();
    getDeliveredNotifications();
  }


  ionViewDidEnter() {
    if (this.platform.is('android')) {
      this.isAndroid = true;
    }
    this.menu.enable(false);
    this.fillSavedLogin();
  }
  ionViewDidLeave() {    
    this.menu.enable(true);
  }

  /**
   * Pichhli baar ka user id / password wapas form me. Login success par ye
   * 'loginvalue' me save hota hai, to dobara aane par sab bhara hua milta hai.
   */
  fillSavedLogin() {
    const saved = localStorage.getItem('loginvalue');
    if (!saved) {
      return;
    }
    try {
      const value = JSON.parse(saved);
      if (!value?.userid) {
        return;
      }
      this.login.userid = value.userid;
      this.login.password = value.password || '';
      this.loginForms.patchValue({
        userid: value.userid,
        password: value.password || ''
      });
    } catch (e) {
      console.error('saved login read', e);
    }
  }

  changePass(_pass: any) { }


  async checkInternet() {
    this.common.checkInternet().then(res => {
      if (res) {
        this.onLogin();
      } else {
        this.common.presentToast('You are in Offline Mode', 'danger');
        this.router.navigateByUrl('/list-master', { replaceUrl: true });
      }
    });
  }

  onLogin() {
    this.isHidden = false;
    this.loginPro.LoginAuth(this.loginForms.value, this.fcmToken).then(data => {
      this.isHidden = true;
      this.userValue = data;
      if (this.userValue === null) return
      if (this.userValue === false) {
        this.common.presentToast(environment.errMsg, 'danger');
      } else {
        if (this.userValue.status === false ) {
          this.common.presentToast(this.userValue.msg, 'warning');
        } else  if (this.userValue.status === true) {
          this.sendMobileMsg = this.userValue.msg
          this.viewCondition = 'multi_factor';
        }
      }
    });
  }

  // The translucent SSO toolbar (iOS 26) shows the app screen behind it, so the login page's
  // "Powered By" footer bleeds through. Hide that footer while an SSO browser is open and
  // restore it when the browser is closed (exit fires on Done and on programmatic close).
  private openSsoBrowser(url: string) {
    this.ssoBrowserOpen = true;
    const browser = this.iab.create(url, '_blank', this.iabOptions);
    browser.on('exit').subscribe(() => this.zone.run(() => { this.ssoBrowserOpen = false; }));
    return browser;
  }

  openInAppBrowser() {
    let browser = this.openSsoBrowser(environment.ssoUrl + 'ssoGates/saml2/index.php?sso');
    let count = 0;
    browser.on('loadstart').subscribe((data: any) => {
      if (data.url.match(environment.ssoUrl + '#/auth/ssoGates/')) {
        let url, token
        url = data.url;
        token = url.split('ssoGates/')[1];
        browser.close();
        count = count + 1;
        if (count <= 1) {
          this.getSsoEnc(token);
        }
      }
      // Toolbar off hai, isliye page ka apna Back hi ekmatra exit hai - wo yahin land karta hai.
      // openKeyClock() me bhi bilkul yahi condition hai.
      if (data.url === environment.ssoUrl || data.url === environment.ssoUrl + 'be/apiloading' || data.url === environment.ssoUrl + '#/auth') {
        browser.close();
      }
    });

    browser.on('loaderror').subscribe(error => {
      console.error('InAppBrowser error:', error);
      alert(JSON.stringify(error));
      browser.close();
    });
  }

  openKeyClock() {
    let browser = this.openSsoBrowser(environment.ssoUrl + 'ssoGates/saml3/index.php?sso');
    let count = 0;
    browser.on('loadstart').subscribe(data => {
      if (data.url.match(environment.ssoUrl + '#/auth/ssoGates/')) {
        count = count + 1;
        let url, token
        url = data.url;
        token = url.split('ssoGates/')[1];
        browser.close();
        if (count <= 1) {
          this.getSsoEnc(token);
        }
      }
      // https://socampusstaging.mobilisepro.com/#/auth
      if (data.url === environment.ssoUrl || data.url === environment.ssoUrl + 'be/apiloading' || data.url === environment.ssoUrl + '#/auth') {
        browser.close();
      }
    });

    browser.on('loaderror').subscribe(error => {            
      alert(JSON.stringify(error));
      browser.close();
    });
  }

  getSsoEnc(token: string) {
    this.isHidden = !this.isHidden;
    this.presentLoading().then(preLoad => {
      this.loginPro.ssoGatesLoginDetails(token, this.fcmToken, this.appVersion, this.isAndroid).subscribe({
        next:(data) => {
          this.isHidden = !this.isHidden;
          this.userValue = data;
          if (this.userValue === null) return
          if (this.userValue === false) {
            this.common.presentToast(environment.errMsg, 'danger');
          } else {
            if (this.userValue.status === false ) {
              this.common.presentToast(this.userValue.msg, 'warning');
            } else  if (this.userValue.status === true) {
              localStorage.setItem('userInfo', JSON.stringify(this.userValue.extra));
              localStorage.setItem('loginvalue', JSON.stringify(this.loginForms.value));
              localStorage.setItem('token1', this.userValue.token);
              localStorage.setItem('enc_id', this.userValue.enc_id);
              localStorage.setItem('user', JSON.stringify(this.userValue.user));
              localStorage.setItem('isAlreadyLogin', 'true');
              localStorage.setItem('loginDate', moment().format('YYYY-MM-DD'));
              this.loginPro.username.next(this.userValue.user);
              let val = this.userValue.user.current_punch_status === 'IN' || this.userValue.user.current_punch_status === 'FORCE_PUNCH_IN'  ? true: false;
              this.loginPro.setPunchStatus(val);              
              this.checkAppUpdate();
            }
          }
        },
        error:(err: any) => {
          console.log(err);
          this.common.presentToast(environment.errMsg, 'danger');
          this.dismissloading();
        },
        complete:() => {
          this.dismissloading();
        }
      });
    });
  }

  getOtpValue(ev: any) {    
    this.otp = '';
    if (ev.length === 4) {
      this.otp = ev;
    }
  }

  verifyOtp() {    
    const formData = new FormData();
    formData.append('user_name', this.loginForms.value.userid);
    formData.append('otp', this.otp);
    formData.append('fcm_token', this.fcmToken);
    this.presentLoading().then(preLoad => {
      this.loginPro.verifyOtp(formData).subscribe({
        next:(data) => {
          if (data.status === true) {
            localStorage.setItem('loginvalue', JSON.stringify(this.loginForms.value));
            localStorage.setItem('token1', data.token);
            localStorage.setItem('enc_id', data.enc_id);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('punchStatus',JSON.stringify(data.current_punch_status));
            localStorage.setItem('isAlreadyLogin', 'true');
            // Splash isi date se tay karta hai ki session zinda hai - bina iske
            // har baar login screen par wapas bhej deta tha
            localStorage.setItem('loginDate', moment().format('YYYY-MM-DD'));
            this.checkAppUpdate();
            // this.multiFactorSubmit();
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

  checkAppUpdate() {
    this.common.getAppVersionObs().pipe(take(1)).subscribe(data => {
      this.appUpdate = data;
      if (this.platform.is('capacitor')) {
        this.isAndroid = true;
        App.getInfo().then(res => {
          const curVersion = res.version.toString();
          this.currentVersion = curVersion.toString();
          if (this.appUpdate.is_view && this.appUpdate.forceupdate && (this.appUpdate.vesrion !== this.currentVersion)) {
            this.common.presentToast('Please Update your App', 'warning');
            setTimeout(() => {
              this.openPlayStore(this.appUpdate.url);            
            });            
          } else {
            this.multiFactorSubmit();
          }
        });
      } else {
        this.isAndroid = false
        this.multiFactorSubmit();
      }
    });
  }

  openPlayStore(url: string) {    
    this.iab.create(url, '_system', 'location=no,zoom=yes');
  }

  multiFactorSubmit() {
    this.router.navigateByUrl('/list-master', { replaceUrl: true });
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

  openPage(url: any) {
    this.router.navigateByUrl(url);
  }
  
 //|| !this.isDateValid
  changeAuth() {
    if (this.isProduction) {
      return;
    }
    this.viewCondition = 'login';
  }

  openBarcode() {
    return;
    if (!this.isProduction) {
      // this.router.navigateByUrl('/barcode');
      this.camera.selectImage(['camera'], (blob: any) => {
        let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg';

      });
    }
  }

  dummyLogin() {
    if (this.isProduction) {
      return;
    }
    // https://socampusstaging.mobilisepro.com/#/auth/ssoGates/t3_-3XfxmvntZQ5kvmdqAlhZMlBnU0pkNUVnT1JnOXlKWE9Da0hXc3ViajZGS0Rmbkdyd2QwTitwWHVqU0p0ekJLTGYzL1ExNm9Hdm56Ti9sUVVBVGd2RWlxblBGWXJJKzNxVHJ5ZGUvRlBtczlGRVJsZFJNZDFGWWxTMkxKVG5nUnV2ZlRXNFpUUnloV2Q4
    let token = 't3_-3XfxmvntZQ5kvmdqAlhZMlBnU0pkNUVnT1JnOXlKWE9Da0hXc3ViajZGS0Rmbkdyd2QwTitwWHVqU0p0ekJLTGYzL1ExNm9Hdm56Ti9sUVVBVGd2RWlxblBGWXJJKzNxVHJ5ZGUvRlBtczlGRVJsZFJNZDFGWWxTMkxKVG5nUnV2ZlRXNFpUUnloV2Q4';
    this.getSsoEnc(token);
  }
}
