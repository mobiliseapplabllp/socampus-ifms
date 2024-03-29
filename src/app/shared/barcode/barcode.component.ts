import { Component, OnInit } from '@angular/core';
import { BarcodeScanner, SupportedFormat } from '@capacitor-community/barcode-scanner';
import { ModalController, NavController, Platform } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
@Component({
  selector: 'app-barcode',
  templateUrl: './barcode.component.html',
  styleUrls: ['./barcode.component.scss'],
})
export class BarcodeComponent  implements OnInit {
  barcodeNo: any;
  constructor(
    private navCtrl: NavController,
    private platform: Platform,
    private common: CommonService
  ) { }

  ngOnInit() { }

  ionViewDidEnter() {
    if (this.platform.is('capacitor')) {
      this.startScan();
    } else {
      // let random = 'https://ifmsuat.mobilisepro.com/#/complaint-qr-code/eyJpdiI6Ik5vK0lmejRkbVdncHlrSXE4NzdzUEE9PSIsInZhbHVlIjoiN3h0U0x2dWorSS9YNzI3dXFaVHJsUT09IiwibWFjIjoiYzM0MDk5NGM4OWEyZmUzMmQ0NTA1MGJkYWJjMmRjZjBjNWU1NjdjMWQ5YjE3NzY2MDU0NDdkZDJjNGE5OTAyZSJ9';
      let random = 'https://ifmsuat.mobilisepro.com/#/complaint-qr-code/eyJpdiI6InZWL0ZuS01zTXNCTjgxTmx1eWluVWc9PSIsInZhbHVlIjoiT0JDNFlIL3F4ZVI1SUM3OXgrK3F0UT09IiwibWFjIjoiN2YzYzYzOWQ3Y2UxNmM4OTQ3YjdlMzAwZjFiZDQ1OWY1MDIwNDNkNTJlMjNlMGYyNDAzM2E2ZjM1MjhiYjc1YyJ9'
      this.barcodeNo = random;
      setTimeout(() => {
        this.common.setBarcode(this.barcodeNo);
        this.navCtrl.pop();
      }, 1000);
    }
  }

  ionViewDidLeave() {
    this.stopScan();
  }

  startScan() {
    const startScan = async () => {
      const status = await BarcodeScanner.checkPermission({ force: true });
      if(status.denied) {
        const c = confirm('If you want to grant permission for using your camera, enable it in the app settings.');
        if (c) {
          BarcodeScanner.openAppSettings();
        }
      } else {
        BarcodeScanner.prepare();
        BarcodeScanner.hideBackground();
        document.querySelector('body')?.classList.add('scanner-active');
        const result = await BarcodeScanner.startScan({ targetedFormats: [SupportedFormat.QR_CODE] });
        if (result.hasContent) {
          this.barcodeNo = result.content
          console.log(result.content);
          this.common.setBarcode(this.barcodeNo);
          this.stopScan();
          this.navCtrl.pop();
        }
      }
    };
    startScan();
  }

  stopScan() {
    const stopScan = () => {
      document.querySelector('body')?.classList.remove('scanner-active');
      BarcodeScanner.showBackground();
      BarcodeScanner.stopScan();
    };
    stopScan();
  }

  stopScanner() {
    this.stopScan();
    this.navCtrl.pop();
  }
}
