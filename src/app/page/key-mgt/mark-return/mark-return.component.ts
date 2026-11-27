import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { KeysService } from 'src/app/provider/keys/keys.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { NavController } from '@ionic/angular';
import * as moment from 'moment';


@Component({
  selector: 'app-mark-return',
  templateUrl: './mark-return.component.html',
  styleUrls: ['./mark-return.component.scss'],
})
export class MarkReturnComponent implements OnInit {

  public forms1!: FormGroup;
  submitted = false;
  private initialData: any;
  // selectedKeyData: any;  
  currentDate = moment().format('YYYY-MM-DDTHH:mm:ss');
  req_data: any;
  constructor(
    private formbuilder: FormBuilder,
    private router: Router,
    private httpCommon: CommonService,
    private httpKey: KeysService,
    private navCtrl: NavController) {         
  }

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    this.req_data = navigation?.extras?.state?.['keyData'];    
    this.initForm();        
  }

  // setData(data: any) {
  //   this.selectedKeyData = data;
  //   this.forms1.patchValue({
  //     key_name: data.key_name,
  //     assign_to: data.assigned_to,
  //   });    
  // }

  initForm() {
    this.forms1 = this.formbuilder.group({
      key_name: [this.req_data.key_name],
      assign_to: [this.req_data.assigned_to || this.req_data.assign_to],
      return_date: [this.currentDate, Validators.required],
      return_condition: [''],
      remark: [''],
    });    
  }

  onSubmit() {    
    this.submitted = true;
    if (!this.forms1.value.return_date) {
      this.httpCommon.presentToast('Please Select Return Date & time', 'warning');
      return;
    }      
    // Backend me return condition ka alag field nahi hai, isliye remarks me jod diya
    const payload = {
      returned_at: moment(this.forms1.value.return_date).toISOString(),
      remarks: [this.forms1.value.return_condition, this.forms1.value.remark].filter(v => !!v).join(' - ')
    };

    this.httpCommon.presentLoading('Submitting...');

    this.httpKey.markReturnKey(this.httpKey.asgnId(this.req_data), payload).subscribe({
      next: (data: any) => {
        if (data.status) {
          this.httpKey.setHomePageStatus(true);
          this.httpCommon.presentToast(data.msg || 'Request Submit Successfully', 'success');
          this.navCtrl.pop();
        } else {
          this.httpCommon.presentToast(data.msg || 'Not Submitted', 'warning');
        }
      },
      error: (error: any) => {
        this.httpCommon.presentToast(error?.error?.message || 'Something went wrong', 'danger');
        this.httpCommon.dismissloading();
      },
      complete: () => {
        this.clearForm();
        this.httpCommon.dismissloading();
      }
    });    
  }

  clearForm() {
    this.forms1.patchValue(this.initialData);
    this.submitted = false;
  }

  changeDate(ev: any) {
    if (!ev.target.value) {
      return;
    }
    const selected = moment(ev.detail.value);
    const now = moment(this.currentDate).add(1, 'minute');
    if (selected.isBefore(now)) {
      this.forms1.patchValue({
        return_date: selected.format('YYYY-MM-DDTHH:mm:ss')
      });
    } else {      
      this.httpCommon.presentToast('Time Sould be Less than ' + this.currentDate, 'warning');
      this.forms1.patchValue({
        return_date: ''
      });
    }
  }

  test() {    
  }

}
