import { Component, OnInit } from '@angular/core';
import { CommonService } from 'src/app/provider/common/common.service';
import { db } from '../../provider/local-db/local-db.service';
import { liveQuery } from 'dexie';
import { AlertController, ModalController, Platform,  } from '@ionic/angular';
import { Router } from '@angular/router';
import { SosComponent } from './sos/sos.component';
import { App } from '@capacitor/app';
@Component({
  selector: 'app-list-master',
  templateUrl: './list-master.page.html',
  styleUrls: ['./list-master.page.scss'],
})
export class ListMasterPage implements OnInit {
  userData: any = [];
  userName!: string;
  eventChange = false;
  didEnter = false;
  isLoading!: boolean;
  isInternet!: boolean;
  DGArr: any = [];
  subs: any;
  count = 0;
  appUpdate: any = {};
  currentVersion!: string;
  isAndroid!: boolean;
  constructor(
    private common: CommonService,
    private alertController: AlertController,
    private router: Router,
    private modalCtrl: ModalController,
    private platform: Platform) {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      this.userName = this.userData.user_name
    }
  }

  ngOnInit(): void {
    this.common.getAppVersionObs().subscribe(data => {
      this.appUpdate = data;
      console.log(this.appUpdate);
      if (this.platform.is('android')) {
        this.isAndroid = true;
        App.getInfo().then(res => {
          const curVersion = res.version.toString();
          this.currentVersion = curVersion.toString();
          if (this.appUpdate.is_view && this.appUpdate.forceupdate && (this.appUpdate.vesrion !== this.currentVersion)) {
            this.downloadApp(this.appUpdate.url);
            // this.common.presentToast('Please Update your App', 'warning');
          }
        });
      }
    });
  }

  downloadApp(url: string) {
    if (url){
      this.common.presentToast('Please install latest application', 'secondary');
      this.common.openDoc(url);
    } else {
      this.common.presentToast('Download URL not found', 'warning');
    }

  }

  ionViewWillEnter() {
    this.subs = this.common.getHomeLoadStatus().subscribe(val => {
      console.log(val);
      if (val) {
        this.changeEvent();
      }
    });
    this.didEnter = true;
    setTimeout(() => {
      this.subs.unsubscribe();
      this.didEnter = false;
    }, 1500);
    this.getHomeLoad();
  }

  getHomeLoad() {
    this.common.checkInternet().then(res => {
      if (res) {
        this.isInternet = true;
        this.getOffLineCheckList();
      } else {
        this.isInternet = false
      }
    });
  }

  async getOffLineCheckList() {
    const friendsObservable = liveQuery (() => db.checklist.where({offline_save: "true"}).toArray());
    const sub = friendsObservable.subscribe({
      next:(data) => {
        this.DGArr = data;
        if (this.DGArr.length > 0 && this.count == 0) {
          this.count = 1;
          this.presentAlertConfirm();
        }
        setTimeout(() => {
          sub.unsubscribe();
        }, 1000);
      }
    });
  }

  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Offline Data',
      message: 'You have some offline Data Save, do you want to push to server',
      mode: 'ios',
      buttons: [{
        text: 'Cancel',
          handler: (data) => {
            console.log("Cancel");
          }
        },{
          text: 'YES',
          handler: (data) => {
            this.openPageRoute();
          }
        }]
    });
    await alert.present();
  }

  changeEvent() {
    this.eventChange = true;
    this.isLoading = true;
    setTimeout(() => {
      this.eventChange = false;
      this.isLoading = false;
      this.common.setHomeLoadStatus(false);
    }, 1500);
  }


  handleRefresh(event: any) {
    event.target.complete();
    this.isLoading = true;
    this.getHomeLoad();
    this.changeEvent();
  }

  openPageRoute() {
    this.router.navigateByUrl('/list-master/offline-data');
  }

  async openSosModal() {
    const modal = await this.modalCtrl.create({
      component: SosComponent,
      // cssClass: 'my-modal',
      componentProps: { }
    });
    modal.present();
  }

}
