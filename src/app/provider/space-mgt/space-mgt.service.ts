import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';


@Injectable({
  providedIn: 'root'
})
export class SpaceMgtService {


  private readonly FMS_APP_ID = 73;

  constructor(private http: HttpClient) { }


  ssoInitiate(): Observable<any> {
    const appLink = environment.fmsUrl.replace(/\/$/, '');
    return this.http.post(environment.url + 'sso/initiate', { app_id: this.FMS_APP_ID, app_link: appLink });
  }


  ssoValidate(ssoToken: string): Observable<any> {
    return this.http.post(environment.fmsUrl + 'api/sso/sodexo/validate', { token: ssoToken });
  }


  // STEP 1 — organisations?limit=500&tenant_id=11
  getOrganisations(tenantId: any): Observable<any> {
    return this.http.get(environment.fmsUrl + 'api/organisations?limit=500&tenant_id=' + tenantId);
  }

  // STEP 2 — sites?limit=100&tenant_id=11&organisation_id=<selected org>
  getSites(tenantId: any, orgId: any): Observable<any> {
    return this.http.get(environment.fmsUrl + 'api/sites?limit=100&tenant_id=' + tenantId + '&organisation_id=' + orgId);
  }


  getFacilities(siteId: any, tenantId: any, orgId: any, page: any = 1): Observable<any> {
    return this.http.get(environment.fmsUrl + 'api/facilities?page=' + page + '&limit=25&site_id=' + siteId
      + '&tenant_id=' + tenantId + '&organisation_id=' + orgId);
  }


  getFacilityDetail(facilityId: any): Observable<any> {
    return this.http.get(environment.fmsUrl + 'api/facilities/' + facilityId);
  }


  getPantryMenu(facilityId: any): Observable<any> {
    return this.http.get(environment.fmsUrl + 'api/facilities/' + facilityId + '/pantries/menu');
  }


  getMealTimes(): Observable<any> {
    return this.http.get(environment.fmsUrl + 'api/meal-times');
  }


  getDaySlots(facilityId: any, date: any, attendees: any): Observable<any> {
    return this.http.get(environment.fmsUrl + 'api/bookings/day?facility_id=' + facilityId
      + '&date=' + date + '&attendees=' + attendees);
  }


  checkBooking(facilityId: any, startAt: any, endAt: any, attendees: any): Observable<any> {

    return this.http.get(environment.fmsUrl + 'api/bookings/check?facility_id=' + facilityId
      + '&start_at=' + encodeURIComponent(startAt) + '&end_at=' + encodeURIComponent(endAt)
      + '&attendees=' + attendees);
  }


  createBooking(data: any): Observable<any> {
    return this.http.post(environment.fmsUrl + 'api/bookings', data);
  }
}
