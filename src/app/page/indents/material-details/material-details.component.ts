import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import * as moment from 'moment';
import { CameraService } from 'src/app/provider/camera/camera.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { IndentsService } from 'src/app/provider/indents/indents.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-material-details',
  templateUrl: './material-details.component.html',
  styleUrls: ['./material-details.component.scss'],
})
export class MaterialDetailsComponent implements OnInit {
  index!: number;
  mtrl_type!: any;
  materialArr: any = [];
  arr: any = {};
  uomArr: any = [];
  editRemark!: string;
  today = moment().format('YYYY-MM-DD');
  org_id: any;
  constructor(
    private httpIndent: IndentsService,
    private common: CommonService,
    private camera: CameraService,
    private modalCtrl: ModalController,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    console.log(this.org_id);
    this.getMaterial();
    this.getUom();
    this.cleanDatesAndFields();
  }

  cleanDatesAndFields() {
    const dateFields = ['reqd_by_date', 'wrnty_exp_date'];
    dateFields.forEach(field => {
      if (!this.isValidDate(this.arr[field])) {
        this.arr[field] = '';
      }
    });

    for (const key in this.arr) {
      if (this.arr[key] === undefined || this.arr[key] === 'undefined') {
        this.arr[key] = '';
      }
    }
  }

