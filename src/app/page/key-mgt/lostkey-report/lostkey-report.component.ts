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
      keyNumber: data.key_no || '',
      floorName: data.floor_name || '',
      blockName: data.block_name || '',
      buildingId_desc: data.building_name || ''
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
      phone: ['', Validators.required],
      email_id: ['', [Validators.email]],
      description: ['', Validators.required],
    });
    this.forms.get('keyName')?.setValue(this.req_data.key_name);
    this.forms.get('keyNumber')?.setValue(this.req_data.key_no);
    this.forms.get('floorName')?.setValue(this.req_data.floor_name);

    this.forms.get('blockName')?.setValue(this.req_data.block_name);
    this.forms.get('buildingId_desc')?.setValue(this.req_data.building_name);
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
      lost_at: moment(this.forms.value.lostDateTime).toISOString(),
      last_seen: this.forms.value.floorId_desc,
      resp_name: this.forms.value.lostKey_person,
      resp_phone: this.forms.value.phone,
      resp_email: this.forms.value.email_id || '',
      description: this.forms.value.description
    };
    this.httpCommon.presentLoading().then(preLoad => {
      this.httpKey.reportLostKey(this.httpKey.asgnId(this.req_data), payload).subscribe({
        next: (data: any) => {
          if (data.status) {
            this.httpKey.setHomePageStatus(true);
            this.httpCommon.presentToast(data.msg || 'Submitted Successfully', 'success');
            this.navCtrl.pop();
          } else {
            this.httpCommon.presentToast(data.msg || 'Not Submitted', 'warning');
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
        }
      });
    })

  }

  clearForm() {
    this.forms.patchValue(this.initialData);
    this.submitted = false;
  }
}
