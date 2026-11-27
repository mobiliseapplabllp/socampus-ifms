import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonService } from 'src/app/provider/common/common.service';
import { KeysService } from 'src/app/provider/keys/keys.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-key-mgt-home',
  templateUrl: './key-mgt-home.component.html',
  styleUrls: ['./key-mgt-home.component.scss'],
})
export class KeyMgtHomeComponent  implements OnInit {
  summaryArr: any = [];
  recent: any = [];
  // recent: any = [{
  //   status: 'Returned',
  //   date: '12 Dec 2025, 10:00:00',
  //   issue_to: 'Ravi Kumar',
  //   auth_by: 'Mukesh',
  //   dept: 'IT'
  // },{
  //   status: 'Returned',
  //   date: '12 Dec 2025, 10:00:00',
  //   issue_to: 'Ravi Kumar',
  //   auth_by: 'Mukesh',
  //   dept: 'IT'
  // },{
  //   status: 'Returned',
  //   date: '12 Dec 2025, 10:00:00',
  //   issue_to: 'Ravi Kumar',
  //   auth_by: 'Mukesh',
  //   dept: 'IT'
  // }];
  constructor(
    private router : Router,
    private httpKeys: KeysService,
    private common: CommonService
  ) { }

  ngOnInit() {
    
  }

  ionViewDidEnter() {
    this.loadHomePage();
  }

  loadHomePage() {
    this.getSummary();
    this.getRecentAssignment();
  }

  getSummary() {
    this.common.presentLoading().then(preLoad => {
      this.httpKeys.getSummary().subscribe({
        next:(data: any) => {          
          const d = data?.data || {};
          this.summaryArr = {
            keyStatus: { total: d.total, available: d.available, assigned: d.issued, lost: d.lost },
            overdueAssignments: d.overdue
          };
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

  getRecentAssignment() {
    this.httpKeys.getRecentHistory().subscribe({
      next:(data: any) => {        
        if (data.status) {
          this.recent = (data.data || []).slice(0, 5);
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      },
      error:() => {

      },
      complete:() => {

      }
    });
  }

  
  onClick(url : any){
    this.router.navigateByUrl(url)    
  }

  handleRefresh(event: any) {
    event.target.complete();
    this.loadHomePage();
  }

}
