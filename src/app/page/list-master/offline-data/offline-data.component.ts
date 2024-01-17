import { Component, OnInit } from '@angular/core';
import { db } from '../../../provider/local-db/local-db.service';
import { liveQuery } from 'dexie';
import { CommonService } from 'src/app/provider/common/common.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';

@Component({
  selector: 'app-offline-data',
  templateUrl: './offline-data.component.html',
  styleUrls: ['./offline-data.component.scss'],
})
export class OfflineDataComponent  implements OnInit {
  status = 'dc';
  checkList: any = [];
  checkListSelect: any = [];
  constructor(
    private common: CommonService,
    private httpDigi: DigitalChecklistService
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
        console.log(data);
        this.checkList = data;
        setTimeout(() => {
          sub.unsubscribe();
        }, 1000);
      }
    });
  }

  submitDc(dat: any) {
    console.log(dat);
    const a = {
      a:1
    }
    this.httpDigi.submitDummyApi(a).subscribe();
    this.common.presentToast('Checklist Saved to server Successfully', 'success');
    this.checkList = this.checkList.filter((val: any) => val.schedule_id !== dat.schedule_id)

    // this.changeDc();
  }

  changeDc() {
    this.checkListSelect = this.checkList.filter((val: any) => val.isSelect);
    this.httpDigi.submitDummyApi(this.checkListSelect).subscribe();
  }

  submitAllDc() {
    this.checkList = this.checkList.filter((val: any) => !val.isSelect);
    this.changeDc();
    this.common.presentToast('Checklist Saved to server Successfully', 'success');

  }

}
