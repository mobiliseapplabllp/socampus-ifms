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


  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!localStorage.getItem('token1')) {
      const mod = request.clone({
        headers: request.headers.set('Referer1', environment.referUrl)
      })
      return next.handle(mod);
    } else {
      if (request.url == 'https://translate.googleapis.com/language/translate/v2?key=AIzaSyDJjHphpheVQM7CRYNqHHdJqMqAgt0IY70') {
        const userToken = localStorage.getItem('token1');
        const modifiedReq = request.clone({headers: request.headers.set('Accept', 'application/json').set('Referer1', 'http://localhost:8100/')});
        return next.handle(modifiedReq).pipe(tap(() => {},
          (err: any) => {
          if (err instanceof HttpErrorResponse) {
            if (err.status !== 401) {
            return;
            }
            localStorage.clear();
            alert('Your Session is timeout please login again');
            this.router.navigateByUrl('/login',{replaceUrl: true});
          }
        }));
      } else {
        const userToken = localStorage.getItem('token1');
        const modifiedReq = request.clone({headers: request.headers.set('Authorization', `Bearer ${userToken}`).set('Accept', 'application/json').set('Referer1', environment.referUrl)});
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
