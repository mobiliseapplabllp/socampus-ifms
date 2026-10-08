import { Component, OnInit } from '@angular/core';
import { ApprovalService } from 'src/app/provider/approval/approval.service';
import { AlertController} from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';


@Component({
  selector: 'app-stock-adjust',
  templateUrl: './stock-adjust.component.html',
  styleUrls: ['./stock-adjust.component.scss'],
})
export class StockAdjustComponent implements OnInit {
  pendingData: any = [];
  isMaterialModalOpen = false;
  materialData: any = [];

  constructor(
    private httpApproval: ApprovalService,
    private alertController: AlertController,
    private httpCommon: CommonService
  ) { }

  ngOnInit() {
    this.getStockData();
  }

  getStockData() {
    this.httpCommon.presentLoading().then(preload => {
      this.httpApproval.getStockAdujApp().subscribe({
        next: (data) => {
          console.log(data);
          this.pendingData = data.data;
        },
        error: () => {
          this.httpCommon.dismissloading();
          console.log('err');
        },
        complete: () => {
          this.httpCommon.dismissloading();
          console.log('complete');
        }
      })
    })
  }
  async presentAlertConfirm(data: any, status: string, msg: string) {

    const alert = await this.alertController.create({
      header: msg + ' Ticket',
      message: 'Add Remark (Optional)',
      mode: 'ios',
      inputs: [
        {
          name: 'remark',
          type: 'textarea',
          placeholder: 'Enter remark here...'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: msg,
          handler: (val) => {
  
            const remarkText = val?.remark?.trim() || '';
  
            const payload = {
              status: status,
              id: data?.id,
              order_no: data?.order_no,
              remark: remarkText,
              source: 'Mobile'
            };
  
            this.SubmitAppRej(payload);
  
            return true;   // ✅ Alert close hoga even if remark empty
          }
        }
      ]
    });
  
    await alert.present();
  }
  
  openMaterialModal(dat: any) {

    const orderNo = dat?.order_no;
    this.httpCommon.presentLoading().then(preload => {
    this.httpApproval.getStockMaterialDetails(orderNo)
      .subscribe({
        next: (res: any) => {
          console.log(res);
          this.materialData = res.data;
          this.isMaterialModalOpen = true;
        },
        error: () => {
          this.httpCommon.dismissloading();
          console.log('material error');
        },
        complete: () => {
          this.httpCommon.dismissloading();
          console.log('material complete');
        }
      })
    })
  }

  closeMaterialModal() {
    this.isMaterialModalOpen = false;
  }


  SubmitAppRej(payload: any) {

    this.httpApproval.stockAdjustApproveReject(payload).subscribe({
      next: async (res: any) => {
  
        if(res?.status){
  
          this.httpCommon.presentToast(res?.msg, 'success');
  
          this.getStockData(); // refresh list
        }
        else{
          this.httpCommon.presentToast(res?.msg, 'danger');
        }
  
      },
      error: async (err) => {
  
        this.httpCommon.presentToast('Something went wrong!', 'danger');
  
      }
    })
  }
  



}
