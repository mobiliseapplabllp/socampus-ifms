import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { SomartService } from 'src/app/provider/somart/somart.service';
import { SomartUiService } from 'src/app/provider/somart/somart-ui.service';

/** Cart + checkout: site ka address, required-by, PO, remarks -> order place */
@Component({
  selector: 'app-sm-cart',
  templateUrl: './sm-cart.component.html',
})
export class SmCartComponent {

  address: any = null;
  addressLoading = false;
  f: any = { order_type: 'Regular', required_by: '', po_no: '', remarks: '' };
  orderTypes = ['Regular', 'Urgent', 'Event'];
  today = '';

  placed: any = null;   // success: { order_no, approval_status }

  constructor(
    public sm: SomartService,
    private ui: SomartUiService,
    private navCtrl: NavController,
  ) {
    this.today = this.sm.todayStr();
  }

  async ionViewDidEnter() {
    if (this.placed) { return; }
    try {
      await this.sm.load();
    } catch (err) {
      this.ui.error(err);
    }
    this.loadAddress();
  }

  async loadAddress() {
    this.address = null;
    if (!this.sm.pcId) { return; }
    this.addressLoading = true;
    try {
      const rows = (await this.sm.siteAddresses([this.sm.pcId])).data || [];
      this.address = rows.find((a: any) => a.pc_id === this.sm.pcId) || rows[0] || null;
    } catch (err) {
      this.ui.error(err);
    }
    this.addressLoading = false;
  }

  get addressText(): string {
    const a = this.address;
    if (!a) { return ''; }
    return [a.line1, a.line2, a.line3, a.city, a.state, a.pincode].filter(Boolean).join(', ');
  }

  setQty(line: any, qty: any) { this.sm.setQty(line, qty); }
  plus(line: any) { this.sm.setQty(line, line.qty + 1); }
  minus(line: any) { this.sm.setQty(line, line.qty - 1); }
  remarkChanged() { this.sm.saveCart(); }

  async empty() {
    if (await this.ui.confirm('Empty cart', 'Remove all items from the cart?', 'Remove')) { this.sm.clearCart(); }
  }

  private party(): any {
    const a = this.address || {};
    return {
      pc_id: this.sm.pcId, name: a.customer || '', site: a.site_name || this.sm.site?.name || '',
      site_code: a.site_code || this.sm.site?.code || '',
      contact_name: a.contact_name || '', phone: a.phone || '',
      line1: a.line1 || '', line2: a.line2 || '', line3: a.line3 || '',
      city: a.city || '', state: a.state || '', state_id: a.state_id ?? null,
      country: a.country || '', pincode: a.pincode || '',
    };
  }

  async place() {
    if (!this.sm.cart.length) { this.ui.warn('Your cart is empty'); return; }
    if (!this.sm.pcId) { this.ui.warn('Select the site for this order'); return; }
    if (this.f.required_by && this.f.required_by < this.today) { this.ui.warn('Required-by date can\'t be in the past'); return; }

    const a = this.address || {};
    const user = this.sm.user();
    const total = this.sm.cartTotal;
    const party = this.party();
    const body: any = {
      somart_ref: this.sm.orderRef(),   // retry par wahi number -> duplicate order nahi banta
      pc_id: this.sm.pcId,
      site_name: party.site,
      site_code: party.site_code,
      client_name: a.customer || '',
      placed_by_name: user.name,
      placed_by_email: user.email,
      placed_by_phone: user.phone,
      order_type: this.f.order_type || 'Regular',
      delivery_address: this.addressText,
      bill_to: party,
      ship_to: party,
      sub_total: total,
      total_amt: total,
      items: this.sm.cart.map((l, i) => {
        const item: any = {
          line_no: (i + 1) * 10, mtrl_id: l.mtrl_id, item_code: l.sku, item_name: l.name,
          uom: l.uom, qty: l.qty, rate: l.price, disc_pct: 0, price: l.price,
        };
        if ((l.remark || '').trim()) { item.remark = l.remark.trim().slice(0, 255); }
        return item;
      }),
    };
    if (this.f.required_by) { body.required_by = this.f.required_by; }
    if (this.f.po_no.trim()) { body.po_no = this.f.po_no.trim(); }
    if (this.f.remarks.trim()) { body.remarks = this.f.remarks.trim(); }
    const cc = [a.cost_centre_code, a.cost_centre].filter(Boolean).join(' ');
    if (cc) { body.cost_centre = cc; }

    const res = await this.ui.busy(() => this.sm.placeOrder(body), 'Placing order...');
    if (!res) { return; }   // fail: cart aur somart_ref waise hi, dobara try par wahi order
    this.placed = res.data || {};
    this.sm.clearCart();
    this.ui.ok(res.msg || 'Order saved');
  }

  viewOrder() {
    this.navCtrl.navigateForward('/somart/order/' + encodeURIComponent(this.placed.order_no), { replaceUrl: true });
  }

  back() {
    this.navCtrl.back();
  }
}
