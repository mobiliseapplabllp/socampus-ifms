import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { delay, forkJoin, from, map, mergeMap, Observable, of, throwError } from 'rxjs';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { environment } from 'src/environments/environment';
import { timeout, catchError } from 'rxjs/operators';
import { stat } from 'fs';

@Injectable({
  providedIn: 'root'
})
export class DigitalChecklistService {
  baseurl = environment.url;
  constructor(
    private http: HttpClient
  ) { }

  getOfflineCheckListFromServer(date: string, offset: number = 0): Observable<any> {    
    const apiCall$ = this.http.get(
      `${this.baseurl}digicheck/offlineapp/getAllPendingChecklist?date=${date}&paginate=1&limit=300&offset=${offset}`
    );
    if (offset === 0) {
      return apiCall$.pipe(
        timeout(70000), 
        catchError(err => {
          if (err.name === 'TimeoutError') {
            return throwError(() => new Error('TIMEOUT'));
          }
          return throwError(() => err);
        })
      );
    } else {
      return apiCall$;
    }
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
    // https://aov.mhbemp.in/test_script/RFID.php?djdkmnkmsnd
    return this.http.post(this.baseurl + 'digicheck/offlineapp/saveAllPendingChecklistV2', formData);
    // return this.http.post('https://aov.mhbemp.in/test_script/RFID.php', formData);
  }

  saveVideoResponse(formData: any): Observable<any> {
    return this.http.post(this.baseurl + 'digicheck/offlineapp/saveVideoResponse', formData);
  }

  updateTktToSchedule(formData: any): Observable<any> {
    return this.http.post(this.baseurl + 'digicheck/update_raised_issued_schudled', formData);
  }

  // ---------------- AI Studio translate ----------------
  // AI Studio ka CORS middleware Origin header aate hi 500 deta hai.
  // Native: CapacitorHttp OS ke HTTP stack se jaata hai - na Origin, na preflight.
  // Web: browser Origin bhejega hi, isliye cors proxy ke through Angular HttpClient.
  private get aiStudioHeaders(): any {
    return {
      'X-API-Key': environment.aiStudioKey,
      'X-Environment': environment.aiStudioEnv,
      'Content-Type': 'application/json'
    };
  }

  aiStudioPost(path: string, body: any): Observable<any> {
    if (Capacitor.isNativePlatform()) {
      return from(CapacitorHttp.post({
        url: environment.aiStudioUrl + path,
        headers: this.aiStudioHeaders,
        data: body
      })).pipe(
        // CapacitorHttp 4xx/5xx par reject nahi karta, isliye status khud check karna padta hai
        mergeMap((res: any) => res.status >= 400
          ? throwError(() => ({ status: res.status, statusText: 'Error', error: res.data }))
          : of(res.data))
      );
    }
    return this.http.post(
      environment.aiStudioWebProxy + environment.aiStudioUrl + path,
      body,
      { headers: new HttpHeaders(this.aiStudioHeaders) }
    );
  }

  // ek hi string translate karke sirf translated text deta hai (voice response ke liye)
  aiStudioTranslate(text: string, lang: string): Observable<string> {
    return this.aiStudioTranslateBatch([text], lang).pipe(map(res => res[0] || text));
  }

  // API ek call me sirf 5000 characters leta hai, isliye 4500 par chunk todte hain
  private readonly aiChunkLimit = 4500;
  private readonly aiTextLimit = 5000;

