import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MailroomSession } from './mailroom-session';

export type MailroomPanel = 'manage' | 'packages';

export interface MailroomSsoResult {
  mode: 'staff' | 'portal';
  /** SSO url me panel tha ya nahi - nahi tha aur dono panel hain to "choose panel" dikhana hai */
  panelGiven: boolean;
  /** Mailroom ke naam: 'panel' (Mail Room Panel) / 'packages' (My Package) */
  panels: string[];
}

/** Jo statuses mailroom se nikal chuke hain - inke baad koi action nahi */
export const MR_RELEASED = ['Delivered', 'Returned', 'Lost'];

/**
 * Mail Room Management APIs (alag backend: {MAILROOM_API}/api/v1).
 *
 * Auth: SoCampus `sso/mailroom` se one-time token (120 sec, ek baar) -> Mailroom `/auth/sso`
 * se staff ya portal token. Token TokenInterceptor lagata hai (MailroomSession.headersFor).
 * Refresh token nahi hota: 401 par SSO ek baar chup-chaap dobara chalta hai aur request retry hoti hai.
 *
 * Har method poora envelope lautata hai: { success, message, data, meta?, stats? }.
 */
@Injectable({ providedIn: 'root' })
export class MailroomService {

  me: any = null;
  settings: any = null;
  carriers: any[] = [];
  packageTypes: any[] = [];
  storageUnits: any[] = [];
  panels: string[] = [];

  private staffReady = false;
  private reauthing: { [panel: string]: Promise<any> | undefined } = {};

  constructor(private http: HttpClient) {}

  private get base(): string { return MailroomSession.base(); }

  // ===================================================================
  // Session (SSO)
  // ===================================================================

  /**
   * Step 1: SoCampus `sso/mailroom` (token1 interceptor khud lagata hai) -> { status, url, panels }
   * Step 2: url ki query se tenant / token / panel nikaal kar turant Mailroom `/auth/sso`
   * (url ko browser me nahi kholna; token cache nahi karna)
   */
  async sso(panel?: MailroomPanel): Promise<MailroomSsoResult> {
    let handoff: any;
    try {
      handoff = await firstValueFrom(
        this.http.get<any>(`${environment.url}sso/mailroom${panel ? '?panel=' + panel : ''}`));
    } catch (err) {
      throw new Error(this.msg(err));
    }
    if (!handoff?.status || !handoff?.url) {
      throw new Error(handoff?.message || handoff?.msg || 'Mail Room sign-in failed. Please try again.');
    }

    const q = this.ssoQuery(handoff.url);
    const body: any = { tenant: q.get('tenant'), token: q.get('token') };
    const urlPanel = q.get('panel');
    if (urlPanel) { body.panel = urlPanel; }
    MailroomSession.setBaseFromSsoUrl(handoff.url);

    let res: any;
    try {
      res = await firstValueFrom(this.http.post<any>(`${this.base}/auth/sso`, body));
    } catch (err) {
      throw new Error(this.msg(err));
    }
    const d = res?.data;
    if (!res?.success || !d?.token) {
      throw new Error(res?.message || 'Mail Room sign-in failed. Please try again.');
    }
    if (d.mode === 'portal') {
      MailroomSession.setPortalToken(d.token);
    } else {
      MailroomSession.setStaffToken(d.token);
      this.staffReady = false;
    }
    this.panels = d.panels || [];
    return { mode: d.mode === 'portal' ? 'portal' : 'staff', panelGiven: !!urlPanel, panels: this.panels };
  }

  private ssoQuery(ssoUrl: string): URLSearchParams {
    const u = new URL(ssoUrl);
    if (u.searchParams.get('token')) { return u.searchParams; }
    // hash-routing wale url (".../#/sso?tenant=..") ke liye
    const i = u.hash.indexOf('?');
    return new URLSearchParams(i >= 0 ? u.hash.substring(i + 1) : '');
  }

  /** Staff session se My Package kholna: portal token lena */
  async openPortalFromStaff(): Promise<void> {
    const res = await this.call('POST', '/auth/portal-session');
    MailroomSession.setPortalToken(res.data.token);
  }

