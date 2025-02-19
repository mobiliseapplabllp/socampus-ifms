import { Injectable } from '@angular/core';
import { ActionSheetController, ModalController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CameraComponent } from 'src/app/shared/camera/camera.component';

@Injectable({
  providedIn: 'root'
})
export class CameraService {

  constructor(
    private modalCtrl: ModalController,
    private actionSheetCtrl: ActionSheetController) { }

  async selectImage(options: string[], callback: (blob: Blob) => void) {
    if (options.length === 1) {
      const option = options[0];
      if (option === 'camera') {
        return this.openCamera(CameraSource.Camera, callback);
      } else if (option === 'gallery') {
        return this.openCamera(CameraSource.Photos, callback);
      } else if (option === 'outer') {
        return this.openOuterCamera(callback);
      }
    }

    const actionButtons = [];
    if (options.includes('camera')) {
      actionButtons.push({
        text: 'Camera',
        handler: () => this.openCamera(CameraSource.Camera, callback)
      });
    }
    if (options.includes('gallery')) {
      actionButtons.push({
        text: 'Gallery',
        handler: () => this.openCamera(CameraSource.Photos, callback)
      });
    }
    if (options.includes('outer')) {
      actionButtons.push({
        text: 'Custom Camera',
        handler: () => this.openOuterCamera(callback)
      });
    }

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Image Source',
      buttons: actionButtons
    });

    await actionSheet.present();
  }

  private async openCamera(source: CameraSource, callback: (blob: Blob) => void) {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: source
    });
    const blob = await this.convertToBlob(image);
    callback(blob);
  }

  private async convertToBlob(photo: any): Promise<Blob> {
    const response = await fetch(photo.webPath);
    return await response.blob();
  }

  private async openOuterCamera(callback: (blob: Blob) => void) {
    const modal = await this.modalCtrl.create({
      component: CameraComponent,
      backdropDismiss: false
    });

    modal.onWillDismiss().then(disModal => {
      if (disModal.data) {
        callback(disModal.data);
      }
    });

    await modal.present();
  }


}
