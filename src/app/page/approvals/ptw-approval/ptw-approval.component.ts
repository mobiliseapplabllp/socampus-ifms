import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';
import { ApprovalService } from 'src/app/provider/approval/approval.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-ptw-approval',
  templateUrl: './ptw-approval.component.html',
  styleUrls: ['./ptw-approval.component.scss'],
})
export class PtwApprovalComponent  implements OnInit {
  segmentStatus = 'pending'
  loading: any;
  pendingList: any = [];
  constructor(
    private httpApproval: ApprovalService,
    private loadingController: LoadingController,
    private common: CommonService,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.getPendingPTW();
  }

  getPendingPTW() {
    this.presentLoading().then(preLoad => {
      this.httpApproval.getPendingPTW().subscribe({
        next:(data) => {
          console.log(data);
          if (data.status) {
            this.pendingList = data.data;
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.dismissloading();
        },
        complete:() => {
          this.dismissloading();
        }
      })
    })

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

  changeSegment(ev: any) {
    console.log(ev.target.value);
  }

  async presentAlertConfirm(data: any, status: string, msg: string) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: msg + '?',
      message: 'Are you Sure Want to ' + msg + '?',
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
                rel_id: data.rel_id,
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
    console.log(obj);
    this.presentLoading().then(preLoad => {
      this.httpApproval.actionPtw(obj).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.pendingList = this.pendingList.filter((val: any) => val.rel_id !== obj.rel_id);
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
