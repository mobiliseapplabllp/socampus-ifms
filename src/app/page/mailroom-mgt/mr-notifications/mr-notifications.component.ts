import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { MailroomService } from 'src/app/provider/mailroom/mailroom.service';
import { MailroomUiService } from 'src/app/provider/mailroom/mailroom-ui.service';

/** Staff ki in-app notifications (bell). Push nahi hai - list khulne / refresh par aati hain. */
@Component({
  selector: 'app-mr-notifications',
  templateUrl: './mr-notifications.component.html',
})
export class MrNotificationsComponent {

  items: any[] = [];
  unread = 0;
  loading = true;

  constructor(
    public mr: MailroomService,
    private ui: MailroomUiService,
    private router: Router,
    private navCtrl: NavController,
  ) { }

  async ionViewDidEnter() {
    if (!(await this.mr.ready())) {
      this.navCtrl.navigateRoot('/mailroom-mgt');
      return;
    }
    this.load();
  }

  async load(event?: any) {
    try {
      const d = (await this.mr.notifications({ limit: 100 })).data || {};
      this.items = d.items || [];
      this.unread = d.unread || 0;
    } catch (err) {
      this.ui.error(err);
    }
    this.loading = false;
    event?.target.complete();
  }

  icon(type: string): string {
    switch (type) {
      case 'package_unassigned': return 'help-buoy-outline';
      case 'package_aging': return 'hourglass-outline';
      case 'package_overdue': return 'alarm-outline';
      case 'storage_full': return 'file-tray-full-outline';
      case 'expected_today':
      case 'expected_created': return 'calendar-outline';
      case 'delivery_round': return 'walk-outline';
      default: return 'notifications-outline';
    }
  }

  /** `link` web ka route hai - type ke hisaab se mobile screen */
  private target(n: any): string {
    switch (n.type) {
      case 'package_unassigned': return '/mailroom-mgt/packages?mode=live&storage=none';
      case 'package_aging': return '/mailroom-mgt/packages?mode=live&aging=3';
      case 'package_overdue': return '/mailroom-mgt/packages?mode=live&overdue=1';
      case 'expected_today':
      case 'expected_created': return '/mailroom-mgt/expected';
      case 'delivery_round': {
        const id = (n.link || '').split('/deliveries/')[1];
        return id ? '/mailroom-mgt/round/' + id : '/mailroom-mgt/rounds';
      }
      default: return '';
    }
  }

  async open(n: any) {
    if (!n.readAt) {
      n.readAt = new Date().toISOString();
      this.unread = Math.max(0, this.unread - 1);
      this.mr.readNotification(n.id).catch(() => {});
    }
    const url = this.target(n);
    if (url) { this.router.navigateByUrl(url); }
  }

  async readAll() {
    const res = await this.ui.busy(() => this.mr.readAllNotifications());
    if (res) { this.load(); }
  }

  async clearRead() {
    if (!(await this.ui.confirm('Clear notifications', 'Delete all read notifications?', 'Delete'))) { return; }
    const res = await this.ui.busy(() => this.mr.deleteReadNotifications());
    if (res) { this.load(); }
  }
}
