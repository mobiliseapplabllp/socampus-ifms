import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/**
 * VMS (Atithi) visitor management APIs.
 * Ported from atithi app (providers/login.service.ts).
 *
 * Auth: page khulte hi ssoLogin() -> `vms_token` save.
 * TokenInterceptor VMS APIs (environment.vmsUrl) me `vms_token` lagata hai,
 * IFMS ka token1 nahi.
 */
@Injectable({ providedIn: 'root' })
export class VmsService {

  static readonly TOKEN_KEY = 'vms_token';
  static readonly USER_KEY = 'vms_user';

  private base = environment.vmsUrl;

  constructor(private http: HttpClient) {}

  // ===== Session (SSO) =====

  /**
   * VMS token lena - VMS page khulte hi sabse pehle ye call hota hai.
   *
   * Step 1: IFMS API `sso/atithi` (token1 interceptor khud lagata hai)
   *         response: { status: true, url: "https://atithidev.../integration/socampus_sodexo?userData=..&jwt_secret=.." }
   * Step 2: us url se userData, jwt_secret, plantCode nikalo
   *         (atithi web page bhi yahi karta hai)
   * Step 3: POST {vmsUrl}/integration/socampus-sodexo  { userData, jwt_secret, plantCode }
   *         response: { success, data: { token, refreshToken, user } }
   * Step 4: token `vms_token` me save - interceptor VMS APIs me yahi bhejega
   */
  ssoLogin(): Observable<string> {
    localStorage.removeItem(VmsService.TOKEN_KEY); // purana/expired token hata do

    return this.http.get<any>(`${environment.url}sso/atithi`).pipe(
      switchMap((res: any) => {
        if (!res?.status || !res?.url) {
          return throwError(() => new Error(res?.message || 'VMS SSO: url nahi mila'));
        }
        return this.http.post<any>(...this.buildIntegrationRequest(res.url));
      }),
      map((res: any) => {
        const token = res?.data?.token;
        if (!res?.success || !token) {
          throw new Error(res?.message || 'VMS SSO: token nahi mila');
        }
        localStorage.setItem(VmsService.TOKEN_KEY, token);
        if (res.data.user) {
          localStorage.setItem(VmsService.USER_KEY, JSON.stringify(res.data.user));
        }
        return token;
      }),
    );
  }

  /** sso url -> [integration api url, body] */
  private buildIntegrationRequest(ssoUrl: string): [string, any] {
    const u = new URL(ssoUrl);
    // ".../integration/socampus_sodexo" -> "socampus-sodexo"
    const type = u.pathname.split('/').filter(Boolean).pop()!.replace(/_/g, '-');

    const body: any = {
      userData: JSON.parse(u.searchParams.get('userData') || '{}'),
      jwt_secret: u.searchParams.get('jwt_secret'),
    };
    const plantCode = u.searchParams.get('plantCode');
    if (plantCode) {
      try { body.plantCode = JSON.parse(plantCode); } catch { body.plantCode = plantCode; }
    }
    return [`${this.base}/integration/${type}`, body];
  }

  getUser(): any {
    const raw = localStorage.getItem(VmsService.USER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  getToken(): string {
    return localStorage.getItem(VmsService.TOKEN_KEY) || '';
  }

  // ===== Invites =====

  getInvites(params: any = {}): Observable<any> {
    const defaults = { page: 1, limit: 20, sortBy: 'visit_date_time', sortOrder: 'desc' };
    return this.http.get(`${this.base}/invites?${this.qs({ ...defaults, ...params })}`);
  }

  getInviteHistory(params: any = {}): Observable<any> {
    const defaults = { page: 1, limit: 50, sortBy: 'visit_date_time', sortOrder: 'desc', group_by_host: false };
    return this.http.get(`${this.base}/invites/history?${this.qs({ ...defaults, ...params })}`);
  }

  createInvite(payload: any): Observable<any> {
    return this.http.post(`${this.base}/invites`, payload);
  }

  createBulkInvite(payload: any): Observable<any> {
    return this.http.post(`${this.base}/invites/bulk`, payload);
  }

  updateInvite(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.base}/invites/${id}`, payload);
  }

  deleteInvite(id: number): Observable<any> {
    return this.http.delete(`${this.base}/invites/${id}`);
  }

  resendInvite(id: number): Observable<any> {
    return this.http.post(`${this.base}/invites/${id}/resend`, {});
  }

  cancelInvite(id: number): Observable<any> {
    return this.http.put(`${this.base}/invites/${id}`, { status: 'cancelled' });
  }

  checkoutInvite(id: number): Observable<any> {
    return this.http.post(`${this.base}/invites/${id}/checkout`, {});
  }

  // ===== Lookups =====

  getUsers(params: any = {}): Observable<any> {
    return this.http.get(this.withQs(`${this.base}/users`, params));
  }

  getSites(params: any = {}): Observable<any> {
    return this.http.get(`${this.base}/sites?${this.qs({ page: 1, limit: 1000, ...params })}`);
  }

  getBuildings(siteId: any): Observable<any> {
    return this.http.get(`${this.base}/buildings?site_id=${siteId}&page=1&limit=1000`);
  }

  getFloors(buildingId: any): Observable<any> {
    return this.http.get(`${this.base}/floors?building_id=${buildingId}&page=1&limit=1000`);
  }

  getParkingZones(siteId: any): Observable<any> {
    return this.http.get(`${this.base}/parking-zones?site_id=${siteId}`);
  }

  getMeetingRooms(floorId: any): Observable<any> {
    return this.http.get(`${this.base}/meeting-rooms?floor_id=${floorId}`);
  }

  getSiteSchedule(siteId: any): Observable<any> {
    return this.http.get(`${this.base}/sites/${siteId}/schedule`);
  }

  getSitePolicies(siteId: any): Observable<any> {
    return this.http.get(`${this.base}/policies/site/${siteId}`);
  }

  getVisitorTypes(params: any = {}): Observable<any> {
    return this.http.get(`${this.base}/visitor-types?${this.qs({ is_active: true, page: 1, limit: 1000, ...params })}`);
  }

  getVisitPurposes(params: any = {}): Observable<any> {
    return this.http.get(`${this.base}/visit-purposes?${this.qs({ page: 1, limit: 1000, ...params })}`);
  }

  suggestPurposeAI(description: string): Observable<any> {
    return this.http.post(`${this.base}/visit-purposes/suggest-ai`, { description });
  }

  // ===== QR approval =====

  getVisitorRequests(params: any = {}): Observable<any> {
    return this.http.get(this.withQs(`${this.base}/visitor-requests`, params));
  }

  // ===== helpers =====

  private qs(params: any): string {
    return Object.keys(params)
      .filter(k => params[k] !== null && params[k] !== undefined && params[k] !== '')
      .map(k => `${k}=${encodeURIComponent(params[k])}`)
      .join('&');
  }

  private withQs(url: string, params: any): string {
    const q = this.qs(params);
    return q ? `${url}?${q}` : url;
  }
}
