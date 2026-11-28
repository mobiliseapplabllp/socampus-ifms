import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { CameraService } from '../camera/camera.service';
import { CommonService } from '../common/common.service';
import { MailroomService } from './mailroom.service';
import { SignatureComponent } from 'src/app/shared/signature/signature.component';

/** Mailroom screens ke common UI kaam: loader, toast, confirm, photo, signature, scan */
@Injectable({ providedIn: 'root' })
export class MailroomUiService {

  constructor(
    private common: CommonService,
    private mr: MailroomService,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private camera: CameraService,
    private router: Router,
  ) {}

  ok(message: string) { this.common.presentToast(message, 'success'); }
  warn(message: string) { this.common.presentToast(message, 'warning'); }
  /** Server ka message dikhata hai (403 par bhi - retry nahi) */
  error(err: any) { this.common.presentToast(this.mr.msg(err), 'danger'); }

  /** Loader ke saath kaam. Fail hone par message dikha kar undefined lautata hai. */
  async busy<T>(work: () => Promise<T>, message?: string): Promise<T | undefined> {
    await this.common.presentLoading(message);
    try {
      return await work();
    } catch (err) {
      this.error(err);
      return undefined;
    } finally {
      this.common.dismissloading();
    }
  }

  /** Jab error khud sambhalna ho (jaise galat pickup code) - loader alag se */
  showLoader(message?: string) { return this.common.presentLoading(message); }
  hideLoader() { this.common.dismissloading(); }

  async confirm(header: string, message: string, okText = 'Yes'): Promise<boolean> {
    const alert = await this.alertCtrl.create({
      header, message,
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: okText, role: 'confirm' }],
    });
    await alert.present();
    return (await alert.onDidDismiss()).role === 'confirm';
  }

  /** Ek text maangta hai. Cancel -> null. */
  async ask(header: string, placeholder: string, value = '', message = ''): Promise<string | null> {
    const alert = await this.alertCtrl.create({
      header, message,
      inputs: [{ name: 'text', type: 'textarea', placeholder, value }],
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'OK', role: 'confirm' }],
    });
    await alert.present();
    const res = await alert.onDidDismiss();
    return res.role === 'confirm' ? (res.data?.values?.text || '').trim() : null;
  }

  /** Ek option chunwata hai. Cancel -> null. */
  async choose(header: string, options: { label: string; value: any }[], selected?: any): Promise<any | null> {
    const alert = await this.alertCtrl.create({
      header,
      inputs: options.map(o => ({ type: 'radio' as const, label: o.label, value: o.value, checked: o.value === selected })),
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'OK', role: 'confirm' }],
    });
    await alert.present();
    const res = await alert.onDidDismiss();
    const v = res.data?.values;
    return res.role === 'confirm' && v !== undefined && v !== null ? v : null;
  }

  /** Camera / gallery se photo, compress karke (1024 px, JPEG 0.75) data URL deta hai */
  photo(done: (dataUrl: string) => void) {
    this.camera.selectImage(['camera', 'gallery'], async (blob: Blob) => {
      try {
        done(await this.mr.compressImage(blob));
      } catch (err) {
        this.error(err);
      }
    });
  }

  /** Signature pad -> PNG data URL. Cancel -> null. */
  async signature(): Promise<string | null> {
    const modal = await this.modalCtrl.create({ component: SignatureComponent, backdropDismiss: false });
    await modal.present();
    const res = await modal.onWillDismiss();
    return res.data || null;
  }

  viewImage(dataUrl: string) { this.common.imageView(dataUrl, null); }

  /** Scanner kholna. Wapas aane par (ionViewDidEnter) takeScan() se code milta hai. */
  startScan() {
    this.common.setBarcode('');
    this.router.navigateByUrl('/barcode?formats=all');
  }

  takeScan(): string {
    const code = (this.common.getBarcode() || '').trim();
    this.common.setBarcode('');
    return code;
  }
}
