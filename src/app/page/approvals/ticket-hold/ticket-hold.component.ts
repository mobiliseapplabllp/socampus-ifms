import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ApprovalService } from 'src/app/provider/approval/approval.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-ticket-hold',
  templateUrl: './ticket-hold.component.html',
  styleUrls: ['./ticket-hold.component.scss'],
  standalone: false
})
export class TicketHoldComponent implements OnInit {
  holdDataList: any = [];
  isDataLoad = false;
  constructor(
    private common: CommonService,
    private httpApproval: ApprovalService,    
    private alertController: AlertController,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    this.getPendingOnHoldTickets();
  }

  openDoc(url: string, blobType: string) {
    this.common.openImg(url, blobType);
  }

  getPendingOnHoldTickets() {
    console.log('loading');
    this.isDataLoad = false;
    this.common.presentLoading().then(preLoad => {
      this.httpApproval.getHelpdeskOnHoldTickets().subscribe({
        next: (data) => {
          if (data.status) {
            this.holdDataList = data.data;
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error: () => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.common.dismissloading();
        },
        complete: () => {
          console.log('cmp');
          this.isDataLoad = true;
          this.common.dismissloading();
        }
      });
    })
  }

  async presentAlertConfirm(data: any, status: string, msg: string) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: msg + '?',
      message: 'Are you sure you want to ' + msg.toLowerCase() + ' this request?',
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
        text: 'YES',
        handler: (dat) => {
          if (dat.remark) {
            const obj = {
              app_type: data.approval_type,
              source: environment.source,
              hold_id: data.hold_id,
              remark: dat.remark,
              rel_id: data.tkts_id,
              status: status
            }
            this.actionHoldTicket(obj);
          } else {
            this.common.presentToast('Please Enter Remark', 'warning');
          }
        }
      }]
    });
    await alert.present();
  }

  actionHoldTicket(obj: any) {
    this.common.presentLoading().then(preLoad => {
      this.httpApproval.actionHoldTicket(obj).subscribe({
        next: (data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.holdDataList = this.holdDataList.filter((val: any) => val.hold_id !== obj.hold_id);
            if (this.holdDataList.length === 0) {
              this.navCtrl.pop();
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
      })
    })
  }
}