  // Contract: string[] andar, string[] bahar, same order.
  // Andar: saari lines ek hi call me '\n' se jodkar jaati hain (API line breaks preserve karta hai).
  aiStudioTranslateBatch(strings: any[], lang: string): Observable<string[]> {
    // Question ke andar khud ka \n ho sakta hai - usse split par line count badal jaata,
    // isliye pehle usko space bana dete hain. Yahi is approach ki sabse zaroori safety hai.
    const lines: string[] = (strings || []).map((val: any) =>
      (val === null || val === undefined ? '' : String(val)).replace(/[\r\n]+/g, ' ').trim()
    );

    const chunks: string[][] = [];
    let current: string[] = [];
    let currentLen = 0;
    lines.forEach((line: string) => {
      const size = line.length + 1;
      if (current.length && currentLen + size > this.aiChunkLimit) {
        chunks.push(current);
        current = [];
        currentLen = 0;
      }
      current.push(line);
      currentLen = currentLen + size;
    });
    if (current.length) {
      chunks.push(current);
    }
    if (!chunks.length) {
      return of([]);
    }

    const calls = chunks.map((chunk: string[]) => {
      const text = chunk.join('\n');
      // khaali chunk ya ek hi line limit se badi - API call ka fayda nahi, original hi rakho
      if (!text.trim() || text.length > this.aiTextLimit) {
        return of({ lines: chunk, ok: true, err: null });
      }
      return this.aiStudioPost('translate', { text, to: lang }).pipe(
        map((res: any) => {
          const out = res?.data?.translations?.[0]?.text;
          const back = typeof out === 'string' ? out.split('\n').map((val: string) => val.trim()) : [];
          // count match na ho to translation bharosemand nahi - warna galat text galat
          // question par lag jaayega. Aise me us chunk ka original text hi rehne dete hain.
          return { lines: back.length === chunk.length ? back : chunk, ok: true, err: null };
        }),
        catchError((err: any) => of({ lines: chunk, ok: false, err }))
      );
    });

    return forkJoin(calls).pipe(
      mergeMap((res: any[]) => {
        // ek-aadha chunk fail ho to baaki translate dikha dete hain, sab fail ho to error
        if (res.every((val: any) => !val.ok)) {
          return throwError(() => res[0].err);
        }
        return of(([] as string[]).concat(...res.map((val: any) => val.lines)));
      })
    );
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

  getJustification(schedule_id: string): Observable<any> {
    let obj = {
      schedule_id: schedule_id
    }
    return this.http.post(this.baseurl + 'digicheck/missed_justification/status', obj);
  }

  submitJusti(formData: any): Observable<any> {
    return this.http.post(this.baseurl + 'digicheck/missed_justification/add', formData);
  }

  updateJusti(formData: any): Observable<any> {
    return this.http.post(this.baseurl + 'digicheck/missed_justification/update', formData);
  }

  deleteJust(id: any): Observable<any> {
    return this.http.delete(this.baseurl + 'digicheck/missed_justification/delete?id=' + id);
  }

  getAutoFillData(payload: { scheduler_id: any; schedule_id: any; checklist_cat_id: any }): Observable<any> {
    // TODO: replace dummy with real API once backend is ready
    return this.http.post(this.baseurl + 'digicheck/offlineapp/get_autofill_data', payload);
    // const dummy = {
    //   status: true,
    //   msg: 'data found',
    //   // Attachment (q_type 225) and Video (q_type 315) are excluded — no auto-fill (neither rspns nor remark)
    //   data: [
    //     { q_id: 1445, q_type: '227', rspns: '42',                        remark: 'Auto-filled number remark'      },
    //     { q_id: 1447, q_type: '226', rspns: 'Yes',                       remark: 'Auto-filled option remark'      },
    //     { q_id: 1448, q_type: '229', rspns: '2026-04-20',                remark: 'Auto-filled date remark'        },
    //     { q_id: 1449, q_type: '308', rspns: 'Sample short text answer',  remark: 'Auto-filled shorttext remark'   },
    //     { q_id: 1450, q_type: '313', rspns: '2026-04-20T10:30:00',       remark: 'Auto-filled datetime remark'    },
    //     { q_id: 1451, q_type: '314', rspns: '55',                        remark: 'Auto-filled temperature remark' },
    //     { q_id: 1464, q_type: '308', rspns: 'Another short text answer', remark: 'Auto-filled remark'             },
    //   ],
    // };
    // return of(dummy).pipe(delay(300));
  }

}
