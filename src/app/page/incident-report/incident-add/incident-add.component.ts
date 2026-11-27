import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalController, NavController } from '@ionic/angular';
import * as moment from 'moment';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { IncidentService } from 'src/app/provider/incident/incident.service';
import { CostCenterComponent } from 'src/app/shared/cost-center/cost-center.component';
import { environment } from 'src/environments/environment';
import { IncidentPickerComponent } from '../incident-picker/incident-picker.component';

@Component({
  selector: 'app-incident-add',
  templateUrl: './incident-add.component.html',
  styleUrls: ['./incident-add.component.scss'],
})
export class IncidentAddComponent implements OnInit {
  public forms!: FormGroup;
  submitted = false;
  maxDate = moment().format('YYYY-MM-DD');
  incidentTypes: any[] = [];
  departments: any[] = [];
  attachment: Blob | null = null;
  readonly maxFileSize = 5 * 1024 * 1024; // backend limit: 5 MB

  constructor(
    private formbuilder: FormBuilder,
    private modalController: ModalController,
    private common: CommonService,
    private camera: CameraService,
    private navCtrl: NavController,
    private router: Router,
    public httpIncident: IncidentService
  ) { }

  ngOnInit() {
    this.initForm();
    this.getIncidentTypes();
    this.getDepartments();
  }

  initForm() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.forms = this.formbuilder.group({
      pc_id: [''],
      pc_desc: ['', Validators.required],
      incident_date: [moment().format(), Validators.required],
      incident_time: [moment().format(), Validators.required],
      incident_type_id: ['', Validators.required],
      department_id: [''],
      department_desc: ['', Validators.required],
      reported_by: [user?.user_name || '', Validators.required],
      severity: ['Low', Validators.required],
      location: [''],
      description: ['', Validators.required],
      immediate_action_taken: ['']
    });
  }

  getIncidentTypes() {
    this.httpIncident.getIncidentTypes().subscribe({
      next: (res: any) => {
        if (res.status) {
          this.incidentTypes = res.data || [];
        } else {
          this.common.presentToast(res.msg || 'Incident types not found', 'warning');
        }
      },
      error: () => {
        this.common.presentToast(environment.errMsg, 'danger');
      }
    });
  }

  getDepartments() {
    this.httpIncident.getDepartments().subscribe({
      next: (res: any) => {
        if (res.status) {
          this.departments = res.data || [];
        }
      },
      error: () => { }
    });
  }

  async openSiteModal() {
    const modal = await this.modalController.create({
      component: CostCenterComponent,
      cssClass: 'my-modal',
      componentProps: {}
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.data) {
        this.forms.get('pc_desc')?.setValue(disModal.data.label || disModal.data.pc_desc);
        this.forms.get('pc_id')?.setValue(disModal.data.value ?? disModal.data.pc_id);
      }
    });
    return await modal.present();
  }

  async openDepartmentModal() {
    const modal = await this.modalController.create({
      component: IncidentPickerComponent,
      cssClass: 'my-modal',
      componentProps: { title: 'Department', items: this.departments }
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.data) {
        this.forms.get('department_desc')?.setValue(disModal.data.label || disModal.data.dept_desc);
        this.forms.get('department_id')?.setValue(disModal.data.value ?? disModal.data.dept_id);
      }
    });
    return await modal.present();
  }

  attachPhoto() {
    this.camera.selectImage(['camera', 'gallery'], (blob: Blob) => {
      if (blob.size > this.maxFileSize) {
        this.common.presentToast('Photo size should be less than 5 MB', 'warning');
        return;
      }
      this.attachment = blob;
    });
  }

  removePhoto() {
    this.attachment = null;
  }

  isInvalid(control: string): boolean {
    return this.submitted && this.forms.controls[control].invalid;
  }

  // ion-datetime ISO string ya sirf 'HH:mm' dono de sakta hai
  formatValue(control: string, format: string): string {
    const val = this.forms.value[control];
    if (!val) {
      return '';
    }
    const parsed = moment(val, [moment.ISO_8601, 'HH:mm']);
    return parsed.isValid() ? parsed.format(format) : '';
  }

  cancel() {
    this.navCtrl.pop();
  }

  submit() {
    this.submitted = true;
    if (this.forms.invalid) {
      this.common.presentToast('Please fill all required fields', 'warning');
      return;
    }
    const v = this.forms.value;
    const fields: any = {
      pc_id: v.pc_id,
      incident_date: this.formatValue('incident_date', 'YYYY-MM-DD'),
      incident_time: this.formatValue('incident_time', 'HH:mm'),
      incident_type_id: v.incident_type_id,
      department_id: v.department_id,
      reported_by: v.reported_by,
      severity: v.severity,
      location: v.location,
      description: v.description,
      immediate_action_taken: v.immediate_action_taken
    };
    const formData = new FormData();
    for (const key in fields) {
      if (fields[key] !== undefined && fields[key] !== null && fields[key] !== '') {
        formData.append(key, fields[key]);
      }
    }
    if (this.attachment) {
      formData.append('attachment', this.attachment, `incident_${Date.now()}.jpg`);
    }

    this.common.presentLoading().then(preLoad => {
      this.httpIncident.addIncident(formData).subscribe({
        next: (res: any) => {
          if (res.status) {
            this.common.presentToast(res.msg || 'Incident reported successfully', 'success');
            if (res.data?.id) {
              this.router.navigate(['/incident-report/detail', res.data.id], { replaceUrl: true });
            } else {
              this.navCtrl.pop();
            }
          } else {
            this.common.presentToast(res.msg || 'Incident not reported', 'warning');
          }
        },
        error: () => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.common.dismissloading();
        }
      });
    });
  }

}
