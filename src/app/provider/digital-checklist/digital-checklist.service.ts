import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { delay, forkJoin, mergeMap, Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})
export class DigitalChecklistService {
  baseurl = environment.url;
  constructor(
    private http: HttpClient
  ) { }

  getOfflineCheckListFromServer(date: string, offset?: number): Observable<any> {
    // return this.http.get('assets/data/offline_checklist' + date + '.json');
    return this.http.get(this.baseurl + 'digicheck/offlineapp/getAllPendingChecklist?date=' + date + '&paginate=1&limit=300&offset=' + offset);
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
    return this.http.post(this.baseurl + 'digicheck/offlineapp/saveAllPendingChecklist', formData);
  }

  updateTktToSchedule(formData: any): Observable<any> {
    return this.http.post(this.baseurl + 'digicheck/update_raised_issued_schudled', formData);
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
        return this.http.post(url, data)
      } else {
        return this.http.get(url)
      }
    });
    return forkJoin(observables);
  }

  submitDummyApi(data: any): Observable<any> {
    const formData = new FormData();
    formData.append('a','1222');
    return this.http.get('https://aovsshdashboard.com/Webservices/test_image.php' , {params: data})
  }

  // postDynamicData(apiRequests: any[]): Observable<any[]> {
  //   const observables = apiRequests.map(request => {
  //     const { method, url, data, delayTime, id } = request;

  //     // Check if a delayTime is provided and if it's for the specific id
  //     const delayObservable = url === 'https://socampus-8db369a81c0c.herokuapp.com/https://ifmsuat.mobilisepro.com/backend/api/complaints/dash/mobile_app_engineer_dashboard'
  //       ? of(null).pipe(delay(10000))
  //       : of(null);

  //     const apiRequestObservable = this.makeApiRequest(method, url, data);

  //     // Use mergeMap to merge the delay and the actual API request
  //     return delayObservable.pipe(
  //       mergeMap(() => apiRequestObservable)
  //     );
  //   });

  //   return forkJoin(observables);
  // }

  // private makeApiRequest(method: string, url: string, data: any): Observable<any> {
  //   if (method.toLowerCase() === 'post') {
  //     return this.http.post(url, data);
  //   } else {
  //     return this.http.get(url);
  //   }
  // }

}
