import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface SomartCartLine {
  mtrl_id: number;
  sku: string;
  name: string;
  uom: string;
  price: number;
  qty: number;
  remark: string;
}

const CART_KEY = 'somart_cart';
const SITE_KEY = 'somart_site';
const REF_KEY = 'somart_ref';

/**
 * SoMart (sites ka order store) ki APIs.
 * Ye SoCampus IFMS par hi hain (`{url}somart/*`) aur wahi login token (token1) lagta hai -
 * TokenInterceptor khud laga deta hai. Koi SSO / alag token nahi.
 * Response: { status, msg, data }. `msg` user ke padhne layak hota hai - wahi dikhana hai.
 */
@Injectable({ providedIn: 'root' })
export class SomartService {

  events: string[] = [];
  defined: string[] = [];
  products: any[] = [];
  categories: any[] = [];
  sites: any[] = [];
  loaded = false;

  cart: SomartCartLine[] = [];

  private base = environment.url + 'somart';
  private imageIds = new Set<number>();
  private images: { [id: number]: string } = {};
  private imageQueue: number[] = [];
  private imageBusy = 0;

  constructor(private http: HttpClient) {
    try { this.cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]') || []; } catch { this.cart = []; }
  }

  // ===================================================================
  // HTTP
  // ===================================================================

  private async get(path: string, params?: any): Promise<any> {
    return this.check(await firstValueFrom(this.http.get<any>(this.base + path + this.qs(params))));
  }

  private async post(path: string, body: any = {}): Promise<any> {
    return this.check(await firstValueFrom(this.http.post<any>(this.base + path, body)));
  }

  /** 200 ke saath status:false aaye to use bhi error maano */
  private check(res: any): any {
    if (res && res.status === false) { throw { error: res }; }
    return res;
  }

  private qs(params: any): string {
    if (!params) { return ''; }
    const q = Object.keys(params)
      .filter(k => params[k] !== null && params[k] !== undefined && params[k] !== '')
      .map(k => `${k}=${encodeURIComponent(params[k])}`)
      .join('&');
    return q ? `?${q}` : '';
  }

  msg(err: any): string {
    if (err?.status === 0) { return 'No connection. Please check your internet and try again.'; }
    return err?.error?.msg || err?.error?.message || (err instanceof Error ? err.message : '') || environment.errMsg;
  }

  // ===================================================================
  // Events (kaun si screens dikhani hain) + catalogue
  // ===================================================================

  /** Event allowed hai? Jo event `defined` me hi nahi, wo governed nahi -> dikhana hai. */
  can(event: string): boolean {
    return !this.defined.includes(event) || this.events.includes(event);
  }

  /** App khulne par ek baar; force = pull-to-refresh */
  async load(force = false): Promise<void> {
    if (this.loaded && !force) { return; }
    const [ev, cat, imgs] = await Promise.all([
      this.get('/events').catch(() => null),
      this.get('/admin/catalog'),
      this.get('/material-images').catch(() => null),
    ]);
    this.events = ev?.data?.events || [];
    this.defined = ev?.data?.defined || [];
    this.products = cat?.data?.products || [];
    this.categories = cat?.data?.categories || [];
    this.sites = cat?.data?.sites || [];
    this.imageIds = new Set<number>((imgs?.data || []).map((x: any) => Number(x)));
    if (!this.sites.some(s => s.pc_id === this.pcId)) {
      this.pcId = this.sites[0]?.pc_id || 0;
    }
    this.loaded = true;
  }

  // ----- selected site -----
  get pcId(): number { return Number(localStorage.getItem(SITE_KEY)) || 0; }
  set pcId(id: number) { localStorage.setItem(SITE_KEY, String(id || 0)); }
  get site(): any { return this.sites.find(s => s.pc_id === this.pcId) || null; }

  /** Chuni hui site par is product ka stock */
  siteStock(p: any): number {
    const row = (p.sites || []).find((s: any) => s.pc_id === this.pcId);
    return Number(row?.qty) || 0;
  }

  // ----- product pictures -----
  /**
   * Picture auth header ke saath bytes me aati hai, isliye <img src> me seedha url nahi chalta.
   * Yahan se data URL milta hai ('' = abhi nahi / picture nahi); load apne aap shuru ho jaata hai.
   */
  image(mtrlId: number): string {
    const have = this.images[mtrlId];
    if (have !== undefined) { return have; }
    if (!this.imageIds.has(mtrlId)) { return ''; }   // 404 calls se bachne ke liye
    this.images[mtrlId] = '';
    this.imageQueue.push(mtrlId);
    this.pumpImages();
    return '';
  }

