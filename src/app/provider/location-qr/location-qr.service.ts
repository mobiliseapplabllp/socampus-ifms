import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LocationQrService {

  constructor(
    private https: HttpClient
  ) { }

  getLocations(obj: any): Observable<any> {
    return this.https.post(environment.url + 'setups/organisation/location-tagging/locations', obj);
  }

  tagQr(obj: any): Observable<any> {
    return this.https.post(environment.url + 'setups/organisation/location-tagging/tag-qr', obj);
  }

  createLocation(obj: any): Observable<any> {
    return this.https.post(environment.url + 'setups/organisation/location-tagging/create-location', obj);
  }
}
