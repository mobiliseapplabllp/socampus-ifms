import { environment } from 'src/environments/environment';

/**
 * Mailroom session ki storage (tokens, base url, selected site).
 * DI ke bina static rakha hai taaki TokenInterceptor bhi ise seedha use kar sake.
 *
 * Do alag tokens hain aur dono ek doosre ke endpoints par nahi chalte:
 *  - staff token  -> /api/v1/*  (Mail Room Panel)
 *  - portal token -> /api/v1/portal/*  (My Package)
 */
export class MailroomSession {
  static readonly STAFF_KEY = 'mailroom_staff_token';
  static readonly PORTAL_KEY = 'mailroom_portal_token';
  static readonly BASE_KEY = 'mailroom_base';
  static readonly PROPERTY_KEY = 'mailroom_property';

  /**
   * Mailroom API base, e.g. https://mailroom.example.com/api/v1
   * environment.mailroomUrl diya ho to wahi, warna SSO url ke origin se nikala hua.
   */
  static base(): string {
    const fromEnv = (environment as any).mailroomUrl || '';
    return (fromEnv || localStorage.getItem(MailroomSession.BASE_KEY) || '').replace(/\/+$/, '');
  }

  static setBaseFromSsoUrl(ssoUrl: string) {
    if ((environment as any).mailroomUrl) { return; }
    localStorage.setItem(MailroomSession.BASE_KEY, new URL(ssoUrl).origin + '/api/v1');
  }

  static isMailroomUrl(url: string): boolean {
    const base = MailroomSession.base();
    return !!base && url.startsWith(base);
  }

  static isPortalUrl(url: string): boolean {
    return url.startsWith(MailroomSession.base() + '/portal/');
  }

  static staffToken(): string { return localStorage.getItem(MailroomSession.STAFF_KEY) || ''; }
  static portalToken(): string { return localStorage.getItem(MailroomSession.PORTAL_KEY) || ''; }
  static propertyId(): string { return localStorage.getItem(MailroomSession.PROPERTY_KEY) || ''; }

  static setStaffToken(t: string) { localStorage.setItem(MailroomSession.STAFF_KEY, t); }
  static setPortalToken(t: string) { localStorage.setItem(MailroomSession.PORTAL_KEY, t); }
  static setPropertyId(id: string) {
    if (id) { localStorage.setItem(MailroomSession.PROPERTY_KEY, id); } else { localStorage.removeItem(MailroomSession.PROPERTY_KEY); }
  }

  static clearStaff() { localStorage.removeItem(MailroomSession.STAFF_KEY); }
  static clearPortal() { localStorage.removeItem(MailroomSession.PORTAL_KEY); }

  /** Mailroom request par lagne wale headers (interceptor use karta hai) */
  static headersFor(url: string): { [k: string]: string } {
    const headers: { [k: string]: string } = { Accept: 'application/json' };
    if (url.endsWith('/auth/sso')) { return headers; }   // SSO exchange par koi token nahi
    if (MailroomSession.isPortalUrl(url)) {
      const t = MailroomSession.portalToken();
      if (t) { headers['Authorization'] = `Bearer ${t}`; }
      return headers;
    }
    const t = MailroomSession.staffToken();
    if (t) { headers['Authorization'] = `Bearer ${t}`; }
    const p = MailroomSession.propertyId();
    if (p) { headers['X-Property-Id'] = p; }
    return headers;
  }
}
