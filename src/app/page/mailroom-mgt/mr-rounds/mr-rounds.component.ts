import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { MailroomService } from 'src/app/provider/mailroom/mailroom.service';
import { MailroomUiService } from 'src/app/provider/mailroom/mailroom-ui.service';

/**
 * Desk delivery rounds.
 * Runner (delivery.manage ke bina) ko server sirf uske apne rounds deta hai.
 * Manager naya round bana sakta hai: packages chuno + runner do.
 */
@Component({
  selector: 'app-mr-rounds',
  templateUrl: './mr-rounds.component.html',
})
export class MrRoundsComponent {

  tab: 'open' | 'closed' = 'open';
  list: any[] = [];
  loading = true;

  // naya round (manager)
  createOpen = false;
  form: any = { name: '', runnerId: '', notes: '' };
  runners: any[] = [];
  candidates: any[] = [];
  picked = new Set<string>();
  loadingCandidates = false;

  constructor(
    public mr: MailroomService,
    private ui: MailroomUiService,
    private router: Router,
    private navCtrl: NavController,
  ) { }

  get canManage(): boolean { return this.mr.can('delivery.manage'); }

  async ionViewDidEnter() {
    if (!(await this.mr.ready())) {
      this.navCtrl.navigateRoot('/mailroom-mgt');
      return;
    }
    this.load();
  }

  async load(event?: any) {
    try {
      const status = this.tab === 'open' ? 'planned,in_progress' : 'completed,cancelled';
      const params: any = { status };
      if (!this.canManage) { params.mine = true; }
      this.list = (await this.mr.rounds(params)).data || [];
    } catch (err) {
      this.ui.error(err);
    }
    this.loading = false;
    event?.target.complete();
  }

  changeTab() {
    this.list = [];
    this.loading = true;
    this.load();
  }

  open(r: any) { this.router.navigateByUrl('/mailroom-mgt/round/' + r.id); }

  color(status: string): string {
    return status === 'in_progress' ? 'primary' : status === 'completed' ? 'success' : status === 'cancelled' ? 'danger' : 'warning';
  }

  label(status: string): string { return (status || '').replace('_', ' '); }

  // ----- create -----
  async openCreate() {
    this.form = { name: '', runnerId: '', notes: '' };
    this.picked.clear();
    this.candidates = [];
    this.createOpen = true;
    this.loadingCandidates = true;
    try {
      const [runners, pkgs] = await Promise.all([
        this.mr.runners().catch(() => ({ data: [] })),
        this.mr.packages({ live: 1, status: 'Received,In Storage,Awaiting Pickup', page: 1, limit: 200 }),
      ]);
      this.runners = runners.data || [];
      // jo pehle se kisi khule round par hain unhe chhod do
      this.candidates = (pkgs.data || []).filter((p: any) =>
        !p.deliveryRound || !['planned', 'in_progress'].includes(p.deliveryRound.status));
    } catch (err) {
      this.ui.error(err);
    }
    this.loadingCandidates = false;
  }

  toggle(p: any) {
    if (this.picked.has(p.id)) { this.picked.delete(p.id); } else { this.picked.add(p.id); }
  }

  async create() {
    if (!this.picked.size) { this.ui.warn('Choose the packages for this round'); return; }
    const body: any = { packageIds: Array.from(this.picked) };
    if (this.form.name.trim()) { body.name = this.form.name.trim(); }
    if (this.form.runnerId) { body.runnerId = this.form.runnerId; }
    if (this.form.notes.trim()) { body.notes = this.form.notes.trim(); }
    const res = await this.ui.busy(() => this.mr.createRound(body));
    if (!res) { return; }
    this.ui.ok(res.data?.skipped ? `${res.message} (${res.data.added} added, ${res.data.skipped} skipped)` : res.message);
    this.createOpen = false;
    this.tab = 'open';
    this.load();
  }
}
