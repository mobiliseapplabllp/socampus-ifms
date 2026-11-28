import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { SomartService } from 'src/app/provider/somart/somart.service';
import { SomartUiService } from 'src/app/provider/somart/somart-ui.service';

/**
 * Challan receive karna (stock IN).
 * Har line: received qty (dispatched se zyada nahi; kam = short), Lot / Batch no. (qty > 0 par zaroori),
 * expiry (optional, past nahi). Ek "Receive into warehouse". Challan sirf ek baar receive hota hai.
 */
@Component({
  selector: 'app-sm-receive',
  templateUrl: './sm-receive.component.html',
})
export class SmReceiveComponent {

  orderNo = '';
  dcNo = '';
  dc: any = null;
  lines: any[] = [];
  whId: any = '';
  remark = '';
  today = '';
  loading = true;
  errorMsg = '';
  submitted = false;

  constructor(
    public sm: SomartService,
    private ui: SomartUiService,
    private route: ActivatedRoute,
    private navCtrl: NavController,
  ) {
    this.orderNo = this.route.snapshot.paramMap.get('orderNo') || '';
    this.dcNo = this.route.snapshot.paramMap.get('dcNo') || '';
    this.today = this.sm.todayStr();
  }

  async ionViewDidEnter() {
    if (this.dc) { return; }
    try {
      const [disp, order] = await Promise.all([
        this.sm.dispatches([this.orderNo]),
        this.sm.order(this.orderNo).catch(() => null),   // sirf item ke naam / unit ke liye
      ]);
      const dc = (disp.data || []).find((d: any) => d.dc_no === this.dcNo);
      if (!dc) {
        this.errorMsg = `${this.dcNo} not found, or not for your sites.`;
      } else if (dc.dispatch_status !== 'In transit') {
        this.errorMsg = `${this.dcNo} was already marked received${dc.received_by_name ? ' by ' + dc.received_by_name : ''}.`;
      } else {
        const names: { [line: string]: any } = {};
        for (const it of order?.data?.items || []) { names[it.line_no] = it; }
        this.lines = (dc.items || []).map((it: any) => ({
          line_no: it.line_no,
          name: names[it.line_no]?.item_name || it.item_name || `Line ${it.line_no}`,
          uom: names[it.line_no]?.uom || it.uom || '',
          qty: this.sm.num(it.qty),
          received: this.sm.num(it.qty),   // default: poora mila
          lot: '',
          expiry: '',
        }));
        const whs = dc.site_warehouses || [];
        this.whId = whs.length === 1 ? whs[0].wh_id : '';
        this.dc = dc;
      }
    } catch (err) {
      this.errorMsg = this.sm.msg(err);
    }
    this.loading = false;
  }

  short(l: any): number {
    const r = Number(l.received);
    return isNaN(r) ? 0 : Math.max(0, Math.round((l.qty - r) * 1000) / 1000);
  }

  private validate(): string {
    let any = false;
    for (const l of this.lines) {
      const r = Number(l.received);
      if (l.received === '' || l.received === null || isNaN(r) || r < 0) { return `${l.name}: enter the received qty (0 if nothing came).`; }
      if (r > l.qty) { return `${l.name}: received qty can't be more than the ${l.qty} dispatched.`; }
      if (r > 0) {
        any = true;
        if (!(l.lot || '').trim()) { return `Enter the Lot / Batch no. for ${l.name}.`; }
        if (l.expiry && l.expiry < this.today) { return 'Expiry date can\'t be in the past.'; }
      }
    }
    if (any && !this.whId) { return 'Choose the warehouse of your site to receive the items into.'; }
    return '';
  }

  async submit() {
    this.submitted = true;
    const problem = this.validate();
    if (problem) { this.ui.warn(problem); return; }

    const shortLines = this.lines.filter(l => this.short(l) > 0).length;
    const msg = shortLines
      ? `${shortLines} item(s) are short. Short quantity is not sent again automatically. Mark ${this.dcNo} received?`
      : `Mark ${this.dcNo} received in full? This can be done only once.`;
    if (!(await this.ui.confirm('Mark received', msg, 'Mark received'))) { return; }

    const body: any = {
      items: this.lines.map(l => {
        const r = Number(l.received);
        const item: any = { line_no: l.line_no, received_qty: r };
        if (r > 0) {
          item.lot_no = l.lot.trim().slice(0, 30);
          if (l.expiry) { item.expiry_date = l.expiry; }
        }
        return item;
      }),
    };
    if (this.whId) { body.wh_id = this.whId; }
    if (this.remark.trim()) { body.remark = this.remark.trim().slice(0, 1000); }

    const res = await this.ui.busy(() => this.sm.receive(this.dcNo, body), 'Saving...');
    if (!res) { return; }
    this.ui.ok(res.msg || `${this.dcNo} marked received`);
    this.navCtrl.back();
  }
}
