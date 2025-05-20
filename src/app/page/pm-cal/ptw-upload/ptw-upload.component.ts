import { Component, OnInit } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { CommonService } from 'src/app/provider/common/common.service';
import { PmCalService } from 'src/app/provider/pm-cal/pm-cal.service';
import { CameraService } from 'src/app/provider/camera/camera.service';
@Component({
  selector: 'app-ptw-upload',
  templateUrl: './ptw-upload.component.html',
  styleUrls: ['./ptw-upload.component.scss'],
})
export class PtwUploadComponent  implements OnInit {
  loading: any;
  formData = new FormData();
  data: any;
  img_temp!: string;
  doc_temp!: string;
  remark!: string;
  req_for!: string;
  constructor(
    private modalCtrl: ModalController,
    private loadingController: LoadingController,
    private common: CommonService,
    private httpPms: PmCalService,
    private camera: CameraService
  ) { }

  ngOnInit() {    
  }

  closeModal(data:any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  async presentActionSheet() {
    this.camera.selectImage(['camera', 'gallery'], (blob: Blob) => {
      this.readImg(blob)
    });
  }

  async readImg(photo: any) {
    let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
    this.formData.delete('attach');
    this.formData.append('attach', photo, random);
    this.img_temp = random;
    this.doc_temp = '';
  }

  changeFile(fileChangeEvent: any){
    const photo = fileChangeEvent.target.files[0];
    this.formData.delete('attach');
    this.formData.append('attach', photo, photo.name);
    this.img_temp = '';
    this.doc_temp = 'Upload';
  }

  uploadPtw() {
    if (!this.remark) {
      alert('Remark is Mandatory');
    } else if (!this.img_temp && !this.doc_temp) {
      alert('Please upload image or Document');
    } else {
      this.formData.delete('id');
      this.formData.delete('remark');
      this.formData.delete('pc_id');
      this.formData.delete('source');      

      this.formData.append('id', this.data.id);
      this.formData.append('remark', this.remark);
      this.formData.append('pc_id', this.data.pc_id);      
      this.formData.append('source', environment.source);
      if (this.req_for === 'vendor') {
        this.formData.delete('rsp_vnd_id');
        this.formData.append('rsp_vnd_id', this.data.vnd_id)
      }      
      // rsp_vnd_id;
      this.presentLoading().then(preLoad => {
        this.httpPms.uploadPtw(this.formData, this.req_for).subscribe({
          next:(res) => {
            if (res.status) {
              this.common.presentToast(res.msg, 'success');
              this.closeModal(res, true);
            } else {
              this.common.presentToast(res.msg, 'warning');
            }
          },
          error:() => {
            this.dismissloading();
            this.common.presentToast(environment.errMsg, 'danger');
          },
          complete:() => {
            this.dismissloading();
          }
        });
      });
    }
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...'
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

}
