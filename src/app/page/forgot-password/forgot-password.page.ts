import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { LoginService } from 'src/app/provider/login/login.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
})
export class ForgotPasswordPage implements OnInit {
  empid!: string;
  result: any = [];
  loading!: any;
  isOtpSent!: boolean;
  isNewPass!: boolean;
  newPassword!: string;
  confirmPassword!: string;
  myOtp!: string;
  requestedData: any = [];
  lastNumber!: string;
  otpConfig = {
    length: 4,
    allowNumbersOnly:true,
    inputClass: 'custom-otp-input',
    containerClass: 'custom-otp-container'
  };
  reEnterPass = true;
  reEnterPassCnfm = true;
  pageStatus = 1;
  animation = false;
  constructor(
    private httpLogin: LoginService,
    private httpNotify: CommonService,
    private navCtrl: NavController,
    private common: CommonService) {}

  ngOnInit() {

  }

  sendOtp() {
    this.common.presentLoading().then(preLoad => {
      this.isOtpSent = false;
      this.httpLogin.forgotPass(this.empid).then(res => {
        this.common.dismissloading();
        this.result = res;
        if (this.result === false) {
          this.httpNotify.presentToast(environment.errMsg, 'danger');
        } else {
          if (this.result.status === true) {
            this.isOtpSent = true;
            this.lastNumber = this.result.last_number;
            this.httpNotify.presentToast(this.result.msg, 'success');
          } else if (this.result.status === false) {
            this.httpNotify.presentToast(this.result.msg, 'warning');
          }
        }
      });
    });
  }

  backButton() {
    this.isOtpSent = false;
    this.isNewPass = false
  }

  changeNgOtp(ev: any) {
    this.myOtp = '';
    if (ev.length === 4) {
      this.myOtp = ev;
    }
  }

  validateOtp() {
    this.isNewPass = false;
    this.common.presentLoading().then(preLoad => {
      this.httpLogin.validateOtp(this.empid, this.myOtp).then((res: any) => {
        this.common.dismissloading();
        this.result = res;
        if (this.result === false) {
          this.httpNotify.presentToast(environment.errMsg, 'danger');
        } else {
          if (this.result.status === true) {
            this.httpNotify.presentToast(this.result.msg, 'success');
            this.isNewPass = true;
            // this.myOtp = ev;
          } else if (this.result.status === false) {
            this.httpNotify.presentToast(this.result.msg, 'warning');
          } else if (this.result.status === 'eyJpdiI6Ik1USXpORFUyTnpnNU1UQXhNVEV5TVE100') {
            this.httpNotify.presentToast(this.result.msg, 'success');
            this.isNewPass = true;
            // this.myOtp = ev;
          } else if (this.result.status === 'eyJpdiI6Ik1USXpORFUyTnpnNU1UQXhNVEV5TVE9') {
            this.httpNotify.presentToast(this.result.msg, 'warning');
          }
        }
      });
    });
  }

  popPage() {
    this.navCtrl.pop();
  }

  changePass() {
    this.confirmPassword = '';
  }

  changePassword() {
    this.common.presentLoading().then(preLoad => {
      this.httpLogin.changePassword(this.empid, this.myOtp, this.newPassword).then(res => {
        this.common.dismissloading();
        this.result = res;
        if (this.result === false) {
          this.httpNotify.presentToast(environment.errMsg, 'danger');
        } else {
          if (this.result.status === true) {
            this.httpNotify.presentToast(this.result.msg, 'success');
            // this.navCtrl.pop();
            this.pageStatus = 2;
            setTimeout(() => {
              this.animation = true;
            }, 1200);
          } else {
            this.httpNotify.presentToast(this.result.msg, 'warning');
          }
        }
      });
    });
  }
}
