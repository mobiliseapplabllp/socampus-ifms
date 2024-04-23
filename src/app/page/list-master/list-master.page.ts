import { Component, OnInit } from '@angular/core';
import { CommonService } from 'src/app/provider/common/common.service';
import { db } from '../../provider/local-db/local-db.service';
import { liveQuery } from 'dexie';
import { AlertController,  } from '@ionic/angular';
import { Router } from '@angular/router';
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
  constructor(
    private common: CommonService,
    private alertController: AlertController,
    private router: Router) {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      this.userName = this.userData.user_name
    }
  }

  ngOnInit(): void {
    // this.changeEvent();

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
        this.common.setBarcode('');
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
}
