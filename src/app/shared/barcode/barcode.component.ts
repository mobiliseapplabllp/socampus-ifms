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
  torchStatus = false;
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
      let random = 'https://socampusstaging.mobilisepro.com/#/create-ticket-qr-code/eyJpdiI6Imo3ZG03bWszdDNRSFIxZmU5aW1laWc9PSIsInZhbHVlIjoieTZmTUJ0bVFqUWRHNExRVk9aTVF0SEJsc056ZVJseUViZzdYVGNCRkNFST0iLCJtYWMiOiI3ZDk4ODg4NDliMTUxOTcyNjMyZjljZWQ3NTU3NzNiMTg0NWFkNzY1ZjZkOTkzOTVkYjI1NDUyMjVkN2ViNmEzIiwidGFnIjoiIn0%3D';
      this.barcodeNo = random;
      setTimeout(() => {
        this.common.setBarcode(this.barcodeNo);
        this.navCtrl.pop();
      }, 2000);
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

  torchToggle() {
    if (this.torchStatus === false) {
      BarcodeScanner.enableTorch();
      this.torchStatus = true;
    } else {
      BarcodeScanner.disableTorch();
      this.torchStatus = false;
    }
  }
}
