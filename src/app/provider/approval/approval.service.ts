import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApprovalService {

  constructor(
    private http: HttpClient) { }

  getPendingPTW(): Observable<any> {
    return this.http.get(environment.url + 'complaints/get_complaint_ptw_approvals');
  }

  actionPtw(obj: Object): Observable<any> {
    return this.http.post(environment.url + 'complaints/complaint_ptw_approval_action', obj);
  }
}
