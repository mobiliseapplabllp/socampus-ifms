import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})
export class DigitalChecklistService {
  baseurl = environment.url;
  constructor(
    private http: HttpClient
  ) { }

  getOfflineCheckListFromServer(date: string): Observable<any> {
    return this.http.get('assets/data/offline_checklist' + date + '.json');
  }

  getSchedule(): Observable<any> {
    return this.http.get(this.baseurl + 'digicheck/get_scheduled_calender?limit=10&page=1');
  }

  getScheduleHistory(date: any): Observable<any> {
    return this.http.get(this.baseurl + 'digicheck/get_scheduled_calender?date=' + date);
  }

  verifyAssetByQr(obj: any): Observable<any> {
    return this.http.post(this.baseurl + 'digicheck/verifyAssetDcByQr', obj);
  }

  getSceduleMissed(loc_id: any): Observable<any> {
    return this.http.get(this.baseurl + 'digicheck/get_scheduled_calender?qr_loc_id=' + loc_id +  '&on_behalf=1')
  }

  getScheduleQuestion(schedule_id: any): Observable<any> {
    return this.http.get(this.baseurl + 'digicheck/get_schedule_questions/' + schedule_id)
  }

  scheduleResponseAction(formData: any): Observable<any> {
    return this.http.post(this.baseurl + 'digicheck/schedule_response_action', formData);
  }

  schuleRemarkAction(formData: any): Observable<any> {
    return this.http.post(this.baseurl + 'digicheck/schedule_response_action_rem', formData);
  }

  scheduleDocAction(formData: any): Observable<any> {
    return this.http.post(this.baseurl + 'digicheck/schedule_response_action_doc', formData)
  }

  finalSubmitCheckList(formData: any): Observable<any> {
    return this.http.post(this.baseurl + 'digicheck/update_schedule_status', formData)
  }

  googleTranslate(data: any, lang: string): Observable<any> {
    return this.http.post('https://translate.googleapis.com/language/translate/v2?key=AIzaSyDJjHphpheVQM7CRYNqHHdJqMqAgt0IY70', {
      "q": data,
      "target": lang
    });
  }

  getMultipleData(data: any): Observable<any[]> {
    const forkData: any = [];
    for (var i = 0 ; i < data.length; i++) {
      forkData.push(
        this.http.post('https://api.example.com/data1', data[i])
      )
    }
    console.log(forkData);
    const apiUrl1 = 'https://api.example.com/data1';
    const apiUrl2 = 'https://api.example.com/data2';

    return forkJoin([
      this.http.get(apiUrl1),
      this.http.get(apiUrl2)
    ]);
  }

  getDynamicData(apiEndpoints: string[]): Observable<any[]> {
    const observables = apiEndpoints.map(endpoint => this.http.get(endpoint));
    return forkJoin(observables);
  }

  postDynamicData(apiRequests: any[]): Observable<any[]> {
    const observables = apiRequests.map(request => {
      const { method, url, data } = request;
      if (method.toLowerCase() === 'post') {
        return this.http.post(url, data);
      } else {
        return this.http.get(url);
      }
    });
    return forkJoin(observables);
  }
}
