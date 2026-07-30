import { Component, OnInit } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-order-packing-modal',
  templateUrl: './order-packing-modal.component.html',
  styleUrls: ['./order-packing-modal.component.scss'],
})
export class OrderPackingModalComponent  implements OnInit {
  scanData: any;
  cambroData: any;
  qty: any;
  loading: any;
  pack_type: any; // 0 for cambro // 1for other
  pack_no: any;
  identify_key!: string;
  select_type!: string;
  type_id!: number;
  constructor(
    private modalCtrl: ModalController,
    private common: CommonService,
    private httpTo: TodayOrderService,
    private loadingController: LoadingController) {

  }

  ngOnInit() {
    console.log(this.scanData);
    if (this.pack_type === '0' && (this.scanData.ttl_left_portion <= this.cambroData.size)) {
      this.qty = this.scanData.ttl_left_portion;
    } else {
      this.qty = this.scanData.ttl_left_portion;
    }
  }

  get uom() {
    return this.scanData?.uom || '';
  }

  get packedPct() {
    const total = Number(this.scanData?.order_qty) || 0;
    if (!total) { return 0; }
    return Math.min(100, ((Number(this.scanData?.total_cambro_packed) || 0) / total) * 100);
  }

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  submit() {
    if (this.qty === null || this.qty === undefined || this.qty === '') {
      this.common.presentToast('Please Enter Packing Qty', 'warning');
      return;
    }

    const qtyNum = Number(this.qty);
    if (isNaN(qtyNum) || qtyNum < 1) {
      this.qty = null;
      this.common.presentToast(`Packing Qty can't be less than 1`, 'warning');
      return;
    }
    this.qty = qtyNum;

    if (qtyNum > this.cambroData.size) {
      this.common.presentToast(`You can't enter more than Camro Size (${this.cambroData.size})`, 'warning');
      return;
    }

    if (qtyNum > this.scanData.ttl_left_portion) {
      this.qty = null;
      this.common.presentToast(`You can't enter more than Remaining Qty (${this.scanData.ttl_left_portion})`, 'warning');
      return;
    }

    var obj: any = {

      dispatch_qty: this.qty,
      item_id: this.scanData.item_id,
      order_id: this.scanData.order_id,
      txn_id: this.scanData.txn_id,
    }

    if (this.pack_type === '1') {
      if (!this.identify_key) {
        this.common.presentToast('Please Enter Identify Key', 'warning');
        return;
      }
      obj.camro_box_id = this.type_id,
      obj.pack_no = this.identify_key,
      obj.pack_type = '1'      
    } else {
      obj.camro_box_id = this.cambroData.cambro_id,
      obj.pack_no = this.pack_no,
      obj.pack_type = '0'
    }

    this.presentLoading().then(preLoad => {
      this.httpTo.updateRecipePacking(obj).subscribe({
        next:(data) => {
          if (data.status) {
            this.closeModal(null, true);
            this.common.presentToast(data.msg, 'success');
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    })
  }

  changeQty(event: any) {
    let value = event.target.value;

    // strip minus sign / negative values — packing qty can never be below 1
    if (typeof value === 'string' && value.indexOf('-') !== -1) {
      value = value.replace(/-/g, '');
      this.qty = value;
      event.target.value = value;
    }

    const decimalIndex = String(value).indexOf('.');

    if (decimalIndex !== -1 && value.length - decimalIndex - 1 > 2) {
        this.qty = value.slice(0, decimalIndex + 2);
    }
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...'
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

}
