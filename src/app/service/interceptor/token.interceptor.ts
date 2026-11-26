import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpHeaders,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { App } from '@capacitor/app';
import { environment } from 'src/environments/environment';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  constructor(
    private router: Router,
    public alertController: AlertController) {
    }

    // if (!localStorage.getItem('token1')) {
    //   const mod = request.clone({
    //     headers: request.headers.set('Referer1', environment.ssoUrl)
    //   })
    //   return next.handle(mod);
    // } else {
    //   const userToken = localStorage.getItem('token1');
    //   const modifiedReq = request.clone({headers: request.headers.set('Authorization', `Bearer ${userToken}`).set('Accept', 'application/json').set('Referer1', environment.ssoUrl)});
    //   return next.handle(modifiedReq).pipe(tap(() => {},
    //     (err: any) => {
    //     if (err instanceof HttpErrorResponse) {
    //       if (err.status !== 401) {
    //        return;
    //       }
    //       localStorage.clear();
    //       this.router.navigateByUrl('/');
    //     }
    //   }));
    // }


  // FMS: Bearer token2. SSO validate wali call me abhi token2 hota hi nahi —
  // wo handoff token body me bhejti hai, isliye usme Authorization nahi lagate.
  private withFmsHeaders(request: HttpRequest<any>): HttpRequest<any> {
    const fmsToken = localStorage.getItem('token2');
    let headers = request.headers.set('Accept', 'application/json');
    if (fmsToken && request.url !== environment.fmsUrl + 'api/sso/embassy/validate') {
      headers = headers.set('Authorization', `Bearer ${fmsToken}`);
    }
    return request.clone({ headers });
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // AI Studio is a third party API - it has its own X-API-Key, so do not leak
    // our Authorization/Referer1 headers to it (they also break CORS preflight).
    // web par URL cors-proxy prefix ke saath aata hai, isliye startsWith nahi - includes
    if (request.url.includes(environment.aiStudioUrl)) {
      return next.handle(request);
    }
    // Space Management (FMS) — alag backend, alag token (embassy jaisa).
    // FMS par sirf Bearer token2 jaata hai, token1 / Referer1 nahi.
    if (request.url.startsWith(environment.fmsUrl)) {
      return next.handle(this.withFmsHeaders(request));
    }
    if (!localStorage.getItem('token1')) {
      const mod = request.clone({
        headers: request.headers.set('Referer1', environment.referUrl).set('X-API-Source', 'Mobile')
      })
      return next.handle(mod);
    } else {
      const userToken = localStorage.getItem('token1');
      const modifiedReq = request.clone({headers: request.headers.set('Authorization', `Bearer ${userToken}`).set('Accept', 'application/json').set('Referer1', environment.referUrl).set('X-API-Source', 'Mobile')});
      return next.handle(modifiedReq).pipe(tap(() => {},
        (err: any) => {
        if (err instanceof HttpErrorResponse) {
          if (err.status !== 401) {
          return;
          }
          alert('Your Session is timeout please login again');
          this.router.navigateByUrl('/login',{replaceUrl: true});
        }
      }));
    }
  }

  async presentAlert() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'You Login on Mobile Or Desktop',
      buttons: [{
        text: 'Okay',
        handler: () => {

        }
      }]
    });
    await alert.present();
  }
}