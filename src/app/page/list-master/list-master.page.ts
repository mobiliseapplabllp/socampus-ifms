import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ModalController, Platform, ToastController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ListMasterService } from 'src/app/provider/list-master/list-master.service';
import { LoginService } from 'src/app/provider/login/login.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { CambroStatusComponent } from './cambro-status/cambro-status.component';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-list-master',
  templateUrl: './list-master.page.html',
  styleUrls: ['./list-master.page.scss'],
})
export class ListMasterPage implements OnInit {
  myMenu: any = [];
  loading: any;
  subscription: any;
  counter = 0;
  mySlide: any = [
    {id: 'a' , img : '/assets/home_banner1/p1.jpg'},
    {id: 'a' , img : '/assets/home_banner1/p2.jpg'},
    {id: 'a' , img : '/assets/home_banner1/p3.jpg'},
  ];
  userData: any = [];
  result: any = [];
  userName!: string;
  breakdown: any = {};
  pr: any = {};
  indent: any = {};
  slideOptsOne = {
    initialSlide: 0,
    slidesPerView: 1,
    autoplay: true,
  };
  isInternet!: boolean;
  constructor(
    private listMaster: ListMasterService,
    private toastController: ToastController,
    private loginPro: LoginService,
    private loadingController: LoadingController,
    private common: CommonService,
    private router: Router,
    private httpTo: TodayOrderService,
    private modalCtrl: ModalController) {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      this.userName = this.userData.user_name
    }
    // this.checkDeviceTime();
  }

  ngOnInit() {
    // console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (this.isAutomaticDateTimeEnabled()) {
      console.log('correct');
    } else {
      console.log('not correct');
    }
    this.common.checkInternet().then(res => {
      if (res) {
        this.isInternet = true;
        this.common.setBarcode('');
        this.userData = this.loginPro.getLoginUserValue();
        this.getMenuDetail();
        this.getDashboard();
      } else {
        let menu, MENU_TEMP = localStorage.getItem('home_menu');
        if (MENU_TEMP) {
          this.myMenu = JSON.parse(MENU_TEMP);
          this.isInternet = false;
          console.log(menu);
        } else {
          this.common.presentToastWithOk('Menu Icon Not Saved in your Local DB, please connect with internet to save menu in Local DB', 'warning');
        }
      }
    });
  }

  getDashboard() {
    this.listMaster.getDashboard().subscribe(data => {
      console.log(data);
      if (data.status) {
        this.breakdown = data.data.breakdown;
        this.pr = data.data.pms;
        this.indent = data.data.indent
      }
    });
  }

  ionViewWillLeave() {
    this.dismissloading();
  }

  ionViewDidEnter() {
    let bar = this.common.getBarcode();
    if (bar) {
      console.log(bar);
      this.common.setBarcode('');
      this.presentLoading().then(preLoad => {
        this.httpTo.getCambroStatus(bar).subscribe({
          next:(data) => {
            if (data.status) {
              this.openCambroStatus(data.data)
            } else {
              this.common.presentToast(data.msg, 'warning');
            }
          },
          error:() => {
            this.dismissloading();
            this.common.presentToast(environment.errMsg, 'danger');
          },
          complete:() => {
            this.dismissloading();
          }
        });
      })
    }
  }

  async openCambroStatus(data: any) {
    const modal = await this.modalCtrl.create({
      component: CambroStatusComponent,
      cssClass: 'my-modal',
      backdropDismiss:false,
      componentProps: {
        data: data
      }
    });
    modal.onWillDismiss().then(disModal => {
      console.log(disModal);
      if (disModal.role == 'true') {
      }
    });
    modal.present();
  }

  async presentToast() {
    const toast = await this.toastController.create({
      message: 'Press again to exit',
      duration: 3000
    });
    toast.present();
  }

  getMenuDetail() {
    this.presentLoading().then(preLoad => {
      this.listMaster.getMenuDetail().then(data => {
        this.dismissloading();
        this.result = data;
        if (this.result.status == true) {
          this.myMenu = this.result.data[0].submenu;
          if (this.userData.user_type === 'Driver') {
            const obj1 = [{
              icon_path: 'assets/meal/i1.png',
              smnu_desc: 'Order Dispatch',
              link: '/t-order/1'
            }
            // ,{
            //   icon_path: 'assets/meal/i1.png',
            //   smnu_desc: 'Return Cambro',
            //   link: 'today-order/return-cmro-driver/1'
            // }
          ]
            for (var i = 0; i < obj1.length; i++) {
              this.myMenu.push(obj1[i]);
            }
          } else {
            const obj = [{
              icon_path: 'assets/meal/i1.png',
              smnu_desc: 'Order Dispatch',
              link: '/t-order/4'
            },{
              icon_path: 'assets/meal/i2.png',
              smnu_desc: 'Order Received',
              link: '/t-order/2'
            }
            // ,{
            //   icon_path: 'assets/meal/i2.png',
            //   smnu_desc: 'Return Cambro',
            //   link: 'today-order/return-cmro'
            // }
            // ,{
            //   icon_path: 'assets/meal/i2.png',
            //   smnu_desc: 'Receive Cambro CPU',
            //   link: 'today-order/return-cmro-driver/2'
            // }
            ,{
              icon_path: 'assets/meal/i2.png',
              smnu_desc: 'Order Pack',
              link: 'today-order/order-pack'
            }]
            for (var i = 0; i < obj.length; i++) {
              this.myMenu.push(obj[i]);
            }

          }
          localStorage.setItem('home_menu', JSON.stringify(this.myMenu));
        }
      }, err => {
        this.dismissloading();
      });
    });
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...',
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  openPage(data: any) {
    this.common.checkInternet().then(res => {
      if (res) {
        if (data.link == 'not') {
          this.common.presentToast('Not activated yet', 'warning' );
          return;
        }
        this.router.navigateByUrl(data.link);
        return;
      } else {
        console.log(data);
        if (data.smnu_id == 403) {
          this.router.navigateByUrl('/digital-checklist-offline');
        } else {
          this.common.presentToast(data.smnu_desc + ' Not Working on Offline Mode.', 'warning')
        }
      }
    })
  }

  openPageTest(url: string) {
    this.router.navigateByUrl(url);
  }

  openBarcode() {
    this.router.navigateByUrl('/barcode');
  }

  getStoredTimestamp() {
    return localStorage.getItem('storedTimestamp');
  }

  storeTimestamp() {
    const currentTimestamp = new Date().getTime();
    console.log(currentTimestamp);
    localStorage.setItem('storedTimestamp', currentTimestamp.toString());
  }


  checkDeviceTime() {
    const storedTimestamp = this.getStoredTimestamp();
    if (!storedTimestamp) {
        // No stored timestamp, store the current timestamp
        this.storeTimestamp();
        console.log('Stored current timestamp for future reference');
        return;
    }

    const storedTime = new Date(parseInt(storedTimestamp));
    const currentTime = new Date();
    const timeDifference = Math.abs(currentTime.getTime() - storedTime.getTime());

    // Define a threshold (in milliseconds) for allowable time difference
    const allowableDifference = 60000; // 1 minute

    if (timeDifference > allowableDifference) {
        console.log('Device time may have been tampered with');
    } else {
        console.log('Device time appears to be accurate');
    }
  }

  isAutomaticDateTimeEnabled() {
    // Get the current time from the device
    const currentTime = new Date().getTime();
    // Get the time of the last reboot of the device
    const lastRebootTime = performance.timeOrigin

    // Calculate the time difference in milliseconds
    const timeDifference = Math.abs(currentTime - lastRebootTime);

    // Set a threshold to determine if the time difference is significant (e.g., 1 minute)
    const threshold = 60 * 1000; // 1 minute in milliseconds

    // Compare the time difference with the threshold
    return timeDifference < threshold;
  }

}
