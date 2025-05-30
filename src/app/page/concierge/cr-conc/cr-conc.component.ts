import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, NavController } from '@ionic/angular';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { ConciergeService } from 'src/app/provider/concierge/concierge.service';
import { CostCenterComponent } from 'src/app/shared/cost-center/cost-center.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-cr-conc',
  templateUrl: './cr-conc.component.html',
  styleUrls: ['./cr-conc.component.scss'],
})
export class CrConcComponent  implements OnInit {
  isAttachment = false;
  formData = new FormData();
  public forms!: FormGroup;
  categoryArr: any = [];
  subCatArr: any = [];
  userData: any = [];
  constructor(
    private cameraService: CameraService,
    private formbuilder: FormBuilder,
    private modalController: ModalController,
    private httpConcierge: ConciergeService,
    private common: CommonService,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    this.userData = JSON.parse(localStorage.getItem('user')!);   
    this.initForm();
  }

  initForm() {
    this.forms = this.formbuilder.group({
      site_id: ['', Validators.required],
      site_id_desc: ['', Validators.required],
      request_for: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', Validators.required],
      mobile: ['', Validators.required],
      cat_id: ['', Validators.required],
      subcat_id: ['', Validators.required],
      tckt_response: ['', Validators.required],
      tckt_resolve: ['', Validators.required],
      billed_to: ['', Validators.required],
      priority: ['', Validators.required],
      remark: ['', Validators.required],
      document_type: ['Attachment'],
      source: [environment.source],
    });

  }

  changeRequest() {
    if (this.forms.get('request_for')?.value === 'Self') {
      this.forms.get('name')?.setValue(this.userData.user_name);
      this.forms.get('email')?.setValue(this.userData.email);
      this.forms.get('mobile')?.setValue(this.userData.mobile);
    } else {
      this.forms.get('name')?.setValue('');
      this.forms.get('email')?.setValue('');
      this.forms.get('mobile')?.setValue('');
    }
  }

  attachment() {
    this.cameraService.selectImage(['camera', 'gallery'], (blob: any) => {
      let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg';
      this.isAttachment = true;
      this.formData.delete('document');
      this.formData.append('document', blob, random);
    });
  }

  async openRoName() {
    const modal = await this.modalController.create({
      component: CostCenterComponent,
      cssClass: 'my-modal',
      componentProps : { }
    });
    modal.onWillDismiss().then((disModal: any) => {      
      if (disModal.role) {
        this.forms.get('site_id')?.setValue(disModal.data.value);
        this.forms.get('site_id_desc')?.setValue(disModal.data.label);
        this.getCategory(disModal.data.value);
      }
    });
    return await modal.present();
  }

  getCategory(id: any) {
    const formData = new FormData();
    formData.append('site_id', id);
    this.common.presentLoading().then(preLoad => {
      this.httpConcierge.getCategory(formData).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.categoryArr = data.data;
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.common.dismissloading();
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    });
  }

  changeCategory() {
    const formData = new FormData();
    formData.append('cat_id', this.forms.get('cat_id')?.value);
    formData.append('site_id', this.forms.get('site_id')?.value);
    this.getSubCategory(formData);
  }

  getSubCategory(formData: any) {
    this.common.presentLoading().then(preLoad => {
      this.httpConcierge.getSubCategory(formData).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.subCatArr = data.data;
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.common.dismissloading();
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    });
  }

  changeSubCat() {
    const formData = new FormData();
    formData.append('cat_id', this.forms.get('cat_id')?.value);
    formData.append('site_id', this.forms.get('site_id')?.value);
    formData.append('subcat_id', this.forms.get('subcat_id')?.value);
    this.getResponseTime(formData);
  }

  getResponseTime(formData: any) {
    this.common.presentLoading().then(preLoad => {
      this.httpConcierge.getResponseTime(formData).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.forms.get('tckt_response')?.setValue(data.data.tat_response);
            this.forms.get('tckt_resolve')?.setValue(data.data.tat_resolve);
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.common.dismissloading();
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    });
  }

  submit() {
    for (const key in this.forms.value) {
      this.formData.delete(key);
      this.formData.append(key, this.forms.get(key)?.value);
    }
    this.common.presentLoading().then(preLoad => {
      this.httpConcierge.createTicket(this.formData).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.navCtrl.pop();
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.common.dismissloading();
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    });
  }
}

