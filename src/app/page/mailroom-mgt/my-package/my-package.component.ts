import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { MailroomService } from 'src/app/provider/mailroom/mailroom.service';
import { MailroomUiService } from 'src/app/provider/mailroom/mailroom-ui.service';
import { MailroomSession } from 'src/app/provider/mailroom/mailroom-session';

/**
 * My Package (recipient): apne parcels, pickup code + QR, history,
 * delivery pre-register karna, preferences. Portal token se chalta hai.
 * Pickup code sirf yahin dikhta hai - staff screens par kabhi nahi.
 */
@Component({
  selector: 'app-my-package',
  templateUrl: './my-package.component.html',
})
export class MyPackageComponent {

  tab: 'open' | 'history' | 'expected' | 'prefs' = 'open';
  data: any = null;
  prefs: any = {};
  loading = true;
  errorMsg = '';

  expectedOpen = false;
  form: any = {};
  carriers: any[] = [];

  constructor(
    public mr: MailroomService,
    private ui: MailroomUiService,
    private navCtrl: NavController,
  ) { }

  ionViewDidEnter() {
    if (!MailroomSession.portalToken()) {
      this.navCtrl.navigateRoot('/mailroom-mgt');
      return;
    }
    this.load();
  }

  async load(event?: any) {
    this.errorMsg = '';
    try {
      this.data = (await this.mr.portalMe()).data;
      const r = this.data?.recipient || {};
      this.prefs = {
        phone: r.phone || '',
        alternateRecipient: r.alternateRecipient || '',
        deliveryInstructions: r.deliveryInstructions || '',
        emailOn: r.notificationPreference !== 'None',
        preferredLanguage: r.preferredLanguage || 'en',
      };
    } catch (err) {
      this.errorMsg = this.mr.msg(err);
    }
    this.loading = false;
    event?.target.complete();
  }

  statusText(status: string): string {
    switch (status) {
      case 'Received':
      case 'In Storage': return 'At the mailroom';
      case 'Awaiting Pickup': return 'Ready for pickup';
      case 'Out for Delivery': return 'On its way to your desk';
      case 'Damaged': return 'Damaged – contact the mailroom';
      default: return status;
    }
  }

  // ----- home site (sirf jab pending ho) -----
  async chooseHome(site: any) {
    if (!(await this.ui.confirm('Home site', `Set ${site.name} as your home site? This can be chosen only once.`, 'Confirm'))) { return; }
    const res = await this.ui.busy(() => this.mr.portalHomeSite(site.id));
    if (res) { this.load(); }
  }

  // ----- preferences -----
  async savePrefs() {
    const body = {
      phone: this.prefs.phone.trim(),
      alternateRecipient: this.prefs.alternateRecipient.trim(),
      deliveryInstructions: this.prefs.deliveryInstructions.trim(),
      notificationPreference: this.prefs.emailOn ? 'Email' : 'None',
      preferredLanguage: this.prefs.preferredLanguage,
    };
    const res = await this.ui.busy(() => this.mr.portalSavePrefs(body));
    if (res) { this.ui.ok(res.message); this.load(); }
  }

  // ----- pre-register a delivery -----
  async openExpected() {
    this.form = { carrier: '', expectedDate: this.mr.todayStr(), trackingNumber: '', description: '', notes: '' };
    this.expectedOpen = true;
    if (!this.carriers.length) {
      try {
        this.carriers = (await this.mr.portalCarriers()).data || [];
      } catch (err) {
        this.ui.error(err);
      }
    }
  }

  async saveExpected() {
    if (!this.form.carrier) { this.ui.warn('Carrier is required'); return; }
    if (!this.form.expectedDate) { this.ui.warn('Expected date is required'); return; }
    const body: any = { carrier: this.form.carrier, expectedDate: this.form.expectedDate };
    for (const k of ['trackingNumber', 'description', 'notes']) {
      const v = (this.form[k] || '').trim();
      if (v) { body[k] = v; }
    }
    const res = await this.ui.busy(() => this.mr.portalExpected(body));
    if (!res) { return; }
    this.ui.ok('Delivery pre-registered');
    this.expectedOpen = false;
    this.tab = 'expected';
    this.load();
  }

  async signOut() {
    if (!(await this.ui.confirm('Sign out', 'Sign out of My Package?', 'Sign out'))) { return; }
    await this.ui.busy(() => this.mr.logoutPortal());
    this.navCtrl.back();
  }
}
