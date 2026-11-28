import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SomartService } from 'src/app/provider/somart/somart.service';
import { SomartUiService } from 'src/app/provider/somart/somart-ui.service';

const PAGE = 30;

/** SoMart home: site picker, categories, search, product list, cart bar */
@Component({
  selector: 'app-somart',
  templateUrl: './somart.page.html',
  styleUrls: ['./somart.page.scss'],
})
export class SomartPage {

  loading = true;
  errorMsg = '';

  search = '';
  groupId = 0;
  inStockOnly = false;

  filtered: any[] = [];
  shown = PAGE;

  pendingApprovals = 0;
  approver = false;

  detail: any = null;   // product detail (modal)

  constructor(
    public sm: SomartService,
    private ui: SomartUiService,
    private router: Router,
  ) { }

  ionViewDidEnter() {
    this.load();
  }

  async load(force = false, event?: any) {
    this.errorMsg = '';
    try {
      await this.sm.load(force);
      this.applyFilter();
    } catch (err) {
      this.errorMsg = this.sm.msg(err);
    }
    this.loading = false;
    event?.target.complete();
    this.loadBadge();
  }

  /** Push nahi hai: screen khulne / refresh par approvals ka badge */
  private async loadBadge() {
    if (!this.sm.can('APPROVALS')) { return; }
    try {
      const d = (await this.sm.approvalCount()).data || {};
      this.approver = !!d.approver;
      this.pendingApprovals = d.pending || 0;
    } catch { /* badge chup-chaap */ }
  }

  get visible(): any[] { return this.filtered.slice(0, this.shown); }
  get siteCategories(): any[] { return this.sm.categories; }

  applyFilter() {
    const q = this.search.trim().toLowerCase();
    const pc = this.sm.pcId;
    this.filtered = this.sm.products.filter(p => {
      // jis site ke liye order hai, usi site se mapped items
      if (pc && (p.sites || []).length && !p.sites.some((s: any) => s.pc_id === pc)) { return false; }
      if (this.groupId && p.group_id !== this.groupId) { return false; }
      if (this.inStockOnly && this.sm.siteStock(p) <= 0) { return false; }
      if (q && ![p.name, p.sku, p.make, p.part_code, p.group].join(' ').toLowerCase().includes(q)) { return false; }
      return true;
    });
    this.shown = PAGE;
  }

  more(event: any) {
    this.shown += PAGE;
    event.target.complete();
  }

  setGroup(id: number) {
    this.groupId = this.groupId === id ? 0 : id;
    this.applyFilter();
  }

  async onSiteChange(ev: any) {
    const id = Number(ev?.detail?.value) || 0;
    if (!id || id === this.sm.pcId) { return; }
    if (this.sm.cartCount) {
      // cart ek site ke order ke liye hota hai
      const ok = await this.ui.confirm('Change site', 'Your cart will be used for the new site. Continue?', 'Change');
      if (!ok) {
        ev.target.value = this.sm.pcId;   // picker ko purani site par wapas
        return;
      }
    }
    this.sm.pcId = id;
    this.applyFilter();
  }

  // ----- stock / price labels -----
  stockClass(p: any): string {
    const qty = this.sm.siteStock(p);
    return qty <= 0 ? 'sm-stock--out' : qty <= (Number(p.min) || 0) ? 'sm-stock--low' : 'sm-stock--in';
  }

  stockText(p: any): string {
    const qty = this.sm.siteStock(p);
    if (qty <= 0) { return 'Out of stock'; }
    return (qty <= (Number(p.min) || 0) ? 'Low: ' : 'In stock: ') + qty + ' ' + (p.uom || '');
  }

  // ----- cart -----
  add(p: any, ev?: Event) {
    ev?.stopPropagation();
    this.sm.setQty(p, this.sm.qtyOf(p.mtrl_id) + 1);
  }

  minus(p: any, ev?: Event) {
    ev?.stopPropagation();
    this.sm.setQty(p, this.sm.qtyOf(p.mtrl_id) - 1);
  }

  typed(p: any, ev: any) {
    this.sm.setQty(p, ev?.target?.value);
  }

  open(url: string) {
    this.router.navigateByUrl(url);
  }
}