  async logoutStaff(): Promise<void> {
    try { await this.call('POST', '/auth/logout', {}, true); } catch { /* token waise bhi hata rahe hain */ }
    MailroomSession.clearStaff();
    this.resetStaff();
  }

  async logoutPortal(): Promise<void> {
    try { await this.call('POST', '/portal/sso-exit', {}, true); } catch { /* ignore */ }
    MailroomSession.clearPortal();
  }

  private resetStaff() {
    this.staffReady = false;
    this.me = null;
    this.settings = null;
    this.carriers = [];
    this.packageTypes = [];
    this.storageUnits = [];
  }

  // ===================================================================
  // Staff bootstrap: profile, site, settings, master data
  // ===================================================================

  get properties(): any[] { return this.me?.access?.properties || []; }
  get propertyId(): string { return MailroomSession.propertyId(); }
  get propertyName(): string {
    return this.properties.find(p => p.id === this.propertyId)?.name || '';
  }
  get hasMyPackage(): boolean { return (this.me?.panels || this.panels || []).includes('packages'); }

  /** Koi ek bhi permission ho to true. Server ka 403 phir bhi final check hai. */
  can(...perms: string[]): boolean {
    const a = this.me?.access;
    if (!a) { return false; }
    if (a.superAdmin) { return true; }
    return perms.some(p => (a.permissions || []).includes(p));
  }

  setting(section: string, key: string, fallback: any = false): any {
    const v = this.settings?.[section]?.[key];
    return v === undefined || v === null ? fallback : v;
  }

  /**
   * Profile + site + masters load karta hai.
   * needsSite = true -> user ke paas kai sites hain aur koi chuni nahi: site picker dikhao.
   */
  async loadStaff(): Promise<{ needsSite: boolean }> {
    this.me = (await this.call('GET', '/auth/me')).data;
    const props = this.properties;
    let pid = MailroomSession.propertyId();
    if (pid && !props.some(p => p.id === pid)) {
      pid = '';
      MailroomSession.setPropertyId('');
    }
    if (!pid) {
      pid = props.length === 1 ? props[0].id : (this.me?.access?.activePropertyId || '');
      if (pid) {
        MailroomSession.setPropertyId(pid);
        this.me = (await this.call('GET', '/auth/me')).data;   // permissions site ke hisaab se
      }
    }
    if (!pid && props.length > 1) { return { needsSite: true }; }
    await this.loadMasters();
    this.staffReady = true;
    return { needsSite: false };
  }

  /** Site badalna: permissions aur master data dono badal jaate hain */
  async selectProperty(id: string): Promise<void> {
    MailroomSession.setPropertyId(id);
    this.staffReady = false;
    await this.loadStaff();
  }

  /** Sub-pages ke liye: session tayyar hai? false -> entry page par bhejo */
  async ready(): Promise<boolean> {
    // SoCampus logout localStorage saaf kar deta hai - tab purana (dusre user ka) data nahi chalna chahiye
    if (!MailroomSession.staffToken()) { this.resetStaff(); return false; }
    if (this.staffReady) { return true; }
    try {
      return !(await this.loadStaff()).needsSite;
    } catch {
      return false;
    }
  }

  async loadMasters(): Promise<void> {
    const safe = (p: Promise<any>, fallback: any) => p.then(r => r?.data ?? fallback).catch(() => fallback);
    const [settings, carriers, types] = await Promise.all([
      safe(this.call('GET', '/settings'), null),
      safe(this.call('GET', '/carriers/dropdown'), []),
      safe(this.call('GET', '/package-types'), []),
    ]);
    this.settings = settings;
    this.carriers = carriers;
    this.packageTypes = types;
    await this.loadStorageUnits();
  }

  /** Storage picker ke liye; runner ke paas storage.view nahi hota - tab khaali list */
  async loadStorageUnits(): Promise<any[]> {
    if (!this.can('storage.view', 'storage.manage')) {
      this.storageUnits = [];
      return [];
    }
    try {
      this.storageUnits = (await this.call('GET', '/storage-locations/dropdown')).data || [];
    } catch {
      this.storageUnits = [];
    }
    return this.storageUnits;
  }

  // ===================================================================
  // Staff APIs
  // ===================================================================

  dashboard() { return this.call('GET', '/dashboard/stats'); }

