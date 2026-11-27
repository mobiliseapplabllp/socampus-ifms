import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DmsService } from 'src/app/provider/dms/dms.service';

@Component({
  selector: 'app-doc-notifications',
  templateUrl: './doc-notifications.component.html',
  styleUrls: ['./doc-notifications.component.scss'],
})
export class DocNotificationsComponent implements OnInit {
  notifications: any[] = [];
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
      this.notifications = await this.dms.notifications() || [];
    } catch (e) {
      this.dms.showError(e);
    }
    this.loaded = true;
    ev?.target?.complete();
  }

  get hasUnread(): boolean {
    return this.notifications.some(n => !n.read_at);
  }

  async markAll() {
    try {
      await this.dms.markRead('all');
      await this.load();
    } catch (e) {
      this.dms.showError(e);
    }
  }

  async open(dat: any) {
    if (!dat.read_at) {
      try {
        await this.dms.markRead(dat.id);
        dat.read_at = new Date().toISOString();
      } catch (e) { }
    }
    // dat.link web route hai, app me document_id se kholte hain
    if (dat.document_id) {
      this.router.navigate(['/doc-mgt/detail', dat.document_id]);
    }
  }

  icon(type: string): string {
    return type?.startsWith('task') ? 'checkbox-outline' : type === 'comment' ? 'chatbubble-outline'
      : type === 'expiry' || type === 'review_due' ? 'alarm-outline' : type === 'published' || type === 'approved' ? 'cloud-done-outline' : 'notifications-outline';
  }

}
