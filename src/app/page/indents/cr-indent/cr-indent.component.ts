import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalController, NavController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { IndentsService } from 'src/app/provider/indents/indents.service';
import { environment } from 'src/environments/environment';
import { MaterialDetailsComponent } from '../material-details/material-details.component';
import * as moment from 'moment';

@Component({
  selector: 'app-cr-indent',
  templateUrl: './cr-indent.component.html',
  styleUrls: ['./cr-indent.component.scss'],
})
export class CrIndentComponent  implements OnInit {
  all_data: any;
  warehouseArr: any = [];
  public myForm!: FormGroup;
  typeArr: any = [];
  materialArr: any = [];
  constructor(
    private router: Router,
    private httpIndent: IndentsService,
    private common: CommonService,
    private formbuilder: FormBuilder,
    private modalCtrl: ModalController,
    private navCtrl: NavController
  ) { }

  ngOnInit() {    
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['data']) {
      this.all_data = navigation.extras.state['data'];            
      console.log(this.all_data);
      this.getWarehouseByPC();      
    }    
    this.initForm();
    this.getSelectType();
  }

  initForm() {
    this.myForm = this.formbuilder.group({
      pc_id_desc: [this.all_data?.data?.pc_desc, Validators.required],
      pc_id: [this.all_data.data.pc_id, Validators.required],
      is_ticket: ['1'],
      ticket_id: [this.all_data.data.tkts_id],
      asset_id: [this.all_data.data.tkts_asset_id],
      wh_id: ['', Validators.required],
      prop1: [''],
      is_billable: ['', Validators.required],
      mtrl_type: ['', Validators.required],
      source: [environment.source]
    });

  }

  getWarehouseByPC() {
    this.common.presentLoading().then(preLoad => {
      this.httpIndent.getWarehousePc(this.all_data.data.pc_id).subscribe({
        next:(data: any) => {          
          if (data.status) {
            this.warehouseArr = data.data; 
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

  getSelectType() {
    this.httpIndent.getIndentType().subscribe({
      next:(data) => {
        if (data.status) {
          this.typeArr = data.data
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      },
      error:() => {        
        this.common.presentToast(environment.errMsg, 'danger');
      },
      complete:() => {        
      }
    });    
  }

  addItem() {
    // this.materialArr.push({});
  }

  deleteItems(ind: number) {
    if (this.materialArr.length === 1) {
      this.common.presentToast('At least one material details is required', 'warning');
      return;
    }
    this.materialArr.splice(ind, 1);
  }

  async openMaterialDetails(data: any, index?: number) {    
    let ind: any
    if (index === 0 || index) {
      ind = index
    } else {
      ind = this.materialArr.length;
    }    
    if (!this.myForm.value.mtrl_type) {
      this.common.presentToast('Please Select Material Type', 'warning');
      return;
    }    
    const modal = await this.modalCtrl.create({
      component: MaterialDetailsComponent,
      initialBreakpoint: 1,
      breakpoints: [1],    
      mode: 'ios',  
      componentProps: { 
        data: data,
        index: ind,
        mtrl_type: this.myForm.value.mtrl_type,
        arr: data,
        org_id: this.all_data.data.org_id
      }
    });
    modal.onWillDismiss().then(async disModal => {
      if (disModal.role) {                 
        if (ind < this.materialArr.length) {
          this.materialArr[ind] = disModal.data;
        } else {
          this.materialArr.push(disModal.data);
        }              
      }
    });
    modal.present();
  } 

  finalSubmit() {
    if (this.materialArr.length === 0) {
      this.common.presentToast('At least one Material Detail is Required', 'warning');
      return;
    }
    const formData = new FormData();      
    for (var key in this.myForm.value) {
      formData.delete(key);
      formData.append(key, this.myForm.value[key]);
    }  
    
    for (let i = 0; i < this.materialArr.length; i++) {
      const item = this.materialArr[i];
      const random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg';
      formData.append(`material[${i}][catlg_no]`, item.catlg_no);
      formData.append(`material[${i}][expt_price]`, item.expt_price);
      formData.append(`material[${i}][mnfctrer_desc]`, item.mnfctrer_desc);
      formData.append(`material[${i}][model]`, item.model);
      formData.append(`material[${i}][mtrl_desc]`, item.mtrl_desc);
      formData.append(`material[${i}][mtrl_id]`, item.mtrl_id);
      formData.append(`material[${i}][prt_code]`, item.prt_code);
      formData.append(`material[${i}][supl_name]`, item.supl_name);
      formData.append(`material[${i}][pur_ordr_no]`, item.pur_ordr_no);
      formData.append(`material[${i}][remark]`, item.remark);
      formData.append(`material[${i}][discount]`, item.discount);
      formData.append(`material[${i}][actl_price]`, item.actl_price);            
      formData.append(`material[${i}][qty]`, item.qty);
      formData.append(`material[${i}][serial_no]`, item.serial_no);
      formData.append(`material[${i}][sku]`, item.sku);
      formData.append(`material[${i}][uom_id]`, item.uom_id);      
      formData.append(`material[${i}][user_id]`, item.user_id);
      formData.append(`material[${i}][reqd_by_date]`, item.reqd_by_date ? moment(item.reqd_by_date).format('YYYY-MM-DD'): '');
      formData.append(`material[${i}][user_id_label]`, item.user_id_label );
      formData.append(`material[${i}][wrnty_exp_date]`, item.wrnty_exp_date ? moment(item.wrnty_exp_date).format('YYYY-MM-DD'): '');      
      // formData.append(`material[${i}][mtrl_file]`, item.mtrl_file, random);
      if (item.mtrl_file instanceof Blob) {        
       formData.append(`material[${i}][mtrl_file]`, item.mtrl_file, random);
      }
    }
    this.common.presentLoading().then(preLoad => {
      this.httpIndent.submitIndent(formData).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.navCtrl.pop();
            this.common.presentToast(data.msg, 'success');
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
}