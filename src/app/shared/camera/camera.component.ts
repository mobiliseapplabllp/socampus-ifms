import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { CameraPreview } from '@capacitor-community/camera-preview';
import { ModalController } from '@ionic/angular';
@Component({
  selector: 'app-camera',
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.scss'],
})
export class CameraComponent  implements OnInit, OnDestroy {
  cameraActive = false;
  finalImage: any;
  finalBlob: any;

  private starting = false;
  private fallbackTimer: any;
  private resizeTimer: any;
  private readonly onResize = () => {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => this.refitPreview(), 250);
  };

  constructor(
    private modal: ModalController,
    private sanitizer: DomSanitizer) { }

  ngOnInit() {
    window.addEventListener('resize', this.onResize);
    // Safety net: agar is modal ke liye ionViewDidEnter kabhi fire na ho to
    // thoda late preview chalega - bilkul na chalne se behtar.
    this.fallbackTimer = setTimeout(() => this.launchCamera(), 600);
  }

  /**
   * Enter animation poori hone ke BAAD hi start karo.
   *
   * ngOnInit modal ke animate hote waqt chalta hai - layout tab tak settle
   * nahi hota. Isi wajah se pehle Retry ke baad preview sahi dikhta tha par
   * pehli baar galat: tab tak layout settle ho chuka hota tha.
   */
  ionViewDidEnter() {
    this.launchCamera();
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onResize);
    clearTimeout(this.resizeTimer);
    clearTimeout(this.fallbackTimer);
    this.stopPreview();
  }

  ionViewDidLoad() {}

  async launchCamera() {
    if (this.starting || this.cameraActive) {
      return;
    }
    this.starting = true;
    clearTimeout(this.fallbackTimer);
    try {
      // Full screen aur WebView ke PEECHHE. Pehle screen.height-150 jaisa
      // napa hua size diya jaata tha - kisi phone par gap aata tha, tablet
      // par footer hi dhak jaata tha. Peechhe hone par napne ko kuch hai hi
      // nahi: HTML footer hamesha upar rehta hai aur preview ka neechla hissa
      // bas dhak deta hai. WebView ko transparent plugin khud karta hai.
      await CameraPreview.start({
        // parent sirf web par kaam karta hai: wahan plugin is div me <video>
        // daal deta hai. Android aur iOS ise ignore karke toBack use karte hain.
        parent: 'previewArea',
        toBack: true,
        disableAudio: true,
        disableExifHeaderStripping: false,
      });
      // Preview ke upar ki har layer see-through chahiye, aur is modal ke
      // neeche ka app content nahi dikhna chahiye - dono global.scss me isi
      // class se scoped hain.
      document.body.classList.add('camera-preview-active');
      this.cameraActive = true;
    } catch (res) {
      alert(JSON.stringify(res));
    } finally {
      this.starting = false;
    }
  }

  /** Native preview band karo aur WebView ko uske backgrounds wapas do. */
  private async stopPreview() {
    document.body.classList.remove('camera-preview-active');
    this.cameraActive = false;
    await CameraPreview.stop().catch(() => { });
  }

  /** Tablet ghumane par screen resize hota hai - preview restart karna padta hai. */
  private async refitPreview() {
    if (!this.cameraActive || this.finalImage) {
      return;
    }
    await this.stopPreview();
    await this.launchCamera();
  }

  async takePicture() {
    const result = await CameraPreview.capture({quality: 70});
    const base64Response = await fetch(`data:image/jpeg;base64,${result.value}`);
    this.finalBlob = await base64Response.blob();
    this.finalImage = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(this.finalBlob));;
    await this.stopPreview();
  }

  async retry() {
    this.finalImage = '';
    await this.launchCamera();
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
    await this.stopPreview();
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
