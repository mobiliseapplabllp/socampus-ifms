import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, NavController } from '@ionic/angular';
import { MailroomService } from 'src/app/provider/mailroom/mailroom.service';
import { MailroomUiService } from 'src/app/provider/mailroom/mailroom-ui.service';

/** Mail Room Panel ka home: dashboard, quick actions, bell, site switch */
@Component({
  selector: 'app-mr-home',
  templateUrl: './mr-home.component.html',
})
export class MrHomeComponent {

  stats: any = null;
  unread = 0;
  loading = false;
  actions: { label: string; icon: string; run: () => void }[] = [];

  private badgeTimer: any;
  private scanning = false;

  constructor(
    public mr: MailroomService,
    private ui: MailroomUiService,
    private router: Router,
    private navCtrl: NavController,
    private actionSheetCtrl: ActionSheetController,
  ) { }

  async ionViewDidEnter() {
    if (!(await this.mr.ready())) {
      this.navCtrl.navigateRoot('/mailroom-mgt');
      return;
    }
    this.buildActions();
    this.load();
    // push nahi hai: foreground me har 60 sec par badge poll
    this.pollBadge();
    clearInterval(this.badgeTimer);
    this.badgeTimer = setInterval(() => this.pollBadge(), 60000);

    if (this.scanning) {
      this.scanning = false;
      const code = this.ui.takeScan();
      if (code) { this.find(code); }
    }
  }

  ionViewWillLeave() {
    clearInterval(this.badgeTimer);
  }

  private buildActions() {
    const go = (url: string) => () => this.open(url);
    const list: { label: string; icon: string; run: () => void }[] = [];
    if (this.mr.can('packages.receive')) {
      list.push({ label: 'Receive', icon: 'add-circle-outline', run: go('/mailroom-mgt/receive') });
    }
    if (this.mr.can('packages.view', 'packages.deliver', 'delivery.run') && this.mr.setting('general', 'enableBarcodeScanning', true)) {
      list.push({ label: 'Scan', icon: 'scan-outline', run: () => this.scan() });
    }
    if (this.mr.can('packages.view')) {
      list.push({ label: 'Packages', icon: 'cube-outline', run: go('/mailroom-mgt/packages?mode=live') });
      list.push({ label: 'Logbook', icon: 'book-outline', run: go('/mailroom-mgt/packages?mode=logbook') });
    }
    if (this.mr.setting('general', 'deskDeliveryEnabled', true) && this.mr.can('delivery.view', 'delivery.run', 'delivery.manage')) {
      list.push({ label: 'Desk delivery', icon: 'walk-outline', run: go('/mailroom-mgt/rounds') });
    }
    if (this.mr.can('expected.view')) {
      list.push({ label: 'Expected', icon: 'calendar-outline', run: go('/mailroom-mgt/expected') });
    }
    this.actions = list;
  }

  async load(event?: any) {
    if (this.mr.can('dashboard.view')) {
      this.loading = !this.stats;
      try {
        this.stats = (await this.mr.dashboard()).data;
      } catch (err) {
        this.ui.error(err);
      }
      this.loading = false;
    }
    event?.target.complete();
  }

  async refresh(event: any) {
    await this.mr.loadMasters().catch(() => {});
    this.buildActions();
    this.pollBadge();
    this.load(event);
  }

  private async pollBadge() {
    try {
      this.unread = (await this.mr.notifications({ unread: true, limit: 1 })).data?.unread || 0;
    } catch { /* badge chup-chaap */ }
  }

  open(url: string) {
    this.router.navigateByUrl(url);
  }

  openPackage(id: string) {
    if (this.mr.can('packages.view', 'packages.deliver', 'delivery.run')) {
      this.open('/mailroom-mgt/package/' + id);
    }
  }

  // ----- scan to find -----
  scan() {
    this.scanning = true;
    this.ui.startScan();
  }

  async find(code: string) {
    const res = await this.ui.busy(() => this.mr.lookup(code));
    if (!res) { return; }
    const found = res.data || [];
    if (!found.length) {
      this.ui.warn('No package found for this code');
    } else if (found.length === 1) {
      this.open('/mailroom-mgt/package/' + found[0].id);
    } else {
      // ek hi tracking number kai baar receive hua
      this.open('/mailroom-mgt/packages?mode=logbook&search=' + encodeURIComponent(code));
    }
  }

  // ----- menu -----
  async menu() {
    const buttons: any[] = [];
    if (this.mr.properties.length > 1) {
      buttons.push({ text: 'Switch site', icon: 'business-outline', handler: () => { this.switchSite(); } });
    }
    if (this.mr.hasMyPackage) {
      buttons.push({ text: 'My Package', icon: 'cube-outline', handler: () => { this.myPackage(); } });
    }
    buttons.push({ text: 'Sign out of Mail Room', icon: 'log-out-outline', role: 'destructive', handler: () => { this.signOut(); } });
    buttons.push({ text: 'Cancel', role: 'cancel' });
    const sheet = await this.actionSheetCtrl.create({ header: this.mr.me?.name || 'Mail Room', buttons });
    sheet.present();
  }

  async switchSite() {
    const id = await this.ui.choose('Select site',
      this.mr.properties.map(p => ({ label: p.name, value: p.id })), this.mr.propertyId);
    if (!id || id === this.mr.propertyId) { return; }
    // site badalne par permissions, settings aur lists sab badalte hain
    this.stats = null;
    await this.ui.busy(() => this.mr.selectProperty(id));
    this.buildActions();
    this.load();
    this.pollBadge();
  }

  async myPackage() {
    const ok = await this.ui.busy(() => this.mr.openPortalFromStaff().then(() => true));
    if (ok) { this.open('/mailroom-mgt/my-package'); }
  }

  async signOut() {
    await this.ui.busy(() => this.mr.logoutStaff());
    this.navCtrl.navigateBack('/list-master');
  }
}
