import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { IndentsService } from 'src/app/provider/indents/indents.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-material-details',
  templateUrl: './material-details.component.html',
  styleUrls: ['./material-details.component.scss'],
})
export class MaterialDetailsComponent  implements OnInit {
  data: any;
  index!: number;
  mtrl_type!: any;
  materialArr: any = [];
  arr: any = {};
  uomArr: any = [];
  constructor(
    private httpIndent: IndentsService,
    private common: CommonService,
    private camera: CameraService,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {    
    this.getMaterial();
    this.getUom();
  }

  closeModal(data:any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  getUom() {  
    this.httpIndent.getUom().subscribe({
      next:(data: any) => {
        if (data.status) {
          this.uomArr = data.data;
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
        console.log(data);
      },
      error:() => {

      },
      complete:() => {

      }
    });
  }

  getMaterial() {   
    this.common.presentLoading().then(preLoad => {
      this.httpIndent.getMaterial(this.mtrl_type).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.materialArr = data.data;
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

  changeMaterial(ev: any) {    
    let temp = this.materialArr.filter((value: any) => value.value === ev.target.value)[0];    
    this.arr.sku = temp.sku;
    this.arr.catlg_no = temp.catlg_no;
    this.arr.mtrl_desc = temp.mtrl_description;
    this.arr.prt_code = temp.part_code;
    this.arr.mnfctrer_desc = temp.mnfctrer_desc;
    this.arr.model = temp.model_desc;
  }

  search() {
    this.common.presentLoading().then(preLoad => {
      this.httpIndent.searchUser(this.arr.user_id_label).subscribe({
        next:(data: any) => {        
          if (data.status) {
            this.arr.user_id_label = data.data[0].name;
            this.arr.user_id = data.data[0].id;
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

  async presentActionSheet() {
    this.camera.selectImage(['camera', 'gallery'], (blob: Blob) => {
      this.arr.mtrl_file = blob;
    });
  }

  submit() {    
    this.closeModal(this.arr, true);
  }

  changeCost() {
    const { qty, expt_price, discount } = this.arr;    
    if (discount < 0 && discount !== null && discount !== undefined) {
      this.common.presentToast(`Discount can't be smaller than 0`, 'warning');
      this.arr.discount = 0;
      return;
    }    
    if (qty && expt_price && (discount !== null && discount !== undefined)) {
      const quantity = Number(qty);
      const expectedPrice = Number(expt_price);
      const discountAmount = Number(discount);
      const total = quantity * expectedPrice;

      if (discountAmount > total) {
        this.common.presentToast(`Discount can't be greater than total amount`, 'warning');
        this.arr.discount = null;
        this.arr.actl_price = null;
      } else {
        this.arr.actl_price = total - discountAmount;
      }
    }
  }
}

// pc_id
// 12
// wh_id
// 4
// is_ticket
// 1
// ticket_id
// 552
// asset_id
// 3407
// source
// PORTAL
// project_id
// is_billable
// 1
// mtrl_type
// 6
// prop1
// Address remark
// material[0][mtrl_id]
// 199
// material[0][mtrl_desc]
// Material Name
// material[0][qty]
// 100
// material[0][uom_id]
// 5
// material[0][reqd_by_date]
// 2025-06-16
// material[0][dimension]
// material[0][remark]
// This is remark
// material[0][mtrl_file]
// (binary)
// material[0][priority]
// 1
// material[0][model]
// test model
// material[0][user_id]
// material[0][del_loc]
// delivery location
// material[0][serial_no]
// Serial No
// material[0][supl_name]
// supplier name
// material[0][pur_ordr_no]
// PO-1001
// material[0][wrnty_exp_date]
// 2025-06-04
// material[0][expt_price]
// 10
// material[0][discount]
// 1
// material[0][actl_price]
// 900