  // ----- packages -----
  packages(params: any) { return this.call('GET', '/packages', { params: { limit: 20, ...params } }); }
  packageStats(params: any) {
    const { live, ...rest } = params || {};
    return this.call('GET', live ? '/packages/live-stats' : '/packages/stats',
      { params: { ...rest, todayFrom: this.todayFromIso() } });
  }
  lookup(code: string) { return this.call('GET', '/packages/lookup', { params: { code } }); }
  checkTracking(trackingNumber: string) {
    return this.call('GET', '/packages/check-tracking', { params: { trackingNumber } });
  }
  packageDetail(id: string) { return this.call('GET', `/packages/${id}`); }
  packageTimeline(id: string) { return this.call('GET', `/packages/${id}/timeline`); }
  receivePackage(body: any) { return this.call('POST', '/packages', { body }); }
  updatePackage(id: string, body: any) { return this.call('PATCH', `/packages/${id}`, { body }); }
  deliverPackage(id: string, body: any) { return this.call('POST', `/packages/${id}/deliver`, { body }); }
  resendCode(id: string) { return this.call('POST', `/packages/${id}/resend-code`); }
  bulk(body: any) { return this.call('POST', '/packages/bulk', { body }); }

  // ----- desk delivery rounds -----
  rounds(params: any = {}) { return this.call('GET', '/delivery-rounds', { params }); }
  round(id: string) { return this.call('GET', `/delivery-rounds/${id}`); }
  createRound(body: any) { return this.call('POST', '/delivery-rounds', { body }); }
  updateRound(id: string, body: any) { return this.call('PATCH', `/delivery-rounds/${id}`, { body }); }
  runners() { return this.call('GET', '/delivery-rounds/runners'); }
  startRound(id: string) { return this.call('POST', `/delivery-rounds/${id}/start`); }
  completeRound(id: string) { return this.call('POST', `/delivery-rounds/${id}/complete`); }
  failedAttempt(roundId: string, packageId: string, reason: string) {
    return this.call('POST', `/delivery-rounds/${roundId}/packages/${packageId}/failed`, { body: { reason } });
  }

  // ----- expected deliveries (today hamesha bhejna hai) -----
  expected(params: any = {}) {
    return this.call('GET', '/expected-deliveries', { params: { limit: 20, today: this.todayStr(), ...params } });
  }
  expectedStats() { return this.call('GET', '/expected-deliveries/stats', { params: { today: this.todayStr() } }); }
  createExpected(body: any) { return this.call('POST', '/expected-deliveries', { body }); }
  updateExpected(id: string, body: any) { return this.call('PATCH', `/expected-deliveries/${id}`, { body }); }

  // ----- recipients (hamesha paged form) -----
  recipients(params: any = {}) {
    return this.call('GET', '/recipients', { params: { page: 1, limit: 20, active: true, ...params } });
  }

  // ----- notifications -----
  notifications(params: any = {}) { return this.call('GET', '/notifications', { params }); }
  readNotification(id: string) { return this.call('PATCH', `/notifications/${id}/read`); }
  readAllNotifications() { return this.call('POST', '/notifications/read-all'); }
  deleteReadNotifications() { return this.call('DELETE', '/notifications'); }

  // ===================================================================
  // My Package (portal token)
  // ===================================================================

  portalMe() { return this.call('GET', '/portal/me'); }
  portalSavePrefs(body: any) { return this.call('PATCH', '/portal/me', { body }); }
  portalCarriers() { return this.call('GET', '/portal/carriers'); }
  portalExpected(body: any) { return this.call('POST', '/portal/expected', { body }); }
  portalHomeSite(propertyId: string) { return this.call('POST', '/portal/home-site', { body: { propertyId } }); }

  // ===================================================================
  // HTTP core
  // ===================================================================

  private async call(method: string, path: string, opts: { params?: any; body?: any } = {}, noRetry = false): Promise<any> {
    const url = this.base + path + this.qs(opts.params);
    const body = method === 'GET' || method === 'DELETE' ? undefined : (opts.body ?? {});
    try {
      return await firstValueFrom(this.http.request<any>(method, url, { body }));
    } catch (err: any) {
      if (err?.status !== 401 || noRetry) { throw err; }
      // token expire / revoke: SSO ek baar chup-chaap, phir wahi request ek baar
      await this.reauth(path.startsWith('/portal/') ? 'packages' : 'manage');
      return this.call(method, path, opts, true);
    }
  }

