import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonService } from 'src/app/provider/common/common.service';
import { SplashScreen } from '@capacitor/splash-screen';
@Component({
  selector: 'app-splash',
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss'],
})
export class SplashComponent  implements OnInit {

  constructor(
    private router: Router,
    private common: CommonService
  ) { }

  ngOnInit() {
    setTimeout(() => {
      SplashScreen.hide();
    }, 200);

    setTimeout(() => {
      const isLogin = localStorage.getItem('isAlreadyLogin');
      if (!isLogin) {
        this.router.navigateByUrl('/login', { replaceUrl: true });
      } else {
        this.common.checkInternet().then(res => {
          if (res) {
            // this.refreshToken();
            this.router.navigateByUrl('/login', { replaceUrl: true });
          } else {
            this.common.presentToast('You are in Offline Mode', 'warning')
            this.router.navigateByUrl('/list-master', { replaceUrl: true });
          }
        });
      }
    }, 3300);
  }
}