  private pumpImages() {
    while (this.imageBusy < 4 && this.imageQueue.length) {
      const id = this.imageQueue.shift()!;
      this.imageBusy++;
      firstValueFrom(this.http.get(`${this.base}/material-image/${id}`, { responseType: 'blob' }))
        .then(blob => new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result || ''));
          r.onerror = () => reject(r.error);
          r.readAsDataURL(blob);
        }))
        .then(url => { this.images[id] = url.startsWith('data:image/') ? url : ''; })
        .catch(() => { /* picture nahi mili - icon dikhega */ })
        .finally(() => { this.imageBusy--; this.pumpImages(); });
    }
  }

  // ===================================================================
  // Cart
  // ===================================================================

  qtyOf(mtrlId: number): number { return this.cart.find(l => l.mtrl_id === mtrlId)?.qty || 0; }
  get cartCount(): number { return this.cart.length; }
  /** Order value = Σ qty × price (server jo bhejo wahi store karta hai) */
  get cartTotal(): number {
    return Math.round(this.cart.reduce((sum, l) => sum + l.qty * l.price, 0) * 100) / 100;
  }

  setQty(p: any, qty: number) {
    const id = p.mtrl_id;
    qty = Math.max(0, Math.round((Number(qty) || 0) * 1000) / 1000);
    const i = this.cart.findIndex(l => l.mtrl_id === id);
    if (qty <= 0) {
      if (i >= 0) { this.cart.splice(i, 1); }
    } else if (i >= 0) {
      this.cart[i].qty = qty;
    } else {
      this.cart.push({
        mtrl_id: id, sku: p.sku || '', name: p.name, uom: p.uom || '',
        price: Number(p.price) || 0, qty, remark: '',
      });
    }
    this.saveCart(true);
  }

  /** changed = cart ki cheezein badli -> purana retry-ref ab is order ka nahi raha */
  saveCart(changed = false) {
    localStorage.setItem(CART_KEY, JSON.stringify(this.cart));
    if (changed) { localStorage.removeItem(REF_KEY); }
  }

  clearCart() {
    this.cart = [];
    this.saveCart(true);
  }

  /**
   * Safe retry: ek order ke liye ek hi number (epoch ms). Call safal hone tak wahi rehta hai,
   * taaki timeout / double tap par server wahi order lautaye, doosra na banaye.
   */
  orderRef(): number {
    let ref = Number(localStorage.getItem(REF_KEY)) || 0;
    if (!ref) {
      ref = Date.now();
      localStorage.setItem(REF_KEY, String(ref));
    }
    return ref;
  }

  // ===================================================================
  // Orders
  // ===================================================================

  siteAddresses(pcIds: number[]) { return this.get('/site-addresses', { pc_ids: pcIds.join(',') }); }
  placeOrder(body: any) { return this.post('/orders', body); }
  orders(params: any) { return this.get('/so-master', { state: 'All', ...params }); }
  order(orderNo: string) { return this.get('/so-master/' + encodeURIComponent(orderNo)); }
  cancelOrder(orderNo: string, remark: string) {
    return this.post(`/orders/${encodeURIComponent(orderNo)}/cancel`, remark ? { remark } : {});
  }

  // ----- approvals -----
  approvalCount() { return this.get('/approvals/count'); }
  approvals(status: string) { return this.get('/approvals', { status }); }
  approve(orderNo: string, remark: string) {
    return this.post(`/orders/${encodeURIComponent(orderNo)}/approve`, remark ? { remark } : {});
  }
  reject(orderNo: string, remark: string) {
    return this.post(`/orders/${encodeURIComponent(orderNo)}/reject`, { remark });
  }

  // ----- challans -----
  dispatches(orderNos: string[]) { return this.get('/dispatches', { order_nos: orderNos.join(',') }); }
  receive(dcNo: string, body: any) { return this.post(`/dispatches/${encodeURIComponent(dcNo)}/receive`, body); }

  // ===================================================================
  // Helpers
  // ===================================================================

  /** Login wale user ki details (placed_by_*). Id server token se leta hai. */
  user(): { name: string; email: string; phone: string } {
    let u: any = {};
    try { u = JSON.parse(localStorage.getItem('user') || '{}') || {}; } catch { u = {}; }
    const first = (...keys: string[]) => {
      for (const k of keys) { if (u[k]) { return String(u[k]); } }
      return '';
    };
    return {
      name: first('user_name', 'name', 'full_name') || [u.first_name, u.last_name].filter(Boolean).join(' '),
      email: first('email', 'user_email', 'email_id'),
      phone: first('phone', 'mobile', 'mobile_no', 'contact_no', 'phone_no'),
    };
  }

  /** "2026-11-28 15:04:48" (IST) -> date pipe ke layak (iOS space wala format nahi samajhta) */
  dt(value: any): string { return value ? String(value).replace(' ', 'T') : ''; }

  todayStr(): string {
    const d = new Date();
    const p = (n: number) => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  num(v: any): number { return Number(v) || 0; }

  /** dispatch_state -> user ko dikhne wala label */
  stateLabel(state: string): string {
    switch (state) {
      case 'Pending approval': return 'Awaiting approval';
      case 'Pending dispatch': return 'Approved – to dispatch';
      case 'Dispatched': return 'In transit';
      case 'Received': return 'Received / Closed';
      default: return state || '';
    }
  }

  stateColor(state: string): string {
    switch (state) {
      case 'Pending approval': return 'warning';
      case 'Pending dispatch': return 'primary';
      case 'Partially dispatched':
      case 'Dispatched':
      case 'In transit': return 'tertiary';
      case 'Received':
      case 'Approved': return 'success';
      case 'Rejected': return 'danger';
      case 'Cancelled': return 'medium';
      case 'Pending': return 'warning';
      default: return 'medium';
    }
  }

  /** Server dispatch ke baad cancel nahi rokta - app ko hi Cancel chhupana hai */
  canCancel(state: string): boolean { return state === 'Pending approval' || state === 'Pending dispatch'; }
}
