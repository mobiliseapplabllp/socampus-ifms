import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { format } from 'path';
import { CommonService } from 'src/app/provider/common/common.service';
import { ConciergeService } from 'src/app/provider/concierge/concierge.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-assign-user',
  templateUrl: './assign-user.component.html',
  styleUrls: ['./assign-user.component.scss'],
})
export class AssignUserComponent  implements OnInit {
  id: any;
  tab: any;

  assignUsers: any = [];
  tckt: any = [];
  isSelect: any;
  constructor(
    private common: CommonService,
    private httpConcierge: ConciergeService,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    // console.log(this.assignUsers);
    // console.log(this.tckt);
    this.getSpecificTicket();
  }

  getSpecificTicket() {
    const obj = {
      tab: this.tab,
      tckt: this.id,
    }
    this.common.presentLoading().then(preLoad => {
      this.httpConcierge.getSpecificTicket(obj).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.assignUsers = data.data.assignUsers;
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
      });
    })
  }

  close(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  assign(dat: any) {
    console.log(dat);
    const formData = new FormData();
    formData.append('tckt', this.id);
    formData.append('assign_to', dat.id);
    formData.append('source', environment.source);
    this.common.presentLoading().then(preLoad => {
      this.httpConcierge.ticketAssign(formData).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            this.close(null, true);
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
      });
    });
  }

}
