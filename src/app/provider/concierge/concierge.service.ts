import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConciergeService {

  constructor(
    private https: HttpClient) { }

  getTicketList(formData: any): Observable<any> {
    return this.https.post(environment.url + '/concierge/ticket/list', formData)
  }

  getSpecificTicket(data: any): Observable<any> {
    return this.https.post(environment.url + '/concierge/ticket/get-specific-ticket', data);
  }

  actionInProgress(data: any): Observable<any> {
    return this.https.post(environment.url + '/concierge/ticket/ticket-status-change', data);
  }

  getScopeOfWork(): Observable<any> {
    return this.https.get(environment.url + '/concierge/ticket/get-ticket-scope-of-work');
  }

  ticketAssign(formData: any): Observable<any> {
    return this.https.post(environment.url + '/concierge/ticket/ticket-reassign', formData);
  }

  getCategory(formData: any): Observable<any> {
    return this.https.post(environment.url + '/concierge/ticket/site-wise-category', formData);
  }

  getSubCategory(formData: any): Observable<any> {
    return this.https.post(environment.url + '/concierge/ticket/category-wise-subcategory', formData);
  }

  getResponseTime(formData: any): Observable<any> {
    return this.https.post(environment.url + '/concierge/ticket/site-cate-wise-resolve-response-time', formData);
  }

  createTicket(formData: any): Observable<any> {
    return this.https.post(environment.url + '/concierge/ticket/create', formData);
  }
}
