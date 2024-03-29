import { Component, OnInit } from '@angular/core';
import { liveQuery } from 'dexie';
import { CommonService } from 'src/app/provider/common/common.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { checklist, db } from '../../../provider/local-db/local-db.service';
import { environment } from 'src/environments/environment';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
@Component({
  selector: 'app-offline-data',
  templateUrl: './offline-data.component.html',
  styleUrls: ['./offline-data.component.scss'],
})
export class OfflineDataComponent  implements OnInit {
  status = 'dc';
  checkList: any = [];
  checkListSelect: any = [];
  loading: any;
  constructor(
    private common: CommonService,
    private httpDigi: DigitalChecklistService,
    private loadingController: LoadingController,
    private httpDigital: DigitalChecklistService,
    private navCtrl: NavController,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.getOffLineCheckList();
  }

  changeSegment(ev: any) {
    console.log(ev.target.value);
  }

  async getOffLineCheckList() {
    const friendsObservable = liveQuery (() => db.checklist.where({offline_save: "true"}).toArray());
    const sub = friendsObservable.subscribe({
      next:(data) => {
        this.checkList = data;
        setTimeout(() => {
          sub.unsubscribe();
        }, 1000);
      }
    });
  }

  submitDc(dat: any) {
    const formData = this.convertToFormData(dat);
    this.presentLoading().then(preLoad => {
      this.httpDigital.finalSubmitCheckList(formData).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            dat.schedule_status = 'attended'
            dat.offline_save = "false"
            console.log(dat);
            this.actionUpdateChecklist(dat);
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
    });
  }

  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Danger',
      message: 'If you have clean DB your submitted checklist will destroy please make sure your all Local submitted checklist uploaded to server',
      mode: 'ios',
      buttons: [{
        text: 'Cancel',
          handler: (data) => {
            console.log("Cancel");
          }
        },{
          text: 'YES',
          handler: (data) => {
            this.cleanDb();
          }
        }]
    });
    await alert.present();
  }


  cleanDb() {
    this.common.presentToast('Digital Checklist is Reset', 'success');
    db.checklist.clear();
    this.navCtrl.pop();
  }


  changeDc() {
    this.checkListSelect = this.checkList.filter((val: any) => val.isSelect);
  }

  submitAllDc() {
    const selectedChecklist = this.checkList.filter((val: any) => val.isSelect);
    var output = selectedChecklist.map((item: any) => ({
      method: 'POST',
      url: environment.url + 'digicheck/offlineapp/saveAllPendingChecklist',
      data: this.convertToFormData(item)
    }));
    this.presentLoading().then(preLoad => {
      this.httpDigi.postDynamicData(output).subscribe({
        next:(data) => {
          for (var i = 0; i < data.length;i++) {
            if (data[i].status) {
              selectedChecklist[i].offline_save = 'false';
              selectedChecklist[i].schedule_status = 'attended';
              const updateData = selectedChecklist[i];
              this.actionUpdateChecklist(updateData);
            } else {
              this.common.presentToastWithOk(data[i].msg, 'warning');
            }
          }
        },
        error:(err) => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      });
    })
  }

  actionUpdateChecklist(dat: any) {
    const updatedData: Partial<checklist> = dat;
    this.updateCheckList(dat.schedule_id, updatedData);
  }

  updateCheckList(scheduleUniqueId: number, updatedData: Partial<checklist>) {
    return db.checklist.where('schedule_id').equals(scheduleUniqueId).first().then((existingRecord) => {
      if (existingRecord) {
        Object.assign(existingRecord, updatedData);
        this.checkList = this.checkList.filter((val: any) => val.schedule_id !== scheduleUniqueId);
        return db.checklist.put(existingRecord);
      } else {
        throw new Error('Record not found');
      }
    });
  }

  convertToFormData(data: any, formData?: FormData, parentKey?: string): FormData {
    formData = formData || new FormData();
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const value = data[key];
        const currentKey = parentKey ? `${parentKey}[${key}]` : key;
        let random = Date.now() + Math.floor(Math.random() * 90000) + 10000 + '.jpg'
        if (value instanceof File || (value instanceof Blob && typeof value !== 'string')) {
          formData.append(currentKey, value, random);
        } else if (Array.isArray(value)) {
          value.forEach((arrayItem, index) => {
            const arrayItemKey = `${currentKey}[${index}]`;
            this.convertToFormData(arrayItem, formData, arrayItemKey);
          });
        } else if (typeof value === 'object' && value !== null) {
          this.convertToFormData(value, formData, currentKey);
        } else {
          formData.append(currentKey, value);
        }
      }
    }
    return formData;
  }

  async presentLoading(msg?: string) {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please Wait...',
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }
}
