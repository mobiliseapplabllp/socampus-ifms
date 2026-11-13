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
  punchStatus = new BehaviorSubject(false);
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
            // this.setPunchStatus(this.userDataTemp.current_punch_status);
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


  setPunchStatus(status: boolean) {
    console.log('status', status);
    this.punchStatus.next(status);
  }

  getPunchStatus() {
    return this.punchStatus.asObservable();
  }


  ssoGatesLoginDetails(data: any, fcm_token: string, appVersion: string, isAndroid: boolean): Observable<any> {
    let param: any = new HttpParams();
    param = param.append('data', data);
    param = param.append('fcm_token', fcm_token);
    param = param.append('source', environment.source);
    param = param.append('app_version', appVersion);
    param = param.append('is_android', isAndroid);
    param = param.append('version', '1'); // 13 Nov, 26 android (6.1) ios(4.2.8)
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

  /**
   * Punch In ki ijazat - backend `punch_allowed: true/false` deta hai (ssoGatesLoginDetails
   * ke user me aur login_ping me, wahi jagah jahan current_punch_status aata hai).
   * SIRF saaf `false` par band. Key na ho (purana backend / dev OTP login), null ho,
   * true ho - sab me button chalu rehta hai.
   */
  isPunchAllowed(user: any): boolean {
    const v = user?.punch_allowed;
    return !(v === false || v === 'false' || v === 0 || v === '0');
  }

  /**
   * login_ping se aayi punch_allowed ko saved user me daal do aur subject fire karo,
   * taaki side menu ka button bina app restart ke badal jaaye. Key aayi hi na ho to
   * kuch mat chhedo - purani value hi sach hai.
   */
  applyPunchAllowed(data: any): void {
    if (!data || !('punch_allowed' in data)) {
      return;
    }
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (!user || typeof user !== 'object') {
        return;
      }
      user.punch_allowed = data.punch_allowed;
      localStorage.setItem('user', JSON.stringify(user));
      this.username.next(user);
    } catch (e) {
      console.error('applyPunchAllowed', e);
    }
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
    return this.https.post(environment.url + 'complaints/app/get-fcm-push-notification-list', date);
  }
}
