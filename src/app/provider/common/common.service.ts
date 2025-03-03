import { Injectable } from '@angular/core';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import { Network } from '@capacitor/network';
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ImageViewComponent } from 'src/app/shared/image-view/image-view.component';
import { PdfViewComponent } from 'src/app/shared/pdf-view/pdf-view.component';
@Injectable({
  providedIn: 'root'
})

export class CommonService {
  public barcode!: string;
  private isHomeLoad = new BehaviorSubject(true);
  public appVersion = new BehaviorSubject([]);
  loading: any;
  constructor(
    private toastController: ToastController,
    private loadingController: LoadingController,
    private http: HttpClient,
    private modalCtrl: ModalController
  ) { }

  setHomeLoadStatus(value: boolean) {
    this.isHomeLoad.next(value);
  }

  getHomeLoadStatus() {
    return this.isHomeLoad;
  }

  setBarcode(barcode: string) {
    this.barcode = barcode
  }

  getBarcode() {
    return this.barcode;
  }

  async presentToast(msg: any, clr: any) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 3000,
      color: clr
    });
    toast.present();
  }

  async presentToastWithOk(data: any, clr: any) {
    const toast = await this.toastController.create({
      message: data,
      position: 'bottom',
      color: clr,
      duration: 60000,
      buttons: [{
        text: 'OK',
        role: 'cancel',
        handler: () => {}
      }]
    });
    await toast.present();
    const { role } = await toast.onDidDismiss();
  }

  setImageCondition(url: string, type: string, blobType?: string) {
    // type httpurl, blob;
    if (type === 'blob') {
      this.openImg(url, blobType || 'PRIVATE');
    } else {
      this.openDoc(url)
    }
  }

  openDoc(url: any) {
    if (!url) {
      alert('Attachment Not Available');
      return;
    }
    let brecked;
    brecked = url.split('.');
    let ext;
    ext = brecked[brecked.length - 1];
    if (ext === 'pdf') {
      window.open(url, '_system', 'location=no,zoom=yes');
    } else {
      window.open(url, '_blank', 'location=no,zoom=yes');
    }
  }

  openImg(url: string, blobType: string) {
    const formData = new FormData();
    formData.append('url', url);
    formData.append('blob_name', blobType || 'PRIVATE');
    this.presentLoading().then(preLoad => {
      this.http.post(environment.url + 'blob-url', formData).subscribe({
        next:(data: any) => {
          if (data.status) {
            const filePath = data.name
            const extension = filePath.split('.').pop();
            if (extension === 'pdf') {
              this.pdfView('data:application/pdf;base64,' + data.base64);
            } else {
              this.imageView('data:' + data.contentType + ';base64,' + data.base64, null);
            }
            // const base64 = 'data:' + data.contentType + ';base64,' + data.base64;
            // this.imageView(base64, null);
            // if (data.status) {
            //   const base64 = 'data:' + data.contentType + ';base64,' + data.base64;
            //   this.imageView(base64, null);
            // } else {
            //   this.presentToast(data.msg, 'warning');
            // }
          }
        },
        error:() => {
          this.dismissloading();
          this.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    });
  }

  async pdfView(pdfSrc: string) {
    const modal = await this.modalCtrl.create({
      component: PdfViewComponent,
      componentProps: {
        pdfSrc: pdfSrc,
      }
    });
    modal.present();
  }

  async imageView(base64: any, blob: any) {
    const modal = await this.modalCtrl.create({
      component: ImageViewComponent,
      backdropDismiss: false,
      componentProps: {
        base64: base64,
        blob: blob
      }
    });
    modal.onWillDismiss().then(disModal => {

    });
    return await modal.present();
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      message: 'Please wait...',
    });
    await this.loading.present();
  }

  dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  async checkInternet() {
    return new Promise(async resolve => {
      const status = await Network.getStatus();
      resolve(status.connected);
    });
  }

  decryptValue(encryptedValue: string) {
    var encrypted: any, iv, value, key, key1, decrypted,decrypted1,regex,matches,extractedString
    encrypted = decodeURIComponent(decodeURIComponent(encryptedValue)); // double decodeURIComponent punit ne lagwai hai kyuki kuch QR Code m double encode lga hua hai pta nhi kese
    try {
      encrypted = atob(encrypted);
      encrypted = JSON.parse(encrypted);
      iv = CryptoJS.enc.Base64.parse(encrypted.iv);
      value = encrypted.value;
      key = environment.LARAVEL_KEY;
      key1 = CryptoJS.enc.Base64.parse(key);
      decrypted = CryptoJS.AES.decrypt(value, key1, {
        iv: iv
      });
      decrypted1 = decrypted.toString(CryptoJS.enc.Utf8);
      return this.extractIntegerValue(decrypted1);
    } catch {
      return '';
    }
  }

  extractIntegerValue(val: any) {
    var regex, match, extractedString;
    regex = /i:(\d+)/;
    match = val.match(regex);
    return extractedString = match ? match[1] : this.extractStringValue(val);
  }

  extractStringValue(val: any) {
    var regex, match, extractedString;
    regex = /"([^"]+)"/;
    match = val.match(regex);
    return extractedString = match ? match[1] : null;
  }

  setAppVersion(obj: any) {
    this.appVersion.next(obj);
  }

  getAppVersionObs() {
    return this.appVersion;
  }

}
