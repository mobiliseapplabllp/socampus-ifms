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

  getPendingPpmPtw(): Observable<any> {
    return this.http.get(environment.url + 'pmscal/get_pms_ptw_approvals');
  }

  actionPpmPtw(obj: Object): Observable<any> {
    return this.http.post(environment.url + 'pmscal/pms_ptw_approval_action', obj);
  }

  getHelpdeskOnHoldTickets(): Observable<any> {
    return this.http.get(environment.url + 'complaints/get_helpdesk_on_hold_tickets_list');
  }

  actionHoldTicket(obj: Object): Observable<any> {
    return this.http.post(environment.url + 'complaints/helpdesk_on_hold_approval_action', obj); // approve id, status:1/0, reject id status remark 
  }

  getPpmHold(): Observable<any> {
    return this.http.get(environment.url  + 'pmscal/ppm/get_ppm_on_hold_work_order_list');
  }

  actionHoldPPM(obj: Object): Observable<any> {
    return this.http.post(environment.url + 'pmscal/ppm/ppm_on_hold_approval_action', obj);
  }

  getApprvalMatrix(): Observable<any> {
    return this.http.get(environment.url + 'get_approval_matrix_count') 
  }

  getStockAdujApp(): Observable<any> {
    return this.http.get(environment.url + 'purchase/inventory/get_stock_adjust_approval');
  }

  getIndentApp(): Observable<any> {
    return this.http.get(environment.url + 'dashboard/get_approvals');
  }

  stockAdjustApproveReject(payload:any) {
    return this.http.post( environment.url + 'purchase/inventory/stock_adjust_approval_Action', payload );
  }

  getStockMaterialDetails(payload:any) {
    return this.http.get(environment.url + 'purchase/inventory/get_stock_adjust_mtrl?order_no='+payload );
  }

  indentAdjustApproveReject(payload:any) {
    return this.http.post( environment.url + 'dashboard/mr_approve_action', payload );
  }
  
  
}