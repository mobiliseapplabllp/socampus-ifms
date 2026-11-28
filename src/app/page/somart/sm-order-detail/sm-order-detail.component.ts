import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SomartService } from 'src/app/provider/somart/somart.service';
import { SomartUiService } from 'src/app/provider/somart/somart-ui.service';

/** Order detail: lines, challans (lot / expiry), timeline; cancel aur challan receive */
@Component({
  selector: 'app-sm-order-detail',
  templateUrl: './sm-order-detail.component.html',
})
export class SmOrderDetailComponent {

  orderNo = '';
  o: any = null;
  loading = true;
  errorMsg = '';

  constructor(
    public sm: SomartService,
    private ui: SomartUiService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.orderNo = this.route.snapshot.paramMap.get('orderNo') || '';
  }

  ionViewDidEnter() {
    this.load();   // receive se wapas aane par taza
  }

  async load(event?: any) {
    this.errorMsg = '';
    try {
      this.o = (await this.sm.order(this.orderNo)).data;
    } catch (err) {
      this.errorMsg = this.sm.msg(err);
    }
    this.loading = false;
    event?.target.complete();
  }

  /** Server dispatch ke baad cancel nahi rokta, isliye button sirf dispatch se pehle */
  get canCancel(): boolean { return !!this.o && this.sm.canCancel(this.o.dispatch_state); }

  inTransit(dc: any): boolean { return dc.dispatch_status === 'In transit'; }

  address(a: any): string {
    if (!a) { return ''; }
    return [a.line1, a.line2, a.line3, a.city, a.state, a.pincode].filter(Boolean).join(', ');
  }

  async cancel() {
    const remark = await this.ui.ask('Cancel order', 'Reason (optional)', `Cancel ${this.orderNo}?`, 'Cancel order');
    if (remark === null) { return; }
    const res = await this.ui.busy(() => this.sm.cancelOrder(this.orderNo, remark));
    if (res) { this.ui.ok(res.msg || 'Order cancelled'); this.load(); }
  }

  receive(dc: any) {
    this.router.navigateByUrl(`/somart/receive/${encodeURIComponent(this.orderNo)}/${encodeURIComponent(dc.dc_no)}`);
  }
}
