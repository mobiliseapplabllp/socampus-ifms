import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, NavController } from '@ionic/angular';
import { MailroomService } from 'src/app/provider/mailroom/mailroom.service';
import { MailroomUiService } from 'src/app/provider/mailroom/mailroom-ui.service';
import { MrStoragePickerComponent } from '../mr-pickers/mr-storage-picker.component';

/** Package ki poori detail, timeline aur actions (store, notify, hand over, exception) */
@Component({
  selector: 'app-mr-package-detail',
  templateUrl: './mr-package-detail.component.html',
})
export class MrPackageDetailComponent {

  id = '';
  p: any = null;
  timeline: any[] = [];
  loading = true;
  errorMsg = '';

  constructor(
    public mr: MailroomService,
    public ui: MailroomUiService,
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private modalCtrl: ModalController,
  ) {
    this.id = this.route.snapshot.paramMap.get('id') || '';
  }

  async ionViewDidEnter() {
    if (!(await this.mr.ready())) {
      this.navCtrl.navigateRoot('/mailroom-mgt');
      return;
    }
    this.load();   // hand-over se wapas aane par bhi taza
  }

  async load(event?: any) {
    this.errorMsg = '';
    try {
      this.p = (await this.mr.packageDetail(this.id)).data;
      this.timeline = (await this.mr.packageTimeline(this.id).catch(() => ({ data: [] }))).data || [];
    } catch (err) {
      this.errorMsg = this.mr.msg(err);
    }
    this.loading = false;
    event?.target.complete();
  }

  get released(): boolean { return this.mr.isReleased(this.p?.status); }
  get canManage(): boolean { return this.mr.can('packages.manage') && this.p?.status !== 'Delivered'; }
  get canResend(): boolean { return this.mr.can('packages.manage', 'packages.deliver') && !this.released; }
  get canDeliver(): boolean {
    if (!this.p || this.released) { return false; }
    // runner sirf apne chalu round ke package de sakta hai (server bhi check karta hai)
    return this.mr.can('packages.deliver') || (this.mr.can('delivery.run') && this.p.status === 'Out for Delivery');
  }

  deliver() {
    this.router.navigateByUrl('/mailroom-mgt/deliver/' + this.id);
  }

  track() {
    window.open(this.mr.trackingLink(this.p.trackingNumber, this.p.carrierRelation?.trackingUrlTemplate), '_system');
  }

  async store() {
    const modal = await this.modalCtrl.create({
      component: MrStoragePickerComponent,
      componentProps: { packageType: this.p.packageType },
    });
    await modal.present();
    const unit = (await modal.onWillDismiss()).data;
    if (unit) { this.patch({ storageLocationId: unit.id }, `Stored in ${unit.code}`); }
  }

  async notify() {
    const again = this.p.recipientNotified;
    const ok = await this.ui.confirm(again ? 'Send reminder' : 'Notify recipient',
      `Email ${this.p.recipientName} that the package is ready for pickup?`, 'Send');
    if (ok) { this.patch({ recipientNotified: true }, 'Recipient notified'); }
  }

  async resend() {
    const res = await this.ui.busy(() => this.mr.resendCode(this.id));
    if (res) { this.ui.ok(res.message); this.load(); }
  }

  /** Damaged / Returned / Lost - recipient ko reason ke saath email jaata hai */
  async exception() {
    const status = await this.ui.choose('Mark package as',
      ['Damaged', 'Returned', 'Lost'].filter(s => s !== this.p.status).map(s => ({ label: s, value: s })));
    if (!status) { return; }
    const reason = await this.ui.ask(`Mark as ${status}`, 'Reason', '', 'The recipient will be emailed this reason.');
    if (reason === null) { return; }
    if (!reason) { this.ui.warn('Please give a reason'); return; }
    this.patch({ status, reason }, `Package marked ${status}`);
  }

  private async patch(body: any, fallbackMsg: string) {
    const res = await this.ui.busy(() => this.mr.updatePackage(this.id, body));
    if (!res) { return; }
    this.ui.ok(res.message && res.message !== 'Package updated' ? res.message : fallbackMsg);
    this.load();
  }
}
