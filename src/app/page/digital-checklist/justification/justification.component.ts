import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-justification',
  templateUrl: './justification.component.html',
  styleUrls: ['./justification.component.scss'],
})
export class JustificationComponent  implements OnInit {
  data: any;
  view_status!: string;
  view_obj: any;
  isUpdate = false;
  image: any;
  remark!: string;
  isImgDeleted = false;
  constructor(
    private modalCtrl: ModalController,
    private httpDigi: DigitalChecklistService,
    private common: CommonService,
    private camera: CameraService,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {    
    this.getJust();
  }

  getJust() {
    this.common.presentLoading().then(preLoad => {
      this.httpDigi.getJustification(this.data.schedule_id).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.view_status = data.data.view_status;
            this.view_obj = data.data;
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading();
        }
      });  
    });    
  }

  closeModal() {
    this.modalCtrl.dismiss()
  }

  async openCamera() {
    this.camera.selectImage(['camera', 'gallery'], (blob: Blob) => {
      this.image = blob;
    });
  }

  submit() {
    if (this.isUpdate) {
      this.updateAction();
    } else {
      this.addAction();
    }
  }


  addAction() {
    console.log('add');
    // console.log(this.isUpdate);
    // console.log(this.view_obj);
    // return;
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
    const formData = new FormData();
    formData.append('schedule_id', this.data.schedule_id);
    formData.append('remark', this.remark);
    if (this.image) {
      formData.append('attachment', this.image, random);  
    }
    
    this.common.presentLoading().then(preLoad => {
      this.httpDigi.submitJusti(formData).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.closeModal();
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    });
  }

  updateAction() {
    console.log('update');
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
    const formData = new FormData();
    formData.append('id', this.view_obj.id);
    formData.append('remark', this.remark);
    if (this.image) {
      formData.append('attachment', this.image, random);
    }
    if (this.isImgDeleted) {
      formData.append('is_img_delete', 'true');
    }
    
    this.common.presentLoading().then(preLoad => {
      this.httpDigi.updateJusti(formData).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.closeModal();
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    });
  }

  async presentAlert(id: any) {    
    const confirm = await this.alertCtrl.create({
      message: 'Are you Sure want to Delete?',
      buttons: [{
        text: 'Cancel',
        handler: () => {}
      }, {
        text: 'Confirm',
        handler: () => {
          this.delete(id);
        }
      }]
    });
    await confirm.present();
  }

  delete(id: any) {
    this.common.presentLoading().then(preLoad => {
      this.httpDigi.deleteJust(id).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.closeModal();
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    })
    
  }

  openImg(url: string) {
    this.common.openImg(url, 'PRIVATE');
  }

  changeEdit() {
    this.view_status = 'add';
    this.isUpdate = true;
    this.remark = this.view_obj.remark;
    this.image = null;
    this.isImgDeleted = false;
  }

  hasExistingImage(): boolean {
    return this.isUpdate && !!this.view_obj?.attachment && !this.isImgDeleted;
  }

  // Yahan sirf flag set hota hai - server se asli delete Update dabane par
  // is_img_delete ke saath hota hai, tab tak Undo se wapas aa sakta hai
  async removeExistingImage() {
    const confirm = await this.alertCtrl.create({
      message: 'Remove this attachment?',
      buttons: [{
        text: 'Cancel',
        handler: () => {}
      }, {
        text: 'Confirm',
        handler: () => {
          this.isImgDeleted = true;
        }
      }]
    });
    await confirm.present();
  }

  undoRemoveImage() {
    this.isImgDeleted = false;
  }

}
