import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SomartService } from 'src/app/provider/somart/somart.service';
import { SomartUiService } from 'src/app/provider/somart/somart-ui.service';

const ORDERS = 10;

/**
 * Updates: alag API nahi hai - user ke haal ke orders ki `history` se banta hai.
 * Sabse naye 10 orders ki detail la kar unki history ek list me, naya pehle.
 */
@Component({
  selector: 'app-sm-updates',
  templateUrl: './sm-updates.component.html',
})
export class SmUpdatesComponent {

  items: any[] = [];
  loading = true;

  constructor(
    public sm: SomartService,
    private ui: SomartUiService,
    private router: Router,
  ) { }

  ionViewDidEnter() {
    this.load();
  }

  async load(event?: any) {
    try {
      const orders = ((await this.sm.orders({ mine: 1 })).data || []).slice(0, ORDERS);
      const details = await Promise.all(orders.map((o: any) => this.sm.order(o.order_no).catch(() => null)));
      const items: any[] = [];
      for (const d of details) {
        for (const h of d?.data?.history || []) { items.push({ ...h, order_no: d.data.order_no }); }
      }
      items.sort((a, b) => String(b.action_at).localeCompare(String(a.action_at)));
      this.items = items;
    } catch (err) {
      this.ui.error(err);
    }
    this.loading = false;
    event?.target.complete();
  }

  icon(action: string): string {
    switch (action) {
      case 'Submitted': return 'paper-plane-outline';
      case 'Approved': return 'checkmark-circle-outline';
      case 'Rejected': return 'close-circle-outline';
      case 'Cancelled': return 'ban-outline';
      case 'Dispatched': return 'car-outline';
      case 'Received': return 'download-outline';
      default: return 'ellipse-outline';
    }
  }

  open(h: any) {
    this.router.navigateByUrl('/somart/order/' + encodeURIComponent(h.order_no));
  }
}
