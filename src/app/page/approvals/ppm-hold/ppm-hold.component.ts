import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { ApprovalService } from 'src/app/provider/approval/approval.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-ppm-hold',
  templateUrl: './ppm-hold.component.html',
  styleUrls: ['./ppm-hold.component.scss'],
})
export class PpmHoldComponent  implements OnInit {
  data: any = [];
  constructor(
    private httpPpm: ApprovalService,
    private common: CommonService,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.getPpmHold();
    // this.testfun();
  }

  testfun() {
    this.common.presentLoading().then(preLoad => {
      setTimeout(() => {
        this.common.dismissloading();
      }, 4000);      
    })
  }

  getPpmHold() {
    this.common.presentLoading().then(preLoad => {
      this.httpPpm.getPpmHold().subscribe({
        next:(data: any) => {
          console.log(data);
          if (data.status) {  
            this.data = data.data;
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          console.log('a');
          this.common.dismissloading();
        }
      });
    });
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
              rel_id: data.wo_id,
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
      this.httpPpm.actionHoldPPM(obj).subscribe({
        next: (data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.data = this.data.filter((val: any) => val.hold_id !== obj.hold_id);            
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

  openDoc(url: string, blobType: string) {
    this.common.openImg(url, blobType);
  }

}
