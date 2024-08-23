import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
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
    private loadingController: LoadingController,
    private common: CommonService,
    private alertController: AlertController,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    this.getPendingPtw();
  }

  getPendingPtw() {
    this.presentLoading().then(preLoad => {
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
          this.dismissloading();
        }
      })
    });
  }

  openDoc(url: string) {
    this.common.openDoc(url);
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please Wait...',
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  async presentAlertConfirm(data: any, status: string, msg: string) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: msg + '?',
      message: 'Are you sure you want to ' + msg.toLowerCase() + ' this request?',
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
    this.presentLoading().then(preLoad => {
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
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      })
    })
  }

}