  isValidDate(dateStr: any): boolean {
    const date = new Date(dateStr);
    return dateStr && !isNaN(date.getTime());
  }

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  getUom() {
    this.httpIndent.getUom().subscribe({
      next: (data: any) => {
        if (data.status) {
          this.uomArr = data.data;
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      },
      error: () => {

      },
      complete: () => {

      }
    });
  }

  getMaterial() {
    if (!this.org_id) {
      this.common.presentToast('Org ID is Required', 'warning');
      return;
    }
    this.common.presentLoading().then(preLoad => {
      this.httpIndent.getMaterial(this.mtrl_type, this.org_id).subscribe({
        next: (data: any) => {
          if (data.status) {
            this.materialArr = data.data;
            if (this.index === -1) {
              this.changeMaterial(null, this.arr.mtrl_id);
            }
          } else {
            this.common.presentToast(data.msg, 'warning');
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

  changeMaterial(ev: any, isUpdate?: any) {
    let val: any;
    if (isUpdate) {
      val = isUpdate
    } else {
      val = ev.target.value;
    }
    let temp = this.materialArr.filter((value: any) => value.value === val)[0];
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
        next: (data: any) => {
          if (data.status) {
            this.arr.user_id_label = data.data[0].name;
            this.arr.user_id = data.data[0].id;
          } else {
            this.common.presentToast(data.msg, 'warning');
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

  async presentActionSheet() {
    this.camera.selectImage(['camera', 'gallery'], (blob: Blob) => {
      this.arr.mtrl_file = blob;
    });
  }

  submit() {
    const validations = [
      { condition: !this.arr.mtrl_id, message: 'Please Select Material' },
      { condition: !this.arr.uom_id, message: 'Please Select Unit' },
      { condition: !this.arr.qty, message: 'Please Enter Qty' },
      { condition: !this.arr.expt_price, message: 'Please Enter MRP' },
      { condition: !this.arr.discount && this.arr.discount !== 0, message: 'Please Enter Discount' }
    ];

    for (const validation of validations) {
      if (validation.condition) {
        this.common.presentToast(validation.message, 'warning');
        return;
      }
    }

    if (this.index === -1) {
      this.presentAlertConfirm();
    } else {
      this.closeModal(this.arr, true);
    }
  }

  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Remark',
      mode: 'ios',
      inputs: [{
        name: 'remark',
        type: 'textarea',
        placeholder: 'Enter Remarks',
      }],
      buttons: [{
        text: 'Cancel',
        handler: (data) => {
        }
      }, {
        text: 'Submit',
        handler: (dat) => {
          if (dat.remark) {
            this.editRemark = dat.remark;
            this.updateIndent();
          } else {
            this.common.presentToast('Please Enter Remarks', 'warning');
          }
        }
      }]
    });
    await alert.present();
  }

  updateIndent() {
    console.log(this.arr);
    let i = 0;
    const random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg';
    const formData = new FormData();
    formData.append('pc_id', this.arr.pc_id);
    formData.append('wh_id', this.arr.wh_id);
    formData.append('is_ticket', '1');
    formData.append('ticket_id', this.arr.ticket_id);
    formData.append('asset_id', this.arr.asset_id);
    formData.append('source', environment.source);
    formData.append('is_billable', this.arr.is_billable);
    formData.append('mtrl_type', this.arr.mtrl_type);
    formData.append('prop1', this.arr.prop1);
    formData.append('rqst_id', this.arr.rqst_id);
    formData.append('edit_remark', this.editRemark);

    formData.append(`material[${i}][catlg_no]`, this.arr.catlg_no);
    formData.append(`material[${i}][expt_price]`, this.arr.expt_price);
    formData.append(`material[${i}][mnfctrer_desc]`, this.arr.mnfctrer_desc);
    formData.append(`material[${i}][model]`, this.arr.model);
    formData.append(`material[${i}][mtrl_desc]`, this.arr.mtrl_desc);
    formData.append(`material[${i}][mtrl_id]`, this.arr.mtrl_id);
    formData.append(`material[${i}][prt_code]`, this.arr.prt_code);
    formData.append(`material[${i}][supl_name]`, this.arr.supl_name);
    formData.append(`material[${i}][pur_ordr_no]`, this.arr.pur_ordr_no);
    formData.append(`material[${i}][remark]`, this.arr.remark);
    formData.append(`material[${i}][discount]`, this.arr.discount);
    formData.append(`material[${i}][actl_price]`, this.arr.actl_price);
    formData.append(`material[${i}][qty]`, this.arr.qty);
    formData.append(`material[${i}][serial_no]`, this.arr.serial_no);
    formData.append(`material[${i}][sku]`, this.arr.sku);
    // formData.append(`material[${i}][priority]`, this.arr.priority);
    formData.append(`material[${i}][del_loc]`, this.arr.del_loc);
    formData.append(`material[${i}][uom_id]`, this.arr.uom_id);
    formData.append(`material[${i}][user_id]`, this.arr.user_id);
    formData.append(`material[${i}][reqd_by_date]`, this.arr.reqd_by_date ? moment(this.arr.reqd_by_date).format('YYYY-MM-DD') : '');
    formData.append(`material[${i}][user_id_label]`, this.arr.user_id_label);
    formData.append(`material[${i}][wrnty_exp_date]`, this.arr.wrnty_exp_date ? moment(this.arr.wrnty_exp_date).format('YYYY-MM-DD') : '');
    // formData.append(`material[${i}][mtrl_file]`, this.arr.mtrl_file, random);
    if (this.arr.mtrl_file instanceof Blob) {
      formData.append(`material[${i}][mtrl_file]`, this.arr.mtrl_file, random);
    }

    this.common.presentLoading().then(preLoad => {
      this.httpIndent.editAction(formData).subscribe({
        next: (data: any) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.closeModal(null, true);
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error: () => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.common.dismissloading();
        },
        complete: () => {
          this.common.dismissloading();
        }
      });
    });
  }

  changeCost() {
    const { qty, expt_price, discount } = this.arr;

    if (discount < 0 && discount !== null && discount !== undefined) {
      this.common.presentToast(`Discount can't be smaller than 0`, 'warning');
      this.arr.discount = 0;
      return;
    }

    if (qty && expt_price) {
      const quantity = Number(qty);
      const expectedPrice = Number(expt_price);
      const discountAmount = discount !== null && discount !== undefined && discount !== ''
        ? Number(discount)
        : 0;

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


  // changeCost() {
  //   const { qty, expt_price, discount } = this.arr;
  //   if (discount < 0 && discount !== null && discount !== undefined) {
  //     this.common.presentToast(`Discount can't be smaller than 0`, 'warning');
  //     this.arr.discount = 0;
  //     return;
  //   }
  //   if (qty && expt_price && (discount !== null && discount !== undefined)) {
  //     const quantity = Number(qty);
  //     const expectedPrice = Number(expt_price);
  //     const discountAmount = Number(discount);
  //     const total = quantity * expectedPrice;

  //     if (discountAmount > total) {
  //       this.common.presentToast(`Discount can't be greater than total amount`, 'warning');
  //       this.arr.discount = null;
  //       this.arr.actl_price = null;
  //     } else {
  //       this.arr.actl_price = total - discountAmount;
  //     }
  //   }
  // }
}