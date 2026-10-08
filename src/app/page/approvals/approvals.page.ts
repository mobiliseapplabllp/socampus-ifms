import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
    label:'Helpdesk PTW',
    icon: 'assets/imgs/helpdesk.png',
    url: '/approvals/ptw-approval',
    id: 1,
    count: 0
  },{
    label:'PPM PTW',
    icon: 'assets/imgs/pms.png',
    url: '/approvals/ppm-ptw',
    id: 2,
    count: 0
  },{
    label :'Ticket On Hold',
    icon :  'assets/imgs/images-removebg-preview.png',
    url: '/approvals/ticket-hold',
    id : 3,
    count : 0
  },{
    label :'PPM On Hold',
    icon :  'assets/imgs/images-removebg-preview.png',
    url: '/approvals/ppm-hold',
    id : 4,
    count : 0
  },
  {
    label :'Stock Approval',
    icon: 'assets/imgs/helpdesk.png',
    url: '/approvals/stock-adjust',
    id : 5,
    count : 0
  },{
    label :'Indent Approval',
    icon: 'assets/imgs/helpdesk.png',
    url: '/approvals/indent-approval',
    id : 6,
    count : 0
  }];
  loading: any;
  pendingList: any = [];
  constructor(
    private router: Router,
    private common: CommonService,
    private httpApproval: ApprovalService,
  ) { }

  ngOnInit() {}

  ionViewDidEnter() {
    // this.getPendingPTW();
    this.getMatrix();
  }

  handleRefresh(ev: any) {
    setTimeout(() => {
      ev.target.complete();
    }, 1000);
    this.getMatrix();
  }

  getMatrix() {
    this.common.presentLoading().then(preLoad => {
      this.httpApproval.getApprvalMatrix().subscribe({
        next:(data: any) => {
          if(data.status) {
            this.approvalsList[0].count = data?.data?.getComplaintPTWApprovals || 0;
            this.approvalsList[1].count = data?.data?.getPmsPtwApprovals || 0;
            this.approvalsList[2].count = data?.data?.getHelpdeskOnHoldTicketsList || 0;
            this.approvalsList[3].count = data?.data?.getPpmOnHoldWorkOrderList || 0;
          }
        },
        error:() => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    });    
  }

  ionViewDidLeave() {
    this.common.dismissloading();
  }

  openPage(data: any) {
    if (data.id === 1) {
      this.router.navigate([data.url], {
        queryParams: {
          data: JSON.stringify(data.data),
        }
      });
    } else {
      this.router.navigateByUrl(data.url);
    }
  }

  getPendingPTW() {
    this.common.presentLoading().then(preLoad => {
      this.httpApproval.getPendingPTW().subscribe({
        next:(data) => {
          if (data.status) {
            this.pendingList = data.data;
            // const index = this.approvalsList.findIndex((item: any) => item.id === 1);
            // this.approvalsList[index].count = this.pendingList.length;
            // this.approvalsList[index].data = this.pendingList;
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
}
