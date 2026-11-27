import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, NavController } from '@ionic/angular';
import { AvailKeyComponent } from '../avail-key/avail-key.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { KeysService } from 'src/app/provider/keys/keys.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { environment } from 'src/environments/environment';
import { AssetDepartmentComponent } from '../../add-asset/asset-department/asset-department.component';
import * as moment from 'moment';

@Component({
  selector: 'app-assign-key',
  templateUrl: './assign-key.component.html',
  styleUrls: ['./assign-key.component.scss'],
})
export class AssignKeyComponent implements OnInit {
  public forms!: FormGroup;
  userData: any = [];
  isKeyReq = false;
  otpConfig = {
    length: 4,
    allowNumbersOnly: true,
    inputClass: 'custom-otp-input',
    containerClass: 'custom-otp-container'
  };
  submitted = false;
  currentDate = moment().format('YYYY-MM-DDTHH:mm');
  req_data: any = [];
  constructor(
    private modalController: ModalController,
    private formbuilder: FormBuilder,
    private camera: CameraService,
    private httpKey: KeysService,
    private common: CommonService,
    private navCtrl: NavController,
    private activeRoute: ActivatedRoute
  ) {
  }

  ngOnInit() {
    this.userData = JSON.parse(localStorage.getItem('user')!);
    this.initForm();
    this.activeRoute.queryParams.subscribe((res: any) => {
      if (res.data) {
        this.req_data = JSON.parse(res.data);
        this.isKeyReq = this.req_data.require_auth == 1 ? true : false
        this.forms.get('key_id_desc')?.setValue(this.req_data.key_name);
        this.forms.get('key_id')?.setValue(this.req_data.id);
        this.forms.get('key_no')?.setValue(this.req_data.code);
        this.forms.get('key_loc')?.setValue(this.req_data.location.location_desc);
        this.forms.get('site_name')?.setValue(this.req_data.site_name);
        this.forms.get('is_on_behalf')?.setValue('');
      }
    });
  }


  initForm() {
    this.forms = this.formbuilder.group({
      key_id: ['', Validators.required],
      key_id_desc: ['', Validators.required],
      key_no: [''],
      key_loc: [''],
      room_no: [''],
      site_name: [''],
      requester_type: ['', Validators.required],
      id_photo: [''],
      requester_photo: [''],
      person_phone: ['', Validators.required],
      person_phone_status: [''],
      person_phone_otp: [''],
      person_name: ['', Validators.required],
      person_email: [''],
      department: ['', Validators.required],
      department_desc: ['', Validators.required],
      issue_by: [this.userData.user_name],
      expected_return_at: ['', Validators.required],
      notes: [''],
      is_on_behalf: ['', Validators.required],
      auth_person_name: [''],
      auth_person_email: [''],
      auth_person_phone: [''],
      auth_person_phone_status: [''],
      auth_person_phone_otp: [''],
    });
    this.handleOnBehalfChange();
  }

  handleOnBehalfChange() {
    this.forms.get('is_on_behalf')?.valueChanges.subscribe(value => {
      const nameCtrl = this.forms.get('auth_person_name');
      const phoneCtrl = this.forms.get('auth_person_phone');
      if (value === '1') {
        nameCtrl?.setValidators([Validators.required]);
        phoneCtrl?.setValidators([Validators.required]);        
      } else {
        nameCtrl?.clearValidators();
        phoneCtrl?.clearValidators();        
      }
      nameCtrl?.updateValueAndValidity();
      phoneCtrl?.updateValueAndValidity();
    });
  }

