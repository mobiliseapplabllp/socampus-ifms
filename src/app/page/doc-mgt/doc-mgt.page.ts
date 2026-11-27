import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DmsService } from 'src/app/provider/dms/dms.service';

@Component({
  selector: 'app-doc-mgt',
  templateUrl: './doc-mgt.page.html',
  styleUrls: ['./doc-mgt.page.scss'],
})
export class DocMgtPage implements OnInit {
  kpis: any[] = [];
  recent: any[] = [];
  unread = 0;
  pendingTasks = 0;
  loaded = false;

  constructor(
    private router: Router,
    public dms: DmsService
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.load();
  }

  async load(ev?: any) {
    try {
      await this.dms.init(!!ev);
      const [dashboard, unread, counts] = await Promise.all([
        this.dms.dashboard(), this.dms.unreadCount(), this.dms.taskCounts()
      ]);
      this.kpis = dashboard?.kpis || [];
      const list = (dashboard?.lists || []).find((l: any) => l.key === 'recent');
      this.recent = list?.rows || [];
      this.unread = Number(unread) || 0;
      this.pendingTasks = Number(counts?.all) || 0;
    } catch (e) {
      this.dms.showError(e);
    }
    this.loaded = true;
    ev?.target?.complete();
  }

  kpiIcon(key: string): string {
    return key === 'actions' ? 'checkbox-outline' : key === 'mine' ? 'folder-open-outline'
      : key === 'published' ? 'cloud-done-outline' : key === 'unread' ? 'notifications-outline' : 'document-outline';
  }

  kpiTone(key: string): string {
    return key === 'actions' ? 'warning' : key === 'published' ? 'success' : key === 'unread' ? 'danger' : 'primary';
  }

  // Dashboard ke link web routes hain, unhe app screens par map karte hain
  openKpi(kpi: any) {
    const path = String(kpi?.link?.path || '');
    if (path.includes('approvals')) {
      this.open('/doc-mgt/tasks');
    } else if (path.includes('notifications')) {
      this.open('/doc-mgt/notifications');
    } else {
      this.openList({ ...(kpi?.link?.query || {}), title: kpi.label });
    }
  }

  open(url: string) {
    this.router.navigateByUrl(url);
  }

  openList(queryParams: any) {
    this.router.navigate(['/doc-mgt/list'], { queryParams });
  }

  openDetail(dat: any) {
    this.router.navigate(['/doc-mgt/detail', dat.id]);
  }

}
