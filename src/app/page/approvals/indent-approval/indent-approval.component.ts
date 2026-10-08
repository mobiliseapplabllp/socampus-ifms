import { Component, OnInit } from '@angular/core';
import { CommonService } from 'src/app/provider/common/common.service';
import { ApprovalService } from 'src/app/provider/approval/approval.service';
import { AlertController, ToastController } from '@ionic/angular';


@Component({
  selector: 'app-indent-approval',
  templateUrl: './indent-approval.component.html',
  styleUrls: ['./indent-approval.component.scss'],
})
export class IndentApprovalComponent  implements OnInit {
  pendingData: any = [];

  constructor(
    private httpCommon: CommonService,
    private httpApprov: ApprovalService,
    private alertController: AlertController,

  ) { }

  ngOnInit() {
    this.getIndentData();
  }

  getIndentData() {
    this.httpCommon.presentLoading().then(preload => {
      this.httpApprov.getIndentApp().subscribe({
        next: (data) => {
          console.log(data);
          this.pendingData = data?.data?.mr_approvals;
          this.httpCommon.dismissloading();
        },
        error: () => {
          this.httpCommon.dismissloading();
          console.log('err');
        },
        complete: () => {
          console.log('complete');
        }
      })
    })
  }
  async presentAlertConfirm(data: any, status: string, msg: string) {
    const alert = await this.alertController.create({
      header: msg + ' Material Request',
      message: 'Remark is Mandatory',
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
  
            if (!val.remark || val.remark.trim() === '') {
              this.httpCommon.presentToast('Remark is required!', 'danger');
              return false;   // ❌ Alert close nahi hoga
            }
  
            const payload = {
              rel_id: data?.rel_id,
              status: status,
              approver_remark: val.remark.trim()
            };
  
            this.submitMRApproveReject(payload);
  
            return true;   // ✅ Alert close hoga
          }
        }
      ]
    });
  
    await alert.present();
  }
  

  submitMRApproveReject(payload:any){

    this.httpCommon.presentLoading().then(()=>{
  
      this.httpApprov.indentAdjustApproveReject(payload).subscribe({
  
        next:(res:any)=>{
  
          if(res?.status){
  
            this.httpCommon.presentToast(res?.msg,'success');
  
            this.getIndentData();   // refresh MR list
          }
          else{
  
            this.httpCommon.presentToast(res?.msg,'danger');
          }
  
          this.httpCommon.dismissloading();
        },
  
        error:()=>{
  
          this.httpCommon.dismissloading();
  
          this.httpCommon.presentToast('Something went wrong','danger');
        }
      })
    })
  }
  
  

}
