import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { CommonService } from '../common/common.service';
import { SomartService } from './somart.service';

/** SoMart screens ke common UI kaam: loader, toast, confirm, text maangna */
@Injectable({ providedIn: 'root' })
export class SomartUiService {

  constructor(
    private common: CommonService,
    private sm: SomartService,
    private alertCtrl: AlertController,
  ) {}

  ok(message: string) { this.common.presentToast(message, 'success'); }
  warn(message: string) { this.common.presentToast(message, 'warning'); }
  /** Server ka msg jaisa hai waisa dikhata hai */
  error(err: any) { this.common.presentToast(this.sm.msg(err), 'danger'); }

  /** Loader ke saath kaam. Fail hone par msg dikha kar undefined lautata hai. */
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

  async confirm(header: string, message: string, okText = 'Yes'): Promise<boolean> {
    const alert = await this.alertCtrl.create({
      header, message,
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: okText, role: 'confirm' }],
    });
    await alert.present();
    return (await alert.onDidDismiss()).role === 'confirm';
  }

  /** Ek text maangta hai. Cancel -> null. */
  async ask(header: string, placeholder: string, message = '', okText = 'OK'): Promise<string | null> {
    const alert = await this.alertCtrl.create({
      header, message,
      inputs: [{ name: 'text', type: 'textarea', placeholder }],
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: okText, role: 'confirm' }],
    });
    await alert.present();
    const res = await alert.onDidDismiss();
    return res.role === 'confirm' ? (res.data?.values?.text || '').trim() : null;
  }
}
