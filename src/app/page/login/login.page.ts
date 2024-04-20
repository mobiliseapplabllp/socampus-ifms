import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, MenuController, ModalController, Platform } from '@ionic/angular';
import * as moment from 'moment';
import { CommonService } from 'src/app/provider/common/common.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { LoginService } from 'src/app/provider/login/login.service';
import { environment } from 'src/environments/environment';
import { MediaCapture, MediaFile, CaptureError, CaptureImageOptions } from '@awesome-cordova-plugins/media-capture/ngx';
import { CameraOpacityOptions } from '@capacitor-community/camera-preview';
import { CaptureVideoOptions, } from '@awesome-cordova-plugins/media-capture';
import { File, FileEntry } from '@awesome-cordova-plugins/file/ngx';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
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
  constructor(
    private formbuilder: FormBuilder,
    private platform: Platform,
    private menu: MenuController,
    private loadingController: LoadingController,
    private router: Router,
    private loginPro: LoginService,
    private common: CommonService,
    private httpDigi: DigitalChecklistService,
    private mediaCapture: MediaCapture,
    private file: File

  ) {
    this.loginForms = formbuilder.group({
      userid: ['', Validators.required],
      password: ['' , Validators.required],
    });
  }

  ngOnInit() {
    this.common.setBarcode('');
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

  changePass(pass: any) { }

  // clearDb() {
  //   db.checklist.clear();
  // }


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
    this.loginPro.LoginAuth(this.loginForms.value).then(data => {
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
          this.router.navigateByUrl('/list-master', { replaceUrl: true });
        }
      }
    });
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

  async captureAndUploadVideo() {
    let options: CaptureVideoOptions = { limit: 1, quality: 60 };
    const mediaFiles: any = await this.mediaCapture.captureVideo(options);
    console.log(mediaFiles)
    if (mediaFiles.length > 0) {
        const videoFile: MediaFile = mediaFiles[0];
        const blob: Blob = await this.convertMediaFileToBlob(videoFile);
        console.log(blob)
        const formData = new FormData();
        formData.append('video', blob);
        // this.uploadVideo(formData);
    } else {
      console.log('abc');
    }
}

async convertMediaFileToBlob(mediaFile: MediaFile): Promise<Blob> {
    const blob: any = await this.file.readAsArrayBuffer(mediaFile.fullPath, mediaFile.name);
    console.log(blob);
    return blob;
}


  async startRecording() {
    try {
      let options: CaptureVideoOptions = { limit: 1, quality:60 }
      const data: any = await this.mediaCapture.captureVideo(options);
      console.log(data);
      this.video = data[0];
      this.uploadVideo();
      // this.file.resolveLocalFilesystemUrl(this.video.fullPath).then((entry: any) => {
      //   entry.file((file: any) => {
      //     console.log('&*&*');
      //     this.read(file);
      //   });
      // }, err => {
      //   alert(JSON.stringify(err) + 'File Not Supported');
      // });
    }  catch(e) {
      console.log('err');
      console.log(e);
    }
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
      // this.uploadVideo(formData);
    };
  }

  // uploadVideo(formData: any) {
  //   this.loginPro.uploadVideo(formData).subscribe({
  //     next:(data) => {
  //       console.log(data);
  //     },
  //     error:(err) => {
  //       console.log(err)
  //     }
  //   })
  // }

  async uploadVideo() {
    console.log('upl vid');
    if (!this.video) {
      console.error('No video captured to upload');
      return;
    }
    console.log('upl vid1');
    const videoFile = await Filesystem.readFile({
      path: this.video.fullPath,
      directory: Directory.Data, // Or appropriate directory based on your app's storage strategy
      encoding: Encoding.UTF8, // Read as binary data
    });
    console.log(videoFile);
    console.log('Video file data:', videoFile.data);

    // Now you have the video data in 'videoFile.data' (a base64-encoded string)
    // Proceed to upload this data to your server
  }

}
