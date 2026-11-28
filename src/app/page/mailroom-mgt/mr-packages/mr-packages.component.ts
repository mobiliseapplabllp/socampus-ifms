import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, NavController } from '@ionic/angular';
import { MailroomService } from 'src/app/provider/mailroom/mailroom.service';
import { MailroomUiService } from 'src/app/provider/mailroom/mailroom-ui.service';
import { MrStoragePickerComponent } from '../mr-pickers/mr-storage-picker.component';

const LIVE_STATUSES = ['Received', 'In Storage', 'Awaiting Pickup', 'Out for Delivery', 'Damaged'];
const ALL_STATUSES = [...LIVE_STATUSES, 'Delivered', 'Returned', 'Lost'];

/**
 * Packages ki list.
 *  ?mode=live     -> jo abhi mailroom me hain
 *  ?mode=logbook  -> sab (purane delivered `autoArchiveDays` ke baad chhupe rehte hain)
 * Extra filters: search, storage=none, overdue=1, aging=<days>, recipientId
 */
@Component({
  selector: 'app-mr-packages',
  templateUrl: './mr-packages.component.html',
})
export class MrPackagesComponent implements OnInit {

  mode: 'live' | 'logbook' = 'live';
  search = '';
  status = '';
  extraLabel = '';
  statuses: string[] = LIVE_STATUSES;

  list: any[] = [];
  stats: any = null;
  total = 0;
  page = 1;
  canLoad = false;
  loading = false;

  // multi-select (bulk notify / bulk storage)
  selecting = false;
  selected = new Set<string>();

  private extra: any = {};
  private seq = 0;

  constructor(
    public mr: MailroomService,
    private ui: MailroomUiService,
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private modalCtrl: ModalController,
  ) { }

  ngOnInit() {
    const q = this.route.snapshot.queryParamMap;
    this.mode = q.get('mode') === 'logbook' ? 'logbook' : 'live';
    this.statuses = this.mode === 'live' ? LIVE_STATUSES : ALL_STATUSES;
    this.search = q.get('search') || '';
    if (q.get('storage') === 'none') {
      this.extra.storageLocationId = 'none';
      this.extraLabel = 'No storage';
    }
    if (q.get('overdue')) {
      this.extra.overdue = 1;
      this.extraLabel = 'Overdue';
    }
    if (q.get('aging')) {
      this.extra.agingDays = q.get('aging');
      this.extraLabel = `Over ${q.get('aging')} days`;
    }
    if (q.get('recipientId')) { this.extra.recipientId = q.get('recipientId'); }
  }

  get title(): string { return this.mode === 'live' ? 'Live Packages' : 'Logbook'; }
  get canBulk(): boolean { return this.mr.can('packages.manage'); }

  async ionViewDidEnter() {
    if (!(await this.mr.ready())) {
      this.navCtrl.navigateRoot('/mailroom-mgt');
      return;
    }
    this.reload();   // detail se wapas aane par bhi taza
  }

  private filters(withStatus = true): any {
    const f: any = { ...this.extra, search: this.search.trim() };
    if (this.mode === 'live') { f.live = 1; }
    if (withStatus && this.status) { f.status = this.status; }
    if (this.mode === 'logbook' && this.mr.setting('automation', 'autoArchiveDelivered', true)) {
      const days = Number(this.mr.setting('general', 'autoArchiveDays', 90)) || 90;
      f.archivedBefore = new Date(Date.now() - days * 86400000).toISOString();
    }
    return f;
  }

  async reload(event?: any) {
    const mine = ++this.seq;
    this.page = 1;
    this.loading = !this.list.length;
    try {
      const [res, stats] = await Promise.all([
        this.mr.packages({ ...this.filters(), page: 1 }),
        this.mr.packageStats(this.filters(false)).catch(() => null),
      ]);
      if (mine !== this.seq) { return; }
      this.list = res.data || [];
      this.total = res.meta?.total || this.list.length;
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
      const res = await this.mr.packages({ ...this.filters(), page: this.page + 1 });
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
    this.status = this.status === s ? '' : s;
    this.list = [];
    this.reload();
  }

  count(s: string): number { return this.stats?.byStatus?.[s] || 0; }

  clearExtra() {
    this.extra = {};
    this.extraLabel = '';
    this.list = [];
    this.reload();
  }

  tap(p: any) {
    if (this.selecting) {
      if (this.selected.has(p.id)) { this.selected.delete(p.id); } else { this.selected.add(p.id); }
      return;
    }
    this.router.navigateByUrl('/mailroom-mgt/package/' + p.id);
  }

  toggleSelect() {
    this.selecting = !this.selecting;
    this.selected.clear();
  }

  // ----- bulk -----
  async bulkNotify() {
    const ids = Array.from(this.selected);
    if (!(await this.ui.confirm('Notify recipients', `Send the pickup email for ${ids.length} package(s)?`, 'Notify'))) { return; }
    this.runBulk({ action: 'notify', packageIds: ids });
  }

  async bulkStorage() {
    const modal = await this.modalCtrl.create({ component: MrStoragePickerComponent });
    await modal.present();
    const unit = (await modal.onWillDismiss()).data;
    if (!unit) { return; }
    this.runBulk({ action: 'assign_storage', packageIds: Array.from(this.selected), storageLocationId: unit.id });
  }

  private async runBulk(body: any) {
    const res = await this.ui.busy(() => this.mr.bulk(body));
    if (!res) { return; }
    this.ui.ok(res.message);
    this.toggleSelect();
    this.reload();
  }
}
