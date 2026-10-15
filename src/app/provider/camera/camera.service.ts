import { Injectable } from '@angular/core';
import { ActionSheetController, ModalController, Platform } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CameraComponent } from 'src/app/shared/camera/camera.component';
import { PhotoViewComponent } from 'src/app/shared/photo-view/photo-view.component';

@Injectable({
  providedIn: 'root'
})
export class CameraService {

  constructor(
    private modalCtrl: ModalController,
    private actionSheetCtrl: ActionSheetController,
    private platform: Platform) { }

  async selectImage(options: string[], callback: (blob: Blob) => void, existingBlob?: Blob | null) {
    if (this.platform.is('android')) {
      options = options.map(item => (item === 'camera' ? 'outer' : item));
    } else {
      options = options.filter(item => item !== 'outer');
    }

    if (options.length === 1 && !existingBlob) {
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
    
    actionButtons.push(...this.buildSourceActionButtons(options, callback));
    if (existingBlob) {
      actionButtons.push({
        text: 'View image',
        handler: () => this.openPhotoViewModal(existingBlob)
      });
    }
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Image Source',
      buttons: actionButtons
    });

    await actionSheet.present();
  }

  private buildSourceActionButtons(options: string[], callback: (blob: Blob) => void) {
    const buttons: { text: string; handler: () => void | Promise<void> }[] = [];
    if (options.includes('camera')) {
      buttons.push({
        text: 'Camera',
        handler: () => this.openCamera(CameraSource.Camera, callback)
      });
    }
    if (options.includes('outer')) {
      buttons.push({
        text: 'Camera',
        handler: () => this.openOuterCamera(callback)
      });
    }
    if (options.includes('gallery')) {
      buttons.push({
        text: 'Gallery',
        handler: () => this.openCamera(CameraSource.Photos, callback)
      });
    }
    return buttons;
  }

  private async openPhotoViewModal(blob: Blob) {
    const modal = await this.modalCtrl.create({
      component: PhotoViewComponent,
      cssClass: 'my-modal_',
      componentProps: { blobFile: blob }
    });
    await modal.present();
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
      // Tablet width par Ionic modal ko 600x600 card bana deta hai - viewfinder
      // floating card me kaam ka nahi, isliye ye hamesha full screen rehta hai.
      cssClass: 'camera-modal',
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
