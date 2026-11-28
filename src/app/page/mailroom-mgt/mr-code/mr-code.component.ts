import { Component, Input, OnChanges } from '@angular/core';
import * as qrcodeNs from 'qrcode-generator';

// library CommonJS (`export =`) aur ESM (default) dono roop me aati hai
const makeQr: any = (qrcodeNs as any).default || qrcodeNs;

/** Package ka label code (MR-XXXXXXXXXX): QR image + text */
@Component({
  selector: 'app-mr-code',
  template: `
    <div class="mr-label-code" [class.mr-label-code--big]="big">
      <img *ngIf="src" [src]="src" alt="QR code">
      <ion-icon *ngIf="!src" name="qr-code-outline"></ion-icon>
      <div>
        <span class="km-label">{{ label }}</span>
        <b>{{ value }}</b>
      </div>
    </div>`,
})
export class MrCodeComponent implements OnChanges {
  @Input() value = '';
  @Input() label = 'Label code';
  @Input() big = false;
  src = '';

  ngOnChanges() {
    this.src = '';
    if (!this.value) { return; }
    try {
      const qr = makeQr(0, 'M');   // 0 = size apne aap
      qr.addData(this.value);
      qr.make();
      this.src = qr.createDataURL(6, 8);
    } catch {
      // QR na bane to sirf text dikhega
    }
  }
}
