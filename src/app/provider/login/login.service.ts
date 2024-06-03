import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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

  LoginAuth(login: any) {
    return new Promise(resolve => {
      const obj = {
        username: login.userid,
        password: login.password
      }
      this.https.post(environment.url + 'login' , obj).subscribe({
        next:(data) => {
          this.userDataTemp = data;
          console.log(this.userDataTemp);
          if (this.userDataTemp.status) {
            this.userData = this.userDataTemp.user;
            console.log(this.userData);
            this.username.next(this.userData);
          }
          resolve(data);
        },
        error:(error) => {
          if (error.status == 403) {
            this.common.presentToast(error.error.msg, 'warning');
            resolve(null);
          } else {
            resolve(false);
          }
        },
        complete:() => {

        }
      });
    });
  }

  getUserDataObs() {
    return this.username;
  }

  getLoginUserValue() {
    return this.userData;
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
}
