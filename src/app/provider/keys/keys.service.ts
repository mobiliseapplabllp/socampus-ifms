import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class KeysService {
  homeStatus = true;
  constructor(
    private https: HttpClient
  ) { }

  setHomePageStatus(status: boolean) {
    this.homeStatus = status
  }

  getHomePageStatus() {
    return this.homeStatus;
  }

  getSummary(): Observable<any> {
    return this.https.get(environment.url + 'reports/summary');    
  }

  addKey(formData: any): Observable<any> {
    return this.https.post(environment.url + 'keys', formData);
  }

  updateKeys(keyId: any, formData: any): Observable<any> {
    return this.https.patch(environment.url + 'keys/' + keyId, formData);
  }

  availKey(): Observable<any> {
    return this.https.get(environment.url + 'assignments/available-keys');
  }

  viewKey(keyId: string): Observable<any> {
    return this.https.get(environment.url + 'assignments/' + keyId);
  }

  assignKey(formData: any): Observable<any> {
    return this.https.post(environment.url + 'assignments', formData);
  }

  getAssignKeys(val: string, page: number): Observable<any> {        
    return this.https.get(environment.url + 'assignments/keys?page=' + page + '&pageSize=10&search=' + (val || ''));
  }

  getAddKeys(val: string, page: number): Observable<any> {
    return this.https.get(environment.url + 'keys?page=' + page + '&pageSize=10&search=' + (val || ''));
  }

  reportLostKey(formData: any): Observable<any> {
    return this.https.post(environment.url + 'reports/lost', formData);
  }

  assignKeyHis(keyId: any): Observable<any> {
    return this.https.get(environment.url + 'assignments/keys/' + keyId + '/history');
  }

  recoverLostKey(keyId: any, formData: any): Observable<any> {
    return this.https.post(environment.url + 'keys/' + keyId + '/recover', formData);
  }
  
  markReturnKey(keyId: any , formData:any): Observable<any> {
    return this.https.post(environment.url + 'keys/' + keyId + '/return', formData);
  }

  getRecentHistory(): Observable<any> {
    return this.https.get(environment.url + 'assignments?page=1&pageSize=5&includeAllHistory=true')
  }

  getLocationHistory(keyId: number): Observable<any> {
    return this.https.get(environment.url + 'keys/' + keyId + '/location-history');
  }

  getDepartment(): Observable<any> {
    return this.https.get(environment.url + 'assets/settings/get_department?status=1')
  }

  sendOtp(formData: any): Observable<any> {
    return this.https.post(environment.url + 'otp/send', formData);
  }

  verifyOtp(formData: any): Observable<any> {
    return this.https.post(environment.url + 'otp/verify', formData);
  }


  

}
