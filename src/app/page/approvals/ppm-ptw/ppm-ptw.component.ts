import { Component, OnInit } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { ApprovalService } from 'src/app/provider/approval/approval.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-ppm-ptw',
  templateUrl: './ppm-ptw.component.html',
  styleUrls: ['./ppm-ptw.component.scss'],
})
export class PpmPtwComponent  implements OnInit {
  loading: any;
  pendingData: any = [];
  constructor(
    private httpApproval: ApprovalService,
    private common: CommonService,
    private alertController: AlertController,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    this.getPendingPtw();
  }

  getPendingPtw() {
    this.common.presentLoading().then(preLoad => {
      this.httpApproval.getPendingPpmPtw().subscribe({
        next:(data) => {
          if (data.status) {
            this.pendingData = data.data;
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading();
        }
      })
    });
  }

  openDoc(url: string) {
    this.common.openImg(url, '');
  }

  async presentAlertConfirm(data: any, status: string, msg: string) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: msg + '?',
      message: 'Are you sure you want to ' + msg.toLowerCase() + ' WO #' + data.wo_id,
      mode: 'ios',
      inputs: [{
        name: 'remark',
        type:'textarea',
        placeholder: 'Enter Remarks',
      }],
      buttons: [{
        text: 'Cancel',
          handler: (data) => {
          }
        },{
          text: 'YES',
          handler: (dat) => {
            if(dat.remark){
              const obj = {
                source: environment.source,
                remark: dat.remark,
                rel_id: data.ptw_id,
                status: status
              }
              this.actionPtw(obj);
            } else {
              this.common.presentToast('Please Enter Remark', 'warning');
            }
          }
        }]
    });
    await alert.present();
  }

  actionPtw(obj: any) {
    this.common.presentLoading().then(preLoad => {
      this.httpApproval.actionPpmPtw(obj).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.pendingData = this.pendingData.filter((val: any) => val.ptw_id !== obj.rel_id);
            if (this.pendingData.length === 0) {
              this.navCtrl.pop();
            }
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
      })
    })
  }

}
