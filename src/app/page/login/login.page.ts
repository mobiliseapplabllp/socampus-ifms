import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, MenuController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { LoginService } from 'src/app/provider/login/login.service';
import { environment } from 'src/environments/environment';
import { PushNotifications } from '@capacitor/push-notifications';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { env } from 'process';
import { App } from '@capacitor/app';
import { CameraService } from 'src/app/provider/camera/camera.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  login = { userid: '', password: ''};
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
  constructor(
    private formbuilder: FormBuilder,
    private platform: Platform,
    private menu: MenuController,
    private loadingController: LoadingController,
    private router: Router,
    private loginPro: LoginService,
    private common: CommonService,
    private iab: InAppBrowser,
    private camera: CameraService) {
    this.loginForms = this.formbuilder.group({
      userid: ['', Validators.required],
      password: ['' , Validators.required],
    });
  }


  ngOnInit() {
    this.common.setBarcode('');
    if (this.platform.is('capacitor')) {
      this.initFcm();
    }
  }

  initFcm() {
    const addListeners = async () => {
      await PushNotifications.addListener('registration', token => {
        this.fcmToken = token.value;
      });

      await PushNotifications.addListener('registrationError', err => {
        console.error('Registration error: ', err.error);
      });

      await PushNotifications.addListener('pushNotificationReceived', notification => {
        console.log('Push notification received: ', notification);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', notification => {
        console.log('Push notification action performed', notification.actionId, notification.inputValue);
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
      console.log('delivered notifications', notificationList);
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
    if (localStorage.getItem('loginvalue')) {
      const isLogin = localStorage.getItem('loginvalue');
      if (isLogin) {
        const decrypt = JSON.parse(isLogin);
        this.login.userid = decrypt.userid;
        // this.login.password = decrypt.password;
      }
    }
  }
  ionViewDidLeave() {
    this.menu.enable(true);
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

  openInAppBrowser() {
    let browser = this.iab.create(environment.ssoUrl + 'ssoGates/saml2/index.php?sso', '_blank', 'location=no,zoom=yes');
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
    });

    browser.on('loaderror').subscribe(error => {
      console.error('InAppBrowser error:', error);

      // Display an error message to the user
      alert(JSON.stringify(error));

      // Optionally, you can close the InAppBrowser here if necessary
      browser.close();
    });
  }

  openKeyClock() {
    let browser = this.iab.create(environment.ssoUrl + 'ssoGates/saml3/index.php?sso', '_blank', 'location=no,zoom=yes');
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
      if (data.url === environment.ssoUrl || data.url === environment.ssoUrl + 'be/apiloading') {
        browser.close();
      }
    });

    browser.on('loaderror').subscribe(error => {
      console.error('InAppBrowser error:', error);

      // Display an error message to the user
      alert(JSON.stringify(error));

      // Optionally, you can close the InAppBrowser here if necessary
      browser.close();
    });
  }

  getSsoEnc(token: string) {
    this.isHidden = !this.isHidden;
    this.presentLoading().then(preLoad => {
      this.loginPro.ssoGatesLoginDetails(token, this.fcmToken).subscribe({
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
              // this.multiFactorSubmit();
              this.checkAppUpdate();
            }
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
    });
  }

  getOtpValue(ev: any) {
    console.log(ev);
    console.log(ev.length);
    this.otp = '';
    if (ev.length === 4) {
      this.otp = ev;
    }
  }

  verifyOtp() {
    console.log(this.loginForms.value);
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
            localStorage.setItem('isAlreadyLogin', 'true');
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
          } else {
            this.multiFactorSubmit();
          }
        });
      } else {
        this.multiFactorSubmit();
      }
    });
  }

  openPlayStore(url: string) {
    window.open(url);
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

  changeAuth() {
    if (!this.isProduction) {
      this.viewCondition = 'login';
    }
  }

  openBarcode() {
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
    let token = 'mO3pEmclLk6HCNUt9n3-tllTMVNUVWZWVGVGVGRUbUFzRlh6VjVDOWQ0SmdsZ0tPaUNzSVQrUGNLbHpSRVBxR0lRWnBqemVnWm81YkgvWUxheXZaTXphVUluR09XZjl5ZDBqREFaMzg3WnhDaXo1cS8xTkZBUUFTVWZTY1BhVmpnVkU2Slg3dFR2TnRBZUdD';
    this.getSsoEnc(token);
  }
}
