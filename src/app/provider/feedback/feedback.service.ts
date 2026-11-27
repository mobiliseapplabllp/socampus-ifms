import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// Location ka token login ke saath milta hai (qr-ensure); form aur submit public endpoints hain.
// Business error HTTP 200 + status false ke saath aata hai; rate limit par HTTP 429.
@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private base = environment.url + 'feedback/public/';

  constructor(
    private https: HttpClient
  ) { }

  // Location ka stable feedback token. Admin 'Regenerate QR' kare tabhi badalta hai.
  ensureToken(locId: any): Observable<any> {
    return this.https.post(environment.url + 'feedback/location/qr-ensure', { loc_id: locId });
  }

  getForm(token: string): Observable<any> {
    return this.https.get(this.base + token);
  }

  submit(token: string, body: any): Observable<any> {
    return this.https.post(this.base + token + '/submit', body);
  }
}
