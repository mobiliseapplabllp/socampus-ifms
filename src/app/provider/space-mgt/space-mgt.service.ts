import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// Space Management APIs — embassy ke facility-booking wali same APIs.
// Flow: STEP 0 (sso/initiate) app ke apne backend par, uske baad saari APIs FMS par.
// FMS calls me token2 interceptor khud laga deta hai.
@Injectable({
  providedIn: 'root'
})
export class SpaceMgtService {

  constructor(private http: HttpClient) { }

  // STEP 0 (a) — app backend se short-lived handoff token (2 min) aur redirect_url
  ssoInitiate(): Observable<any> {
    const token = localStorage.getItem('token1');
    return this.http.post(environment.url + 'sso/initiate', { token: token, smnu_id: 565 });
  }

  // STEP 0 (b) — wahi handoff token FMS ko de kar asli FMS token (token2) + user lete hain
  ssoValidate(ssoToken: string): Observable<any> {
    return this.http.post(environment.fmsUrl + 'api/sso/embassy/validate', { token: ssoToken });
  }

  // STEP 1 — sites?limit=100&tenant_id=5&organisation_id=5
  getSites(tenantId: any, orgId: any): Observable<any> {
    return this.http.get(environment.fmsUrl + 'api/sites?limit=100&tenant_id=' + tenantId + '&organisation_id=' + orgId);
  }

  // STEP 2 — facilities?page=1&limit=25&site_id=35&tenant_id=5&organisation_id=5
  getFacilities(siteId: any, tenantId: any, orgId: any, page: any = 1): Observable<any> {
    return this.http.get(environment.fmsUrl + 'api/facilities?page=' + page + '&limit=25&site_id=' + siteId
      + '&tenant_id=' + tenantId + '&organisation_id=' + orgId);
  }

  // STEP 3 — facilities/1415
  getFacilityDetail(facilityId: any): Observable<any> {
    return this.http.get(environment.fmsUrl + 'api/facilities/' + facilityId);
  }

  // STEP 3 — facilities/1415/pantries/menu
  getPantryMenu(facilityId: any): Observable<any> {
    return this.http.get(environment.fmsUrl + 'api/facilities/' + facilityId + '/pantries/menu');
  }

  // STEP 3 — meal-times
  getMealTimes(): Observable<any> {
    return this.http.get(environment.fmsUrl + 'api/meal-times');
  }

  // STEP 4 — bookings/day?facility_id=2070&date=2026-10-29&attendees=1
  getDaySlots(facilityId: any, date: any, attendees: any): Observable<any> {
    return this.http.get(environment.fmsUrl + 'api/bookings/day?facility_id=' + facilityId
      + '&date=' + date + '&attendees=' + attendees);
  }

  // Slot select par — bookings/check?facility_id=&start_at=&end_at=&attendees=
  checkBooking(facilityId: any, startAt: any, endAt: any, attendees: any): Observable<any> {
    // start_at / end_at me space hota hai isliye encode karke bhejte hain
    return this.http.get(environment.fmsUrl + 'api/bookings/check?facility_id=' + facilityId
      + '&start_at=' + encodeURIComponent(startAt) + '&end_at=' + encodeURIComponent(endAt)
      + '&attendees=' + attendees);
  }

  // Confirm booking — POST bookings
  createBooking(data: any): Observable<any> {
    return this.http.post(environment.fmsUrl + 'api/bookings', data);
  }
}
