import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { MailroomService } from 'src/app/provider/mailroom/mailroom.service';
import { MailroomUiService } from 'src/app/provider/mailroom/mailroom-ui.service';

const FAIL_REASONS = ['Recipient not at desk', 'Recipient on leave', 'Wrong desk / not found', 'Recipient refused', 'Other'];

/** Ek round: packages walking order me (building -> floor), start / deliver / failed / complete */
@Component({
  selector: 'app-mr-round-detail',
  templateUrl: './mr-round-detail.component.html',
})
export class MrRoundDetailComponent {

  id = '';
  round: any = null;
  groups: { title: string; packages: any[] }[] = [];
  loading = true;
  errorMsg = '';

  constructor(
    public mr: MailroomService,
    private ui: MailroomUiService,
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
  ) {
    this.id = this.route.snapshot.paramMap.get('id') || '';
  }

  async ionViewDidEnter() {
    if (!(await this.mr.ready())) {
      this.navCtrl.navigateRoot('/mailroom-mgt');
      return;
    }
    this.load();   // desk hand-over se wapas aane par taza (aakhri package par round khud complete hota hai)
  }

  async load(event?: any) {
    this.errorMsg = '';
    try {
      this.set((await this.mr.round(this.id)).data);
    } catch (err) {
      this.errorMsg = this.mr.msg(err);
    }
    this.loading = false;
    event?.target.complete();
  }

  private set(round: any) {
    this.round = round;
    // server walking order me deta hai; order chhede bina building/floor ke group
    const groups: { title: string; packages: any[] }[] = [];
    for (const p of round?.packages || []) {
      const title = [p.recipientBuilding, p.recipientFloor].filter(Boolean).join(' · ') || 'No desk location';
      const last = groups[groups.length - 1];
      if (last && last.title === title) { last.packages.push(p); } else { groups.push({ title, packages: [p] }); }
    }
    this.groups = groups;
  }

  get canAct(): boolean { return this.mr.can('delivery.run', 'delivery.manage'); }
  get planned(): boolean { return this.round?.status === 'planned'; }
  get running(): boolean { return this.round?.status === 'in_progress'; }
  get deliveredCount(): number {
    return (this.round?.packages || []).filter((p: any) => p.status === 'Delivered').length;
  }

  label(status: string): string { return (status || '').replace('_', ' '); }

  pending(p: any): boolean { return this.running && p.status === 'Out for Delivery'; }

  async start() {
    const res = await this.ui.busy(() => this.mr.startRound(this.id));
    if (res) { this.ui.ok(res.message); this.set(res.data); }
  }

  deliver(p: any) {
    this.router.navigateByUrl('/mailroom-mgt/deliver/' + p.id);
  }

  async failed(p: any) {
    let reason = await this.ui.choose('Could not deliver', FAIL_REASONS.map(r => ({ label: r, value: r })), FAIL_REASONS[0]);
    if (!reason) { return; }
    if (reason === 'Other') {
      reason = await this.ui.ask('Could not deliver', 'Reason');
      if (!reason) { return; }
    }
    const res = await this.ui.busy(() => this.mr.failedAttempt(this.id, p.id, reason));
    if (res) { this.ui.ok(res.message); this.load(); }
  }

  async complete() {
    const left = (this.round?.packages || []).filter((p: any) => p.status === 'Out for Delivery').length;
    const msg = this.planned ? 'This round has not started. Close it?'
      : left ? `${left} package(s) are not delivered. They will go back to the mailroom.` : 'Complete this round?';
    if (!(await this.ui.confirm('Complete round', msg, 'Complete'))) { return; }
    const res = await this.ui.busy(() => this.mr.completeRound(this.id));
    if (res) { this.ui.ok(res.message); this.load(); }
  }
}
