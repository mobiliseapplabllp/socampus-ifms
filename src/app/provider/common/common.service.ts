import { Injectable } from '@angular/core';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
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

  /**
   * Abhi ki location. Browser me GPS nahi milta (development), isliye wahan hamesha
   * office wali dummy location - warna har form "Location not available" par atak jaata hai.
   * Phone par hamesha asli GPS.
   */
  async currentPosition(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
    if (!Capacitor.isNativePlatform()) {
      return { lat: 28.469259641634423, lng: 77.30539182504319, accuracy: 10 };
    }
    try {
      const res = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000 });
      return {
        lat: res.coords.latitude,
        lng: res.coords.longitude,
        accuracy: res.coords.accuracy || 0
      };
    } catch (e) {
      console.error('currentPosition', e);
      return null;
    }
  }

  async presentToast(msg: any, clr: any, pos?: any) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 3000,
      color: clr,
      position: 'top'
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
    formData.append('blob_name', blobType || ' ');
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

  async presentLoading(msg?: string) {    
    this.loading = await this.loadingController.create({
      message: msg ? msg : 'Please Wait...',
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

  async checkNetworkSpeed(): Promise<'Fast' | 'Moderate' | 'Slow' | 'No Internet'> {
    const { connected } = await Network.getStatus();
    console.log('Connected:', connected);
    if (!connected) {
      return 'No Internet';
    }
    
    const testUrl = environment.url1 + 'img/px.gif';
    const startTime = Date.now();

    try {
      await firstValueFrom(this.http.get(testUrl, { responseType: 'blob' }));

      const duration = Date.now() - startTime;
      console.log('Response time (ms):', duration);

      let speed: 'Fast' | 'Moderate' | 'Slow';
      if (duration < 500) speed = 'Fast';
      else if (duration < 1500) speed = 'Moderate';
      else speed = 'Slow';

      return speed;
    } catch (error) {
      console.error('Speed check error:', error);
      return 'No Internet';
    }
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
