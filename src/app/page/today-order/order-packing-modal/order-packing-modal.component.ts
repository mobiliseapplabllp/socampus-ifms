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
  constructor(
    private modalCtrl: ModalController,
    private common: CommonService,
    private httpTo: TodayOrderService,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
    console.log(this.scanData);
    console.log(this.cambroData);
    if (this.scanData.ttl_left_portion <= this.cambroData.size) {
      this.qty = this.scanData.ttl_left_portion;
    }
  }

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  submit() {
    if (!this.qty) {
      this.common.presentToast('Please Enter Packing Qty', 'warning');
      return;
    }
    const obj = {
      camro_box_id: this.cambroData.cambro_id,
      dispatch_qty: this.qty,
      item_id: this.scanData.item_id,
      order_id: this.scanData.order_id,
      txn_id: this.scanData.txn_id,
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

  changeQty() {
    if (this.qty > this.scanData.ttl_left_portion) {
      this.common.presentToast(`You can't enter more than (${this.scanData.ttl_left_portion}) remaining Qty`, 'warning');
      this.qty = ''
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
