import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { CameraPreview } from '@capacitor-community/camera-preview';
import { ModalController } from '@ionic/angular';
@Component({
  selector: 'app-camera',
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.scss'],
})
export class CameraComponent  implements OnInit {
  cameraActive = false;
  finalImage: any;
  finalBlob: any;
  constructor(
    private modal: ModalController,
    private sanitizer: DomSanitizer) { }

  ngOnInit() {}

  // Modal ka layout ban jaane ke baad hi preview start karna hai, warna
  // #content ka size 0 milta hai - isliye ngOnInit ki jagah ionViewDidEnter
  ionViewDidEnter() {
    this.launchCamera();
  }

  launchCamera() {
    // Native preview screen-coordinates me draw hota hai aur 'parent' ko
    // native par ignore karta hai - isliye footer ke upar wala asli area
    // naap kar wahi x/y/width/height dete hain, phone ho ya tablet
    const rect = document.getElementById('content')?.getBoundingClientRect();
    CameraPreview.start({
      parent: 'content',
      className: '',
      x: Math.round(rect?.left ?? 0),
      y: Math.round(rect?.top ?? 0),
      width: Math.round(rect?.width || window.innerWidth),
      height: Math.round(rect?.height || window.innerHeight - 150),
      toBack: false,
      disableAudio: true,
      disableExifHeaderStripping: false
    }).catch(res => {
      alert(JSON.stringify(res));
    });
    this.cameraActive = true;
  }

  async takePicture() {
    const result = await CameraPreview.capture({quality: 70});
    const base64Response = await fetch(`data:image/jpeg;base64,${result.value}`);
    this.finalBlob = await base64Response.blob();
    this.finalImage = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(this.finalBlob));;
    await CameraPreview.stop();
    // this.stopCamera(this.finalBlob, true);
  }

  retry() {
    // Pehle finalImage clear karo taaki *ngIf se #content wapas render ho,
    // tabhi launchCamera use naap payega
    this.finalImage = '';
    setTimeout(() => this.launchCamera(), 50);
  }

  done() {
    this.stopCamera(this.finalBlob, true);
  }

  async stopCamera(img: any, status: any) {
    this.closeModal(img, status);
  }

  async flipCamera() {
    await CameraPreview.flip();
  }

  async closeAction(data: any, status: any) {
    await CameraPreview.stop();
    this.closeModal(data, status);
  }

  async closeModal(data: any, status: any) {
    // await CameraPreview.stop();
    this.modal.dismiss(data, status)
  }

  b64toBlob(b64Data: string, contentType = '', sliceSize = 512): Blob {
    const byteCharacters = atob(b64Data);
    const byteArrays: Uint8Array[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }

  convertImage(base64Data: string, contentType: string): void {
    const blob = this.b64toBlob(this.btoaUTF8(base64Data), contentType);
    this.stopCamera(blob, true);
  }

  btoaUTF8(unicodeString: string): string {
    return btoa(decodeURIComponent(encodeURIComponent(unicodeString)));
  }
}
