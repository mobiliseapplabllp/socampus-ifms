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
      let random = 'eyJpdiI6IkxJTmNzdVNrekZQQVY3ZFR6OWhUZmc9PSIsInZhbHVlIjoiL3krUTF3UTR4dUhBblNRUVlWUWVPeGNmV2pVRmNUSmRIdzF5VU5TMWpZYz0iLCJtYWMiOiJkMzc5NTQ3MWZiODQ0ZTMyOTk5MWRmMTg4MTBmYzBhOGQyMWJlYjU5MjUyYmQyZDZhNDlkMDExNDI4N2ViYTVlIn0%3D';
      // let random = 'https://ifmsuat.mobilisepro.com/#/create-ticket-qr-code/eyJpdiI6Ii8xUmxlTjhyMkRFVUQ1WkVabHQvTmc9PSIsInZhbHVlIjoiVHhZUGJveXord3RqdjB0eHlYZDdjTjYwejArUXpuQ0lYMEUzdy96Wmp1ST0iLCJtYWMiOiI0ZGExYzc0MWQ3OGQ0ODU3ZjVjYjAzOGFiYTIzZDRhMTA0ZTExOTY2Yjc1NTY3ZGFjZDQ5MDFlNGQzYzlmZjk0In0%3D';
      // https://ifmsuat.mobilisepro.com/#/complaint-qr-code/eyJpdiI6InZqV3ljU3gweE5mcDJuMm5DTHNTZWc9PSIsInZhbHVlIjoibEdNZlR5YVc3SDJFM1FxZGdwaXBrQT09IiwibWFjIjoiZGY0OGViNDdhYmFhN2M5NzY5NzFmMjIxNmJhZjY5OGYzYjBhZTAwNWZlM2U2YjNkMjAxMGNlNjYxNWIxM2VlNiJ9
      // https://ifmsuat.mobilisepro.com/#/complaint-qr-code/eyJpdiI6Ikkwcnd4YlNZWlY1SUJXaTd6akRHUlE9PSIsInZhbHVlIjoiaHdBd3JVcDJiT09qY2M1NDV4dkZsQT09IiwibWFjIjoiOTdmMmM0YTM1NGZjYWYwNmI3NzI5OTZhNjg1NzMzMmJlODJiMDIyNjkzZTdiYmY4MzlmMGNmZjgyNjRiNzYxMyJ9
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
}
