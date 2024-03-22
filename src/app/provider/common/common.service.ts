import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Network } from '@capacitor/network';
import { Observable } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})

export class CommonService {
  public barcode!: string;
  constructor(
    private toastController: ToastController
  ) { }

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
      buttons: [{
        text: 'OK',
        role: 'cancel',
        handler: () => {}
      }]
    });
    await toast.present();
    const { role } = await toast.onDidDismiss();
  }

  openDoc(url: any) {
    if (!url) {
      alert('Attachment Not Available');
      return;
    }
    console.log(url);
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

  async checkInternet() {
    return new Promise(async resolve => {
      const status = await Network.getStatus();
      resolve(status.connected);
    });
  }

  decryptValue(encryptedValue: string) {
    var encrypted: any, iv, value, key, key1, decrypted,decrypted1,regex,matches,extractedString
    encrypted = decodeURIComponent(encryptedValue);
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
      regex = /"([^"]+)"/;
      matches = decrypted1.match(regex);
      extractedString = matches ? matches[1] : null;
      return extractedString;
    } catch {
      return '';
    }
  }

}
