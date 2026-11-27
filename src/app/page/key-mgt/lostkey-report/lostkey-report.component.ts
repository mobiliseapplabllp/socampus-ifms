import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { KeysService } from 'src/app/provider/keys/keys.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { NavController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import * as moment from 'moment';

@Component({
  selector: 'app-lostkey-report',
  templateUrl: './lostkey-report.component.html',
  styleUrls: ['./lostkey-report.component.scss'],
})
export class LostkeyReportComponent implements OnInit {
  public forms!: FormGroup;
  submitted = false;
  private initialData: any;
  currentDate = moment().format('YYYY-MM-DDTHH:mm');
  req_data: any;
  constructor(
    private formbuilder: FormBuilder,
    private router: Router,
    private httpKey: KeysService,
    private httpCommon: CommonService,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    this.req_data = navigation?.extras?.state?.['keyData'];
    this.initForm();
  }

  setData(data: any) {
    this.forms.patchValue({
      keyName: data.key_name || '',
      keyNumber: data.keyNo || '',
      floorName: data.floor || '',
      blockName: data.block || '',
      buildingId_desc: data.building || ''
    });
    this.initialData = this.forms.value;
  }

  initForm() {
    this.forms = this.formbuilder.group({
      keyNumber: ['', Validators.required],
      keyName: [''],
      floorName: ['', Validators.required],
      blockName: ['', Validators.required],
      buildingId_desc: ['', Validators.required],
      lostDateTime: [moment().format('YYYY-MM-DDTH:mm:ss'), Validators.required],
      floorId_desc: ['', Validators.required],
      lostKey_person: ['', Validators.required],
      phone: [''],
      email_id: ['', [Validators.email]],
      description: ['', Validators.required],
    });
    this.forms.get('keyName')?.setValue(this.req_data.key_name);
    this.forms.get('keyNumber')?.setValue(this.req_data.keyNo);
    this.forms.get('floorName')?.setValue(this.req_data.floor);

    this.forms.get('blockName')?.setValue(this.req_data.block);
    this.forms.get('buildingId_desc')?.setValue(this.req_data.building);
  }

  setLostDate(event: any) {
    this.forms.patchValue({
      lostDateTime: event.detail.value
    });
  }

  setDiscoverDate(event: any) {
    this.forms.patchValue({
      discoveredDateTime: event.detail.value
    });
  }

  onSubmit() {
    this.submitted = true;
    if (this.forms.invalid) {
      this.httpCommon.presentToast('Please fill all required fields', 'warning');
      return;
    }

    const payload = {
      keyId: this.req_data.key_id,
      reportType: 'lost',
      dateTimeLost: this.forms.value.lostDateTime,
      discoveredDateTime: this.forms.value.discoveredDateTime,
      lastSeenLocation: this.forms.value.floorId_desc,
      responsiblePersonName: this.forms.value.lostKey_person,
      responsiblePersonMobile: this.forms.value.phone,
      responsiblePersonEmail: this.forms.value.email_id,
      incidentDescription: this.forms.value.description,
      description: this.forms.value.description,
      source: 'Mobile',
    };
    Object.keys(payload).forEach((key) => {
      const value = payload[key as keyof typeof payload];
      if ( value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        delete payload[key as keyof typeof payload];
      }
    });
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpKey.reportLostKey(payload).subscribe({
        next: (data: any) => {
          if (data.status) {
            this.httpKey.setHomePageStatus(true);
            this.httpCommon.presentToast(data.message || 'Submitted Successfully', 'success');
            this.navCtrl.pop();
          } else {
            this.httpCommon.presentToast(data.message || 'Not Submitted', 'warning');
          }          
        },
        error: (error) => {          
          this.httpCommon.dismissloading();
          if (error.status === 400) {
            this.httpCommon.presentToast(error.error.message, 'warning');
            return;
          }
          
          this.httpCommon.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.httpCommon.dismissloading();
          this.navCtrl.pop();         
        }
      });
    })

  }

  clearForm() {
    this.forms.patchValue(this.initialData);
    this.submitted = false;
  }
}
