import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonService } from 'src/app/provider/common/common.service';
import { SplashScreen } from '@capacitor/splash-screen';
import * as moment from 'moment';
import { LoginService } from 'src/app/provider/login/login.service';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-splash',
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss'],
})
export class SplashComponent  implements OnInit {

  constructor(
    private router: Router,
    private common: CommonService,
    private httpLogin: LoginService
  ) { }

  ngOnInit() {
    this.hideSplashScreen();
    this.handleNavigation();
  }

  private hideSplashScreen(): void {
    setTimeout(() => {
      SplashScreen.hide();
    }, 200);
  }

  private handleNavigation(): void {
    setTimeout(async () => {
      const isLogin = localStorage.getItem('isAlreadyLogin');

      if (!isLogin) {
        this.router.navigateByUrl('/login', { replaceUrl: true });
        return;
      }

      const hasInternet = await this.common.checkInternet();

      if (!hasInternet) {
        this.common.presentToast('You are in Offline Mode', 'warning');
        this.router.navigateByUrl('/list-master', { replaceUrl: true });
        return;
      }

      const lastDate = localStorage.getItem('loginDate') || '';

      if (lastDate && this.isWithinLastDays(lastDate)) {
        this.validateLoginSession();
      } else {
        this.clearSessionAndRedirect();
      }

    }, 3300);
  }

  private validateLoginSession(): void {
    this.common.presentLoading().then(() => {
      this.httpLogin.loginPingApi().subscribe({
        next: (data) => {
          if (data.status) {
            this.router.navigateByUrl('/list-master', { replaceUrl: true });
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error: (err: any) => {
          console.log(err);
          if (err.status !== 401) {
            this.clearSessionAndShowError();
            this.router.navigateByUrl('/login', { replaceUrl: true });
          } else {
            this.clearSessionAndShowError();
          }

        },
        complete: () => {
          this.common.dismissloading();
        }
      });
    });
  }

  private clearSessionAndRedirect(): void {
    localStorage.clear();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private clearSessionAndShowError(): void {
    localStorage.clear();
    this.common.dismissloading();
  }

  private isWithinLastDays(date: string): boolean {
    const today = moment().startOf('day');
    const sevenDaysAgo = moment().subtract(7, 'days').startOf('day');
    const givenDate = moment(date).startOf('day');
    return givenDate.isBetween(sevenDaysAgo, today, null, '[]');
  }


  // ngOnInit() {
  //   setTimeout(() => {
  //     SplashScreen.hide();
  //   }, 200);

  //   setTimeout(() => {
  //     const isLogin = localStorage.getItem('isAlreadyLogin');
  //     if (!isLogin) {
  //       this.router.navigateByUrl('/login', { replaceUrl: true });
  //     } else {
  //       this.common.checkInternet().then(res => {
  //         if (res) {
  //           let lastDate = localStorage.getItem('loginDate') || '';
  //           if (lastDate && this.isWithinLastDays(lastDate)) {
  //             this.common.presentLoading().then(preLoad => {
  //               this.httpLogin.loginPingApi().subscribe({
  //                 next:(data) => {
  //                   if (data.status) {
  //                     this.router.navigateByUrl('/list-master', { replaceUrl: true });
  //                   } else {
  //                     this.common.presentToast(data.msg, 'warning');
  //                   }
  //                 },
  //                 error:() => {
  //                   localStorage.clear();
  //                   this.common.dismissloading();
  //                   this.common.presentToast('Error occured in Ping Api`s', 'warning');
  //                 },
  //                 complete:() => {
  //                   this.common.dismissloading();
  //                 }
  //               });
  //             });
  //           } else {
  //             localStorage.clear();
  //             this.router.navigateByUrl('/login', { replaceUrl: true });
  //           }
  //         } else {
  //           this.common.presentToast('You are in Offline Mode', 'warning')
  //           this.router.navigateByUrl('/list-master', { replaceUrl: true });
  //         }
  //       });
  //     }
  //   }, 3300);
  // }

  // isWithinLastDays(date: any) {
  //   const today = moment().startOf('day');
  //   const fourDaysAgo = moment().subtract(7, 'days').startOf('day');
  //   const givenDate = moment(date).startOf('day');
  //   return givenDate.isBetween(fourDaysAgo, today, null, '[]');
  // }


}