  submit() {
    this.submitted = true;    
    if (this.forms.invalid) {
      this.common.presentToast('Please Fill All Mandatory Fields', 'warning');
      return;
    }

    if (!this.forms.value.is_on_behalf) {
      this.common.presentToast('Please Select My Self or On Behalf', 'warning');
      return;
    }

    if (this.forms.value.is_on_behalf === '1' && this.forms.value.auth_person_phone_status !== 'otp_verified') {
      this.common.presentToast('Please Verify On Behalf Person Phone', 'warning');
      return
    }

    if (this.forms.value.person_phone_status !== 'otp_verified') {
      this.common.presentToast('Please Verify Phone', 'warning');
      return
    }

    if (!this.forms.value.id_photo) {
      this.common.presentToast('ID Photo is Required', 'warning');
      return
    }

    if (!this.forms.value.requester_photo) {
      this.common.presentToast('Requester ID is Required', 'warning');
      return
    }

    const formData = new FormData();
    for (const key in this.forms.value) {
      const value = this.forms.value[key];
      if (value) {
        formData.delete(key);
        if (value instanceof Blob) {
          const randomName = `image_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
          formData.append(key, value, randomName);
        } else {
          formData.append(key, value);
        }
      }
    }
    this.common.presentLoading().then(preLoad => {
      this.httpKey.assignKey(formData).subscribe({
        next: (data: any) => {
          if (data.status) {
            this.httpKey.setHomePageStatus(true);
            this.common.presentToast(data.message, 'success');
            this.navCtrl.pop();
          } else {
            this.common.presentToast(data.message, 'warning');
          }
        },
        error: (err: any) => {
          this.common.dismissloading();
          if (err.status === 400) {
            this.common.presentToast(err.error.message, 'warning');
            return;
          }
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.common.dismissloading();
        }
      });
    });
  }

  async openDepartment() {
    const modal = await this.modalController.create({
      component: AssetDepartmentComponent,
      cssClass: 'my-modal',
      componentProps: {}
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role) {        
        this.forms.get('department_desc')?.setValue(disModal.data.dept_desc);
        this.forms.get('department')?.setValue(disModal.data.dept_id);
        // this.addAsset.get('dept_id_desc')?.setValue(disModal.data.dept_desc);
        // this.addAsset.get('dept_id')?.setValue(disModal.data.dept_id);
        // this.addAsset.get('sub_dept_id')?.setValue('');
        // this.changeDepartment(disModal.data.dept_id)
      }

    });
    return await modal.present();
  }

  async openAvailKey() {
    const modal = await this.modalController.create({
      component: AvailKeyComponent,
      cssClass: 'my-modal',
      componentProps: {}
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.role === 'true') {        
        this.isKeyReq = disModal.data.require_auth == 1 ? true : false
        this.forms.get('key_id_desc')?.setValue(disModal.data.key_name);
        this.forms.get('key_id')?.setValue(disModal.data.id);
        this.forms.get('key_no')?.setValue(disModal.data.code);
        this.forms.get('room_no')?.setValue(disModal.data.room_no);
        
        this.forms.get('key_loc')?.setValue(disModal.data.location_name);
        this.forms.get('site_name')?.setValue(disModal.data.site_name);
        this.forms.get('is_on_behalf')?.setValue('');

      }
    });
    return await modal.present();
  }

  async presentActionSheet(val: string) {
    this.camera.selectImage(['camera', 'gallery'], (blob: any) => {
      if (val === '1') {
        this.forms.get('id_photo')?.setValue(blob);
      } else if (val === '2') {
        this.forms.get('requester_photo')?.setValue(blob);
      }
    });
  }

  onDateChange(event: any) {
    const selectedDateTime = event.detail.value;    
    this.forms.patchValue({
      expected_return_at: selectedDateTime
    });
  }

  // sendOtp(val: string) {
  //   let input = val === '1' ? this.forms.value.person_phone : this.forms.value.auth_person_phone;
  //   if (input.length !== 10) {
  //     this.common.presentToast('Phone No Should be 10 Digit', 'warning');
  //     return;
  //   }
  //   this.common.presentLoading().then(preLoad => {
  //     const obj = {
  //       phone: input
  //     }
  //     this.httpKey.sendOtp(obj).subscribe({
  //       next:(data: any) => {
  //         if (data.status) {
  //           this.common.presentToast(data.message, 'success');
  //           if (val === '1') {
  //             this.forms.get('person_phone_status')?.setValue('otp_sent');
  //           } else {
  //             this.forms.get('auth_person_phone_status')?.setValue('otp_sent');
  //           }
  //         } else {
  //           this.common.presentToast(data.message, 'warning');
  //         }
  //       },
  //       error:() => {
  //         this.common.dismissloading();
  //         this.common.presentToast(environment.errMsg, 'danger');
  //       },
  //       complete:() => {
  //         this.common.dismissloading();
  //       }
  //     });
  //   });
  // }

  sendOtp(type: '1' | '2') {
    const controlName = type === '1' ? 'person_phone' : 'auth_person_phone';
    const statusCtrl = type === '1' ? 'person_phone_status' : 'auth_person_phone_status';

    const phone = this.forms.value[controlName];
    if (!phone || phone.length !== 10) {
      this.common.presentToast('Phone No Should be 10 Digit', 'warning');
      return;
    }
    this.common.presentLoading().then(() => {
      this.httpKey.sendOtp({ phone }).subscribe({
        next: (res: any) => {
          this.common.presentToast(res.message, res.status ? 'success' : 'warning');
          if (res.status) {
            this.forms.get(statusCtrl)?.setValue('otp_sent');
          }
        },
        error: () => {
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.common.dismissloading();
        }
      });
    });
  }

  verifyOtp(type: '1' | '2') {
    const phoneNo = type === '1' ? 'person_phone' : 'auth_person_phone';
    const controlName = type === '1' ? 'person_phone_otp' : 'auth_person_phone_otp';
    const statusCtrl = type === '1' ? 'person_phone_status' : 'auth_person_phone_status';

    const otp = this.forms.value[controlName];
    const obj = {
      otp: otp,
      phone: this.forms.value[phoneNo]
    }
    this.common.presentLoading().then(() => {
      this.httpKey.verifyOtp(obj).subscribe({
        next: (res: any) => {
          this.common.presentToast(res.message, res.status ? 'success' : 'warning');
          if (res.status) {
            this.forms.get(statusCtrl)?.setValue('otp_verified');
          }
        },
        error: (err: any) => {          
          this.common.dismissloading();
          if (err.status === 400) {
            this.common.presentToast(err.error.message, 'warning');
            return;
          }
          this.common.presentToast(environment.errMsg, 'danger');

        },
        complete: () => {
          this.common.dismissloading();
        }
      });
    });
  }

  clear(val: string) {
    if (val === '1') {
      this.forms.get('person_phone')?.setValue('');
      this.forms.get('person_phone_status')?.setValue('');
      this.forms.get('person_phone_otp')?.setValue('');
    } else {
      // auth_person_phone: [''],
      // auth_person_phone_status: [''],
      // auth_person_phone_otp: [''],
      this.forms.get('auth_person_phone')?.setValue('');
      this.forms.get('auth_person_phone_status')?.setValue('');
      this.forms.get('auth_person_phone_otp')?.setValue('');
    }
  }

  changeDate(ev: any) {
    if (!ev.target.value) {
      return;
    }
    const selected = moment(ev.detail.value);
    const now = moment(this.currentDate).subtract(1, 'minute');
    if (selected.isBefore(now)) {
      this.common.presentToast('Time Sould be greater than ' + this.currentDate, 'warning');
      this.forms.patchValue({
        expected_return_at: ''
      });
    } else {
      this.forms.patchValue({
        expected_return_at: selected.format('YYYY-MM-DDTHH:mm:ss')
      });
    }
  }


}
