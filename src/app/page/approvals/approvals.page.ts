import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { ApprovalService } from 'src/app/provider/approval/approval.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-approvals',
  templateUrl: './approvals.page.html',
  styleUrls: ['./approvals.page.scss'],
})
export class ApprovalsPage implements OnInit {
  approvalsList: any = [{
    label:'PTW Approval',
    icon: 'assets/imgs/leave_approval.svg',
    url: '/approvals/ptw-approval',
    id: 1,
    count: 0
  }];
  loading: any;
  pendingList: any = [];
  constructor(
    private router: Router,
    private loadingController: LoadingController,
    private common: CommonService,
    private httpApproval: ApprovalService,
  ) { }

  ngOnInit() {}

  ionViewDidEnter() {
    this.getPendingPTW();
  }

  ionViewDidLeave() {
    this.dismissloading();
  }

  openPage(data: any) {
    this.router.navigate([data.url], {
      queryParams: {
        data: JSON.stringify(data.data),
      }
    });
  }

  getPendingPTW() {
    this.presentLoading().then(preLoad => {
      this.httpApproval.getPendingPTW().subscribe({
        next:(data) => {
          if (data.status) {
            this.pendingList = data.data;
            const index = this.approvalsList.findIndex((item: any) => item.id === 1);
            this.approvalsList[index].count = this.pendingList.length;
            this.approvalsList[index].data = this.pendingList;

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
}
