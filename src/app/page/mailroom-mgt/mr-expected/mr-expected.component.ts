import { Component } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
import { MailroomService } from 'src/app/provider/mailroom/mailroom.service';
import { MailroomUiService } from 'src/app/provider/mailroom/mailroom-ui.service';
import { MrRecipientPickerComponent } from '../mr-pickers/mr-recipient-picker.component';

/** Expected deliveries (staff): list, counts, naya add karna, cancel / restore */
@Component({
  selector: 'app-mr-expected',
  templateUrl: './mr-expected.component.html',
})
export class MrExpectedComponent {

  status = 'Pending';
  statuses = ['Pending', 'Overdue', 'Arrived', 'Cancelled'];
  list: any[] = [];
  stats: any = null;
  page = 1;
  canLoad = false;
  loading = true;

  createOpen = false;
  form: any = {};
  recipient: any = null;

  private seq = 0;

  constructor(
    public mr: MailroomService,
    private ui: MailroomUiService,
    private navCtrl: NavController,
    private modalCtrl: ModalController,
  ) { }

  get canManage(): boolean { return this.mr.can('expected.manage'); }

  async ionViewDidEnter() {
    if (!(await this.mr.ready())) {
      this.navCtrl.navigateRoot('/mailroom-mgt');
      return;
    }
    this.reload();
  }

  async reload(event?: any) {
    const mine = ++this.seq;
    this.page = 1;
    try {
      const [res, stats] = await Promise.all([
        this.mr.expected({ status: this.status, page: 1 }),
        this.mr.expectedStats().catch(() => null),
      ]);
      if (mine !== this.seq) { return; }
      this.list = res.data || [];
      this.canLoad = this.page < (res.meta?.totalPages || 1);
      this.stats = stats?.data || null;
    } catch (err) {
      if (mine === this.seq) { this.ui.error(err); }
    }
    this.loading = false;
    event?.target.complete();
  }

  async more(event: any) {
    const mine = this.seq;
    try {
      const res = await this.mr.expected({ status: this.status, page: this.page + 1 });
      if (mine === this.seq) {
        this.page++;
        this.list = this.list.concat(res.data || []);
        this.canLoad = this.page < (res.meta?.totalPages || 1);
      }
    } catch (err) {
      this.ui.error(err);
    }
    event.target.complete();
  }

  setStatus(s: string) {
    this.status = s;
    this.list = [];
    this.loading = true;
    this.reload();
  }

  count(s: string): number { return this.stats?.[s.toLowerCase()] || 0; }

  /** Dikhne wala status: Arrived -> Cancelled -> Overdue -> Pending */
  shown(e: any): string {
    if (e.arrived || e.packageId) { return 'Arrived'; }
    if (e.cancelled) { return 'Cancelled'; }
    return this.mr.dateOnly(e.expectedDate) < this.mr.todayStr() ? 'Overdue' : 'Pending';
  }

  color(s: string): string {
    return s === 'Arrived' ? 'success' : s === 'Cancelled' ? 'medium' : s === 'Overdue' ? 'danger' : 'primary';
  }

  async cancel(e: any) {
    const reason = await this.ui.ask('Cancel expected delivery', 'Reason (optional)');
    if (reason === null) { return; }
    const body: any = { cancelled: true };
    if (reason) { body.cancelReason = reason; }
    const res = await this.ui.busy(() => this.mr.updateExpected(e.id, body));
    if (res) { this.ui.ok('Expected delivery cancelled'); this.reload(); }
  }

  async restore(e: any) {
    const res = await this.ui.busy(() => this.mr.updateExpected(e.id, { cancelled: false }));
    if (res) { this.ui.ok('Expected delivery restored'); this.reload(); }
  }

  // ----- create -----
  openCreate() {
    this.form = { carrier: '', expectedDate: this.mr.todayStr(), trackingNumber: '', description: '', notes: '' };
    this.recipient = null;
    this.createOpen = true;
  }

  async pickRecipient() {
    const modal = await this.modalCtrl.create({ component: MrRecipientPickerComponent });
    await modal.present();
    const r = (await modal.onWillDismiss()).data;
    if (r) { this.recipient = r; }
  }

  async create() {
    if (!this.recipient) { this.ui.warn('Select the recipient'); return; }
    if (!this.form.carrier) { this.ui.warn('Carrier is required'); return; }
    if (!this.form.expectedDate) { this.ui.warn('Expected date is required'); return; }
    const body: any = { recipientId: this.recipient.id, carrier: this.form.carrier, expectedDate: this.form.expectedDate };
    for (const k of ['trackingNumber', 'description', 'notes']) {
      const v = (this.form[k] || '').trim();
      if (v) { body[k] = v; }
    }
    const res = await this.ui.busy(() => this.mr.createExpected(body));
    if (!res) { return; }
    this.ui.ok('Expected delivery added');
    this.createOpen = false;
    this.setStatus('Pending');
  }
}
