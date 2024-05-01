import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-approvals',
  templateUrl: './approvals.page.html',
  styleUrls: ['./approvals.page.scss'],
})
export class ApprovalsPage implements OnInit {
  approvalsList: any = [{
    label:'PTW Approval',
    icon: 'assets/imgs/leave_approval.svg',
    url: '/approvals/ptw-approval'
  }]
  constructor(
    private router: Router
  ) { }

  ngOnInit() {
  }

  openPage(url: string) {
    this.router.navigateByUrl(url);
  }

}
