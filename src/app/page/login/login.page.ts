import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, MenuController, ModalController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { LoginService } from 'src/app/provider/login/login.service';
import { environment } from 'src/environments/environment';

import { File, FileEntry } from '@awesome-cordova-plugins/file/ngx';
import { MediaCapture, MediaFile, CaptureError, CaptureImageOptions, CaptureVideoOptions } from '@awesome-cordova-plugins/media-capture/ngx';
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

  changePass(_pass: any) { }

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

  async captureAndUploadVideo(_val: any) {
    let options: CaptureVideoOptions = { limit: 1, quality: 60 };
    const mediaFiles: any = await this.mediaCapture.captureVideo(options).then((res: any) => {
      let capturedFile = res;
      console.log(capturedFile);
      // console.log(capturedFile.getFormatData);
      // capturedFile.getFormatData().then((blobFile: any) => {
      //   console.log(blobFile)
      // })
      // if (val === 1) {
      //   console.log('1');
      //   let blob = new Blob([JSON.stringify(capturedFile)], { type: 'video/mp4' });
      //   console.log(blob);
      //   const formData = new FormData();
      //   formData.append('video', blob, 'a.mp4');
      //   this.uploadVideo(formData);
      // } else if (val ===  2){
      //   console.log('2')
      //   let blob1 = new Blob([JSON.stringify(res)], { type: 'video/mp4' });
      //   console.log(blob1)
      //   const formData = new FormData();
      //   formData.append('video', blob1, 'a.mp4');
      //   this.uploadVideo(formData);
      // } else if (val === 3) {
      //   console.log('3')
      //   let blob1 = new Blob([capturedFile], { type: 'video/mp4' });
      //   console.log(blob1)
      //   const formData = new FormData();
      //   formData.append('video', blob1, 'a.mp4');
      //   this.uploadVideo(formData);
      // } else if (val === 4) {
      //   console.log('4')
      //   let blob1 = new Blob([res], { type: 'video/mp4' });
      //   console.log(blob1)
      //   const formData = new FormData();
      //   formData.append('video', blob1, 'a.mp4');
      //   this.uploadVideo(formData);
      // }

      // this.file.resolveLocalFilesystemUrl(capturedFile.fullPath).then((entry: any) => {
      //   entry.file((file: any) => {
      //     // this.uploadVideo(formData);
      //     this.read(file);
      //   });
      // }, err => {
      //   alert(JSON.stringify(err) + 'File Not Supported');
      // });
      // console.log('my file', capturedFile);
      // let fileName = capturedFile.name;
      // let dir = capturedFile['localURL'].split('/');
      // dir.pop();
      // let fromDirectory = dir.join('/');
      // let toDirectory = this.file.dataDirectory;
      // this.file.copyFile(fromDirectory, fileName , toDirectory, fileName).then(res => {
      //   console.log(res);
      // }, err => {
      //   console.log(err);
      // })
    }, err=> {
      console.log('ERR--');
      console.log(err);
    });
    // console.log(mediaFiles)
    // if (mediaFiles.length > 0) {
    //     const videoFile: MediaFile = mediaFiles[0];
    //     const blob: Blob = await this.convertMediaFileToBlob(videoFile);
    //     console.log(blob)
    //     const formData = new FormData();
    //     formData.append('video', blob);
    //     // this.uploadVideo(formData);
    // } else {
    //   console.log('abc');
    // }
}

read(file: any) {
  console.log('read');
  const reader: any = new FileReader();
  reader.readAsArrayBuffer(file);
  reader.onload = () => {
    const blob = new Blob([reader.result], {
      type: file.type
    });
    console.log(blob);
  };
  this.presentLoading().then(_preLoad => {
    setTimeout(() => {
      this.dismissloading();
    }, 1000);
  });
  console.log('end');
}

async convertMediaFileToBlob(mediaFile: MediaFile): Promise<Blob> {
    const blob: any = await this.file.readAsArrayBuffer(mediaFile.fullPath, mediaFile.name);
    console.log(blob);
    return blob;
}

changeFile(ev: any) {
  console.log(ev)
  console.log((ev.target.files[0]));
  const formData = new FormData();
  formData.append('video', ev.target.files[0]);
  this.uploadVideo(formData);
}


  async startRecording() {
    try {
      let options: CaptureVideoOptions = { limit: 1, quality:60 }
      const data: any = await this.mediaCapture.captureVideo(options);
      console.log(data);
      this.video = data[0];

    }  catch(e) {
      console.log('err');
      console.log(e);
    }
  }

  uploadVideo(formData: any) {
    this.loginPro.uploadVideo(formData).subscribe({
      next:(data) => {
        console.log(data);
      },
      error:(err) => {
        console.log(err)
      }
    })
  }


}
