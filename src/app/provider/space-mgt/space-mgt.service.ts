import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import * as dummy from './space-mgt.dummy';

// ============================================================================
// Backend abhi ready nahi hai, isliye dummy data chal raha hai.
// LIVE karne ke liye: USE_DUMMY = false karo, aur space-mgt.dummy.ts delete kar do
// (uska import upar se bhi hata dena). Real API calls niche pahle se likhi hui hain.
// ============================================================================
const USE_DUMMY = true;

// Space Management APIs — embassy ke facility-booking wali same APIs.
// Flow: STEP 0 (sso/initiate) app ke apne backend par, uske baad saari APIs FMS par.
// FMS calls me token2 interceptor khud laga deta hai.
@Injectable({
  providedIn: 'root'
})
export class SpaceMgtService {

  constructor(private http: HttpClient) { }

  // Dummy response ko thoda late bhejte hain taaki loader / spinner bhi dikhe
  private mock(res: any): Observable<any> {
    return of(res).pipe(delay(500));
  }

  // STEP 0 (a) — app backend se short-lived handoff token (2 min) aur redirect_url
  ssoInitiate(): Observable<any> {
    if (USE_DUMMY) { return this.mock(dummy.dummyInitiate()); }
    const token = localStorage.getItem('token1');
    return this.http.post(environment.url + 'sso/initiate', { token: token, smnu_id: 565 });
  }

  // STEP 0 (b) — wahi handoff token FMS ko de kar asli FMS token (token2) + user lete hain
  ssoValidate(ssoToken: string): Observable<any> {
    if (USE_DUMMY) { return this.mock(dummy.dummyValidate()); }
    return this.http.post(environment.fmsUrl + 'api/sso/embassy/validate', { token: ssoToken });
  }

  // STEP 1 — sites?limit=100&tenant_id=5&organisation_id=5
  getSites(tenantId: any, orgId: any): Observable<any> {
    if (USE_DUMMY) { return this.mock(dummy.dummySites()); }
    return this.http.get(environment.fmsUrl + 'api/sites?limit=100&tenant_id=' + tenantId + '&organisation_id=' + orgId);
  }

  // STEP 2 — facilities?page=1&limit=25&site_id=35&tenant_id=5&organisation_id=5
  getFacilities(siteId: any, tenantId: any, orgId: any, page: any = 1): Observable<any> {
    if (USE_DUMMY) { return this.mock(dummy.dummyFacilities(siteId)); }
    return this.http.get(environment.fmsUrl + 'api/facilities?page=' + page + '&limit=25&site_id=' + siteId
      + '&tenant_id=' + tenantId + '&organisation_id=' + orgId);
  }

  // STEP 3 — facilities/1415
  getFacilityDetail(facilityId: any): Observable<any> {
    if (USE_DUMMY) { return this.mock(dummy.dummyFacilityDetail(facilityId)); }
    return this.http.get(environment.fmsUrl + 'api/facilities/' + facilityId);
  }

  // STEP 3 — facilities/1415/pantries/menu
  getPantryMenu(facilityId: any): Observable<any> {
    if (USE_DUMMY) { return this.mock(dummy.dummyPantryMenu(facilityId)); }
    return this.http.get(environment.fmsUrl + 'api/facilities/' + facilityId + '/pantries/menu');
  }

  // STEP 3 — meal-times
  getMealTimes(): Observable<any> {
    if (USE_DUMMY) { return this.mock(dummy.dummyMealTimes()); }
    return this.http.get(environment.fmsUrl + 'api/meal-times');
  }

  // STEP 4 — bookings/day?facility_id=2070&date=2026-10-29&attendees=1
  getDaySlots(facilityId: any, date: any, attendees: any): Observable<any> {
    if (USE_DUMMY) { return this.mock(dummy.dummyDaySlots(facilityId, date, attendees)); }
    return this.http.get(environment.fmsUrl + 'api/bookings/day?facility_id=' + facilityId
      + '&date=' + date + '&attendees=' + attendees);
  }

  // Slot select par — bookings/check?facility_id=&start_at=&end_at=&attendees=
  checkBooking(facilityId: any, startAt: any, endAt: any, attendees: any): Observable<any> {
    if (USE_DUMMY) { return this.mock(dummy.dummyCheck(facilityId, startAt, endAt, attendees)); }
    // start_at / end_at me space hota hai isliye encode karke bhejte hain
    return this.http.get(environment.fmsUrl + 'api/bookings/check?facility_id=' + facilityId
      + '&start_at=' + encodeURIComponent(startAt) + '&end_at=' + encodeURIComponent(endAt)
      + '&attendees=' + attendees);
  }

  // Confirm booking — POST bookings
  createBooking(data: any): Observable<any> {
    if (USE_DUMMY) { return this.mock(dummy.dummyCreateBooking(data)); }
    return this.http.post(environment.fmsUrl + 'api/bookings', data);
  }
}
