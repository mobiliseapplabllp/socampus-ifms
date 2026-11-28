import { Component } from '@angular/core';
import { SomartService } from 'src/app/provider/somart/somart.service';
import { SomartUiService } from 'src/app/provider/somart/somart-ui.service';

/** Approver: apni sites ke orders approve / reject (apna khud ka order list me nahi aata) */
@Component({
  selector: 'app-sm-approvals',
  templateUrl: './sm-approvals.component.html',
})
export class SmApprovalsComponent {

  status: 'Pending' | 'Actioned' = 'Pending';
  list: any[] = [];
  approver = true;
  loading = true;
  openId: any = null;   // jis order ki lines khuli hain

  private seq = 0;

  constructor(
    public sm: SomartService,
    private ui: SomartUiService,
  ) { }

  ionViewDidEnter() {
    this.load();
  }

  async load(event?: any) {
    const mine = ++this.seq;
    try {
      const res = await this.sm.approvals(this.status);
      if (mine !== this.seq) { return; }
      this.list = res.data || [];
      this.approver = res.approver !== false;
    } catch (err) {
      if (mine === this.seq) { this.ui.error(err); }
    }
    this.loading = false;
    event?.target.complete();
  }

  changeTab() {
    this.list = [];
    this.loading = true;
    this.load();
  }

  toggle(o: any) { this.openId = this.openId === o.order_id ? null : o.order_id; }

  async approve(o: any) {
    const remark = await this.ui.ask('Approve order', 'Remark (optional)', `Approve ${o.order_no}?`, 'Approve');
    if (remark === null) { return; }
    this.decide(() => this.sm.approve(o.order_no, remark));
  }

  async reject(o: any) {
    const remark = await this.ui.ask('Reject order', 'Reason', `Why are you rejecting ${o.order_no}?`, 'Reject');
    if (remark === null) { return; }
    if (!remark) { this.ui.warn('Please give a reason for rejecting.'); return; }
    this.decide(() => this.sm.reject(o.order_no, remark));
  }

  private async decide(work: () => Promise<any>) {
    const res = await this.ui.busy(work);
    if (res) { this.ui.ok(res.msg); }
    // fail par bhi taza: 409 = kisi aur ne pehle decide kar diya
    this.load();
  }
}
