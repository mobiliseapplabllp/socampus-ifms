import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

// Backend: Laravel, prefix /api/key-management
// Har response HTTP 200 + { status, msg, data } hota hai, date-time ISO UTC me jata hai
@Injectable({
  providedIn: 'root'
})
export class KeysService {
  homeStatus = true;
  private base = environment.url + 'key-management/';
  constructor(
    private https: HttpClient
  ) { }

  setHomePageStatus(status: boolean) {
    this.homeStatus = status
  }

  getHomePageStatus() {
    return this.homeStatus;
  }

  // sites, departments, user, otp_required
  getMasters(): Observable<any> {
    return this.https.get(this.base + 'masters');
  }

  // data: { total, issued, available, overdue, lost }
  getSummary(): Observable<any> {
    return this.https.get(this.base + 'summary');
  }

  addKey(body: any): Observable<any> {
    return this.https.post(this.base + 'keys', body);
  }

  updateKeys(keyId: any, body: any): Observable<any> {
    return this.https.post(this.base + 'keys/' + keyId, body);
  }

  // Backend me pagination / search nahi hai, poori list aati hai
  getAddKeys(): Observable<any> {
    return this.https.get(this.base + 'keys');
  }

  // Alag "available keys" API nahi hai, caller status Available par filter karta hai
  availKey(): Observable<any> {
    return this.https.get(this.base + 'keys');
  }

  // params (sab optional): site_id, status (Issued | Returned | Lost | Recovered), assigned_to, date_from, date_to ...
  getAssignKeys(params: any = {}): Observable<any> {
    return this.https.get(this.base + 'assignments', { params }).pipe(map(res => this.flattenRes(res)));
  }

  getRecentHistory(): Observable<any> {
    return this.https.get(this.base + 'assignments').pipe(map(res => this.flattenRes(res)));
  }

  viewKey(asgnId: any): Observable<any> {
    return this.https.get(this.base + 'assignments/' + asgnId).pipe(map(res => this.flattenRes(res)));
  }

  // Assignment row me key ki detail nested `key` object me aati hai
  // (key_no, key_name, room_no, site_name, block_name, building_name, floor_name, location_name).
  // Unhe row par flat kar dete hain taaki har screen seedha dat.key_name padh sake.
  // `status` / `remarks` assignment ke hi rehte hain, key ka status `key_status` me milta hai.
  private flattenAssignment(row: any): any {
    if (!row || typeof row !== 'object' || !row.key) {
      return row;
    }
    return { ...row.key, ...row, key_status: row.key.status };
  }

  private flattenRes(res: any): any {
    if (!res || !res.data) {
      return res;
    }
    const data = Array.isArray(res.data)
      ? res.data.map((row: any) => this.flattenAssignment(row))
      : this.flattenAssignment(res.data);
    return { ...res, data };
  }

  // multipart/form-data
  assignKey(formData: FormData): Observable<any> {
    return this.https.post(this.base + 'assign', formData);
  }

  markReturnKey(asgnId: any, body: any): Observable<any> {
    return this.https.post(this.base + 'assignments/' + asgnId + '/return', body);
  }

  reportLostKey(asgnId: any, body: any): Observable<any> {
    return this.https.post(this.base + 'assignments/' + asgnId + '/lost', body);
  }

  recoverLostKey(asgnId: any, body: any): Observable<any> {
    return this.https.post(this.base + 'assignments/' + asgnId + '/recover', body);
  }

  assignKeyHis(keyId: any): Observable<any> {
    return this.https.get(this.base + 'keys/' + keyId + '/history');
  }

  getLocationHistory(keyId: number): Observable<any> {
    return this.https.get(this.base + 'keys/' + keyId + '/location-history');
  }

  sendOtp(body: any): Observable<any> {
    return this.https.post(this.base + 'otp/send', body);
  }

  // data: { otp_token } - assign me bhejna hota hai
  verifyOtp(body: any): Observable<any> {
    return this.https.post(this.base + 'otp/verify', body);
  }

  // Row ka assignment id - backend `asgn_id` bhejta hai
  asgnId(row: any): any {
    return row?.asgn_id ?? row?.assignment_id ?? row?.id;
  }

}
