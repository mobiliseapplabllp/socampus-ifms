import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, MenuController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { LoginService } from 'src/app/provider/login/login.service';
import { environment } from 'src/environments/environment';
import { PushNotifications } from '@capacitor/push-notifications';

import { File } from '@awesome-cordova-plugins/file/ngx';
import { MediaCapture, MediaFile, CaptureVideoOptions } from '@awesome-cordova-plugins/media-capture/ngx';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

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
  constructor(
    private formbuilder: FormBuilder,
    private platform: Platform,
    private menu: MenuController,
    private loadingController: LoadingController,
    private router: Router,
    private loginPro: LoginService,
    private common: CommonService,
    private mediaCapture: MediaCapture,
    private file: File) {
    this.loginForms = formbuilder.group({
      userid: ['', Validators.required],
      password: ['' , Validators.required],
    });
    // Filesystem.requestPermissions();
  }



async convertFileToBlob(fullPathOrLocalURL: string) {
  // Check if it's a local file path
  console.log(fullPathOrLocalURL);
  if (fullPathOrLocalURL.startsWith('file:///')) {
    try {
      const readFileResult: any = await Filesystem.readFile({
        path: fullPathOrLocalURL,
      });

      const buffer = new Uint8Array(readFileResult.data.length);
      for (let i = 0; i < readFileResult.data.length; i++) {
        buffer[i] = readFileResult.data.charCodeAt(i);
      }

      // Handle the video buffer (e.g., display using video element)
      const blob = new Blob([buffer], { type: 'video/mp4' }); // Set appropriate MIME type
      console.log(blob)
    } catch (err) {
      console.error('Error reading video:', err);
      // Handle specific errors (e.g., permission denied, file not found)
    }
  } else {
    console.log('return outside');
    return
    // Handle downloaded resources based on your download method (replace with your logic)
    // ...
  }
}

getMimeType(fullPath: string): string {
  // Implement logic to determine the MIME type based on file extension or other information
  const extension = fullPath.split('.').pop();
  // Use a mapping or logic to get the MIME type based on extension
  return 'application/octet-stream'; // Default if type can't be determined
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
        console.info('Registration token: ', token.value);
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
        this.login.password = decrypt.password;
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
      setTimeout(() => {
        this.isHidden = true;
      }, 1000);
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
          this.viewCondition = 'multi_factor';
          return;
          this.router.navigateByUrl('/list-master', { replaceUrl: true });
        }
      }
    });
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



  read(file: any) {
    console.log('read');
    const reader: any = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => {
      const blob = new Blob([reader.result], {
        type: file.type,
      });
      console.log('&&&&&');
      console.log(blob);
      const formData = new FormData();
      formData.append('video', blob);
    };
  }

}
