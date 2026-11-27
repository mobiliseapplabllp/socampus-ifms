import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonService } from 'src/app/provider/common/common.service';
import { IncidentService } from 'src/app/provider/incident/incident.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-incident-report',
  templateUrl: './incident-report.page.html',
  styleUrls: ['./incident-report.page.scss'],
})
export class IncidentReportPage implements OnInit {
  dashboard: any = {};
  recent: any[] = [];

  constructor(
    private router: Router,
    private common: CommonService,
    public httpIncident: IncidentService
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.getDashboard();
  }

  getDashboard(ev?: any) {
    this.httpIncident.getDashboard().subscribe({
      next: (res: any) => {
        if (res.status) {
          this.dashboard = res.data || {};
          this.recent = this.dashboard.recent || [];
        } else {
          this.common.presentToast(res.msg || 'Data Not Found', 'warning');
        }
      },
      error: () => {
        ev?.target?.complete();
        this.common.presentToast(environment.errMsg, 'danger');
      },
      complete: () => {
        ev?.target?.complete();
      }
    });
  }

  openRoute(url: string) {
    this.router.navigateByUrl(url);
  }

  openDetail(dat: any) {
    this.router.navigate(['/incident-report/detail', dat.id]);
  }

}
