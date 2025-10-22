import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CommonService } from '../common/common.service';
@Injectable({
  providedIn: 'root'
})
export class LoginService {
  userDataTemp: any = [];
  username = new BehaviorSubject([]);
  userData: any = [];
  constructor(
    private https: HttpClient,
    private common: CommonService
  ) { }

  uploadVideo(formData: any): Observable<any> {
    return this.https.post('https://socampus-8db369a81c0c.herokuapp.com/https://backend.demosocampus.mobilisepro.com/upload-video', formData);
  }

  LoginAuth(login: any, fcmToken: any) {
    return new Promise(resolve => {
      const obj = {
        username: login.userid,
        password: login.password,
        fcm_token: fcmToken,
        source: environment.source
      }
      this.https.post(environment.url + 'login_with_otp' , obj).subscribe({
        next:(data) => {
          this.userDataTemp = data;
          if (this.userDataTemp.status) {
            this.userData = this.userDataTemp.user;
            this.username.next(this.userData);
          }
          resolve(data);
        },
        error:(err) => {
          if (err.status === 403) {
            this.common.presentToast(err.error.msg, 'warning');
            resolve(null)
          } else {
            resolve(false);
          }
        },
        complete:() => {

        }
      });
    });
  }

  ssoGatesLoginDetails(data: any, fcm_token: string, appVersion: string, isAndroid: boolean): Observable<any> {
    let param: any = new HttpParams();
    param = param.append('data', data);
    param = param.append('fcm_token', fcm_token);
    param = param.append('source', environment.source);
    param = param.append('app_version', appVersion);
    param = param.append('is_android', isAndroid);
    return this.https.get(`${environment.url}ssoGatesLoginDetails`,{
      params: param,
    });
  }

  verifyOtp(formData: any): Observable<any> {
    return this.https.post(environment.url + 'verify_login_otp', formData);
  }


  getAppVersion(platform: string): Observable<any> {
    const obj = {
      platform: platform,
      req_for: 'nServiceApp'
    }
    return this.https.post(environment.url + 'app_version', obj)
  }


  getUserDataObs() {
    return this.username;
  }

  getLoginUserValue() {
    return this.userData;
  }

  refreshToken(): Observable<any> {
    return this.https.get(environment.url + 'refresh');
  }

  logout(ips: string): Observable<any> {
    const obj = {
      ip: ips,
      source: environment.source
    }
    return this.https.post(environment.url + 'logout', obj);
  }

  loginPingApi(): Observable<any> {
    return this.https.get(environment.url + 'login_ping');
  }

  changePassword(userid: any, otp1: any, pass: any ) {
    return new Promise(resolve => {
      this.https.post(environment.url + 'change_password_otp', {user_id: userid, otp: otp1, password: pass, cpassword: pass }).subscribe({
        next:(data)=> {
          resolve(data);
        },
        error:() => {
          resolve(false);
        }
      });
    });
  }

  forgotPass(userid: any) {
    return new Promise(resolve => {
      this.https.post(environment.url + 'send_otp', {username: userid}).subscribe({
        next:(data) => {
          resolve(data);
        },
        error:() => {
          resolve(false);
        }
      });
    });
  }

  validateOtp(userid: any, otp1: any) {
    return new Promise(resolve => {
      this.https.post(environment.url + 'validate_otp', {user_id: userid, otp: otp1}).subscribe({
        next:(data) => {
          resolve(data);
        },
        error:() => {
          resolve(false);
        }
      });
    });
  }

  getNotification(date : any): Observable<any> {
    return this.https.post(environment.url + 'complaints/app/get-fcm-push-notification-list',date);
  }
}
