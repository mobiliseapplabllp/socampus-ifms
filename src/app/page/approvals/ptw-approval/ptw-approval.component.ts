import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular';
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
  requestData: any = [];
  pendingList: any = [];
  constructor(
    private httpApproval: ApprovalService,
    private common: CommonService,
    private alertController: AlertController,
    private activeRoute: ActivatedRoute,
    private navCtrl: NavController

  ) { }

  ngOnInit() {
    this.getPendingPTW();
    // this.activeRoute.queryParams.subscribe((res) => {
    //   this.requestData = JSON.parse(res['data']);
    //   this.pendingList = this.requestData;
    // });
  }

  getPendingPTW() {
    this.common.presentLoading().then(preLoad => {
      this.httpApproval.getPendingPTW().subscribe({
        next:(data) => {
          if (data.status) {
            this.pendingList = data.data;
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.common.dismissloading();
        },
        complete:() => {
          this.common.dismissloading();
        }
      })
    })
  }

  openDoc(url: string, blobType: string) {
    this.common.openImg(url, blobType);
  }

  changeSegment(ev: any) {
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
    this.common.presentLoading().then(preLoad => {
      this.httpApproval.actionPtw(obj).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.pendingList = this.pendingList.filter((val: any) => val.rel_id !== obj.rel_id);
            if (this.pendingList.length === 0) {
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
