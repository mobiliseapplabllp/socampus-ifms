import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SomartService } from 'src/app/provider/somart/somart.service';
import { SomartUiService } from 'src/app/provider/somart/somart-ui.service';

const STATES = ['Pending approval', 'Pending dispatch', 'Partially dispatched', 'Dispatched', 'Received', 'Rejected', 'Cancelled'];

/** My orders (mine=1) ya site ke saare orders; status ke chips counts ke saath */
@Component({
  selector: 'app-sm-orders',
  templateUrl: './sm-orders.component.html',
})
export class SmOrdersComponent {

  scope: 'mine' | 'site' = 'mine';
  state = 'All';
  states = STATES;
  search = '';
  list: any[] = [];
  counts: any = {};
  loading = true;

  private seq = 0;

  constructor(
    public sm: SomartService,
    private ui: SomartUiService,
    private router: Router,
  ) { }

  ionViewDidEnter() {
    this.load();   // detail se wapas aane par bhi taza
  }

  async load(event?: any) {
    const mine = ++this.seq;
    try {
      const params: any = { state: this.state, search: this.search.trim() };
      if (this.scope === 'mine') { params.mine = 1; }
      const res = await this.sm.orders(params);
      if (mine !== this.seq) { return; }
      this.list = res.data || [];
      // counts sirf "All" par poore aate hain - chips ke numbers wahi rakho
      if (this.state === 'All' || !Object.keys(this.counts).length) { this.counts = res.counts || {}; }
    } catch (err) {
      if (mine === this.seq) { this.ui.error(err); }
    }
    this.loading = false;
    event?.target.complete();
  }

  reload() {
    this.list = [];
    this.loading = true;
    this.load();
  }

  setScope() {
    this.state = 'All';
    this.counts = {};
    this.reload();
  }

  setState(s: string) {
    this.state = this.state === s ? 'All' : s;
    this.reload();
  }

  open(o: any) {
    this.router.navigateByUrl('/somart/order/' + encodeURIComponent(o.order_no));
  }
}