  /** Ek saath kai 401 aayein to bhi SSO ek hi baar chale */
  private reauth(panel: MailroomPanel): Promise<any> {
    if (!this.reauthing[panel]) {
      this.reauthing[panel] = this.sso(panel).finally(() => { this.reauthing[panel] = undefined; });
    }
    return this.reauthing[panel]!;
  }

  private qs(params: any): string {
    if (!params) { return ''; }
    const q = Object.keys(params)
      .filter(k => params[k] !== null && params[k] !== undefined && params[k] !== '')
      .map(k => `${k}=${encodeURIComponent(params[k])}`)
      .join('&');
    return q ? `?${q}` : '';
  }

  // ===================================================================
  // Helpers
  // ===================================================================

  /** Server ka `message` end user ke liye likha hota hai - hamesha wahi dikhana hai */
  msg(err: any): string {
    if (err?.status === 0) { return 'No connection. Please check your internet and try again.'; }
    if (err?.status === 413) { return 'Request is too large. Try fewer or smaller photos.'; }
    return err?.error?.message || err?.error?.msg || (err instanceof Error ? err.message : '') || environment.errMsg;
  }

  /** Device ki aaj ki date: YYYY-MM-DD */
  todayStr(d: Date = new Date()): string {
    const p = (n: number) => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /** Calendar date (expected deliveries): ISO me se sirf YYYY-MM-DD, taaki timezone se din na badle */
  dateOnly(value: any): string { return (value || '').slice(0, 10); }

  /** Device ke din ki shuruaat, ISO (package stats ka todayFrom) */
  todayFromIso(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  isReleased(status: string): boolean { return MR_RELEASED.includes(status); }

  statusColor(status: string): string {
    switch (status) {
      case 'Received': return 'medium';
      case 'In Storage': return 'primary';
      case 'Awaiting Pickup': return 'warning';
      case 'Out for Delivery': return 'tertiary';
      case 'Delivered': return 'success';
      case 'Returned': return 'dark';
      case 'Damaged':
      case 'Lost': return 'danger';
      default: return 'medium';
    }
  }

  /**
   * Scan kiye number se carrier pehchanna (web jaisa): spaces hatao, kam se kam 6 characters,
   * har carrier ka trackingPattern test karo, sabse lamba pattern jeetta hai. Galat regex skip.
   */
  detectCarrier(tracking: string): any | null {
    const t = (tracking || '').replace(/\s+/g, '');
    if (t.length < 6) { return null; }
    let best: any = null;
    for (const c of this.carriers) {
      if (!c.trackingPattern) { continue; }
      try {
        if (new RegExp(c.trackingPattern, 'i').test(t) &&
          (!best || c.trackingPattern.length > best.trackingPattern.length)) {
          best = c;
        }
      } catch { /* invalid pattern */ }
    }
    return best;
  }

  trackingLink(trackingNumber: string, template?: string): string {
    const n = encodeURIComponent(trackingNumber || '');
    if (template && /\{tracking(Number)?\}/.test(template)) {
      return template.replace(/\{tracking(Number)?\}/g, n);
    }
    return `https://t.17track.net/en#nums=${n}`;
  }

  /** Unit bhar chuki hai ya is package type ko nahi leti -> picker me disable */
  storageBlockReason(unit: any, packageType?: string): string {
    if (unit.currentOccupancy >= unit.capacity) { return 'Full'; }
    const allowed = unit.allowedPackageTypes || [];
    if (packageType && allowed.length && !allowed.includes(packageType)) { return `Not for ${packageType}`; }
    return '';
  }

  /** Upload se pehle photo chhoti karna: lambi side 1024 px, JPEG 0.75 -> data URL */
  async compressImage(blob: Blob): Promise<string> {
    const objUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('Could not read the photo'));
        i.src = objUrl;
      });
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.75);
    } finally {
      URL.revokeObjectURL(objUrl);
    }
  }
}
