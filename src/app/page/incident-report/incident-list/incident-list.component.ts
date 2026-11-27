import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonService } from 'src/app/provider/common/common.service';
import { IncidentService } from 'src/app/provider/incident/incident.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-incident-list',
  templateUrl: './incident-list.component.html',
  styleUrls: ['./incident-list.component.scss'],
})
export class IncidentListComponent implements OnInit {
  incidents: any[] = [];
  total = 0;
  page = 1;
  limit = 20;
  searchVal = '';
  canLoadData = false;
  loaded = false;

  constructor(
    private router: Router,
    private common: CommonService,
    public httpIncident: IncidentService
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.reload();
  }

  reload(ev?: any) {
    this.page = 1;
    this.getIncidents(ev, true);
  }

  search(ev: any) {
    this.searchVal = ev.target.value || '';
    this.reload();
  }

  getIncidents(ev?: any, reset = false) {
    const params: any = { paginate: 'yes', limit: this.limit, page: this.page };
    if (this.searchVal) {
      params.search = this.searchVal;
    }
    this.httpIncident.getIncidents(params).subscribe({
      next: (res: any) => {
        this.loaded = true;
        if (res.status) {
          const rows = res.data?.data || [];
          this.incidents = reset ? rows : [...this.incidents, ...rows];
          this.total = res.data?.total || this.incidents.length;
          const lastPage = res.data?.last_page || 1;
          this.canLoadData = this.page < lastPage;
          if (this.canLoadData) {
            this.page++;
          }
        } else {
          if (reset) {
            this.incidents = [];
            this.total = 0;
          }
          this.canLoadData = false;
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

  infiniteScroll(ev: any) {
    this.getIncidents(ev);
  }

  openDetail(dat: any) {
    this.router.navigate(['/incident-report/detail', dat.id]);
  }

  openAdd() {
    this.router.navigateByUrl('/incident-report/add');
  }

}
