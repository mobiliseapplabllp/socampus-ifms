import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, MenuController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { LoginService } from 'src/app/provider/login/login.service';
import { environment } from 'src/environments/environment';

import { File } from '@awesome-cordova-plugins/file/ngx';
import { MediaCapture, MediaFile, CaptureVideoOptions } from '@awesome-cordova-plugins/media-capture/ngx';
// import { Capacitor } from '@capacitor/core';
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
    private file: File,

  ) {
    this.loginForms = formbuilder.group({
      userid: ['', Validators.required],
      password: ['' , Validators.required],
    });
  }

//   import { Capacitor, Filesystem } from '@capacitor/core';

// async function convertFileToBlob(fullPathOrLocalURL: string): Promise<Blob | null> {
//   // Check if it's a local file path
//   if (fullPathOrLocalURL.startsWith('file:///')) {
//     try {
//       const fileData = await Filesystem.readFile({ path: fullPathOrLocalURL });
//       return new Blob([fileData.data], { type: getMimeType(fullPathOrLocalURL) });
//     } catch (err) {
//       console.error('Error reading file:', err);
//       return null;
//     }
//   } else {
//     // Handle downloaded resources based on your download method (replace with your logic)
//     // ...
//   }
// }

// function getMimeType(fullPath: string): string {
//   // Implement logic to determine the MIME type based on file extension or other information
//   const extension = fullPath.split('.').pop();
//   // Use a mapping or logic to get the MIME type based on extension
//   return 'application/octet-stream'; // Default if type can't be determined
// }

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

  convertToLocalBlob(localURL: string): Promise<Blob> {
    console.log(localURL);
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', localURL, true);
      xhr.responseType = 'blob';
      console.log('a');
      xhr.onload = () => {
        console.log('XHR status:', xhr.status);
        if (xhr.status === 200) {
          const blob = xhr.response;
          resolve(blob);
        } else {
          reject(new Error('Failed to fetch file'));
        }
      };

      xhr.onerror = () => {
        console.error('XHR error:', xhr.statusText);
        reject(new Error('Failed to fetch file'));
      };

      xhr.send();
    });
  }

  // convertMediaFileToBlobM(mediaFile: any): Promise<Blob> {
  //   return new Promise((resolve, reject) => {
  //     const xhr = new XMLHttpRequest();
  //     xhr.open('GET', mediaFile.localURL, true);
  //     xhr.responseType = 'blob';
  //     console.log('1');
  //     xhr.onload = () => {
  //       console.log('2');
  //       if (xhr.status === 200) {
  //         console.log('3');
  //         const blob = xhr.response;
  //         console.log(blob);
  //         resolve(blob);
  //       } else {
  //         console.log(4);
  //         reject(new Error('Failed to fetch file'));
  //       }
  //     };

  //     xhr.onerror = () => {
  //       reject(new Error('Failed to fetch file'));
  //     };

  //     xhr.send();
  //   });
  // }

  readFileAsUint8Array(file: any) {
    var reader = new FileReader();
    console.log('aaa');
    reader.onload = function(evt: any) {
        if (evt.target.readyState == FileReader.DONE) {
            var arrayBuffer = evt.target.result;
            var uint8Array = new Uint8Array(arrayBuffer);
            console.log(uint8Array);
        }
    };
    reader.readAsArrayBuffer(file);
}

  async captureAndUploadVideo(_val: any) {
    console.log('hell');
    let options: CaptureVideoOptions = { limit: 1, quality: 60 };
    // this.mediaCapture.captureImage(options).then((data: MediaFile[]) => console.log(data), (err: CaptureError) => console.error(err));
    this.mediaCapture.captureVideo(options).then(async (_data: any) => {
      const response = await fetch(_data[0].localURL);
      const blob = await response.blob();
      console.log(blob);
      const response1 = await fetch(_data[0].fullPath);
      const blob1 = await response1.blob();
      console.log(blob1);
      // const rspsn = Capacitor.convertFileSrc(_data[0].localURL)
      // console.log('====');
      // console.log(rspsn);
      // console.log('+++++');
      // const rspsn1 = Capacitor.convertFileSrc(_data[0].fullPath)
      // console.log('*****')
      // console.log(rspsn1);
      // console.log('$$$$')
      // const rspsn2 = Capacitor.convertFileSrc(_data[0])
      // console.log('((((')
      // console.log(rspsn2);
      // console.log('))))')
      // const rspsn3 = Capacitor.convertFileSrc(_data)
      // console.log('[][][]')
      // console.log(rspsn3);
      // console.log('[][][]')
    }, _err => {

    });


    // const mediaFiles: any = await this.mediaCapture.captureVideo(options)
    // mediaFiles.getFormatData().then((res: any) => {
    //   console.log(res)
    // })
    // return;
    const mediaFiles1: any = await this.mediaCapture.captureVideo(options).then((res: any) => {
      this.readFileAsUint8Array(res[0])
      // let capturedFile = res[0];
      // console.log(capturedFile);
      // console.log(capturedFile.fullPath);
      // mediaFiles.getFormatData
      // fetch(capturedFile.localURL).then(response => response.blob()).then(blob => {
      //   console.log('local url 1')
      //   console.log(blob);
      //   console.log('local url 2')
      // })
      // fetch(capturedFile.fullPath).then(response => response.blob()).then(blob => {
      //   console.log('full url 1')
      //   console.log(blob);
      //   console.log('full url 2')
      // })
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
      //     console.log(file);
      //     var blob = new Blob([new Uint8Array(file)], { type: file.type });
      //     console.log(blob)
      //     return;
      //     var reader = new FileReader();
      //     reader.onloadend = function() {
      //         console.log("Successful file read: " + this.result);
      //         // displayFileData(fileEntry.fullPath + ": " + this.result)
      //         var blob = new Blob([new Uint8Array(this.result)], { type: file.type });
      //         console.log(blob)
      //     };

      //     reader.readAsArrayBuffer(file);


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
