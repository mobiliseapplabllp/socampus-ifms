import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, NavController } from '@ionic/angular';
import * as moment from 'moment';
import { CommonService } from 'src/app/provider/common/common.service';
import { CostCenterComponent } from 'src/app/shared/cost-center/cost-center.component';
import { AssetDepartmentComponent } from '../add-asset/asset-department/asset-department.component';

@Component({
  selector: 'app-incident-report',
  templateUrl: './incident-report.page.html',
  styleUrls: ['./incident-report.page.scss'],
})
export class IncidentReportPage implements OnInit {
  public forms!: FormGroup;
  submitted = false;
  maxDate = moment().format('YYYY-MM-DD');

  // TODO: backend ready hone par incident type master API se aayega
  incidentTypes: string[] = ['Accident', 'Near Miss', 'Fire', 'Theft', 'Property Damage', 'Security Breach', 'Other'];
  severityList: string[] = ['Low', 'Medium', 'High', 'Critical'];

  constructor(
    private formbuilder: FormBuilder,
    private modalController: ModalController,
    private common: CommonService,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    this.initForm();
  }

  initForm() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.forms = this.formbuilder.group({
      site_id: [''],
      site_id_desc: ['', Validators.required],
      incident_date: [moment().format(), Validators.required],
      incident_time: [moment().format(), Validators.required],
      incident_type: ['', Validators.required],
      dept_id: [''],
      dept_id_desc: ['', Validators.required],
      reported_by: [user?.user_name || '', Validators.required],
      severity: ['Low'],
      exact_location: [''],
      description: ['', Validators.required],
      action_taken: ['']
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
        this.forms.get('site_id_desc')?.setValue(disModal.data.pc_desc);
        this.forms.get('site_id')?.setValue(disModal.data.pc_id);
      }
    });
    return await modal.present();
  }

  async openDepartmentModal() {
    const modal = await this.modalController.create({
      component: AssetDepartmentComponent,
      cssClass: 'my-modal',
      componentProps: {}
    });
    modal.onWillDismiss().then(disModal => {
      if (disModal.data) {
        this.forms.get('dept_id_desc')?.setValue(disModal.data.dept_desc);
        this.forms.get('dept_id')?.setValue(disModal.data.dept_id);
      }
    });
    return await modal.present();
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
    const payload = {
      ...this.forms.value,
      incident_date: this.formatValue('incident_date', 'YYYY-MM-DD'),
      incident_time: this.formatValue('incident_time', 'HH:mm')
    };
    // TODO: backend API ready hone par yaha se incident create API call hogi
    console.log('incident report payload', payload);
    this.common.presentToast('Incident API is not available yet', 'warning');
  }

}
