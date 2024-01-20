import { Component, OnInit } from '@angular/core';
import { liveQuery } from 'dexie';
import { CommonService } from 'src/app/provider/common/common.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { checklist, db } from '../../../provider/local-db/local-db.service';
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
    const arr = [{
      method: 'POST',
      url: 'https://aovsshdashboard.com/Webservices/test_image.php',
      data: this.convertToFormData(dat)
    }];
    this.submitArr(arr, dat);
  }

  submitArr(arr: any, dat: any) {
    this.actionUpdateChecklist(dat.schedule_id, dat)
    this.httpDigi.postDynamicData(arr).subscribe({
      next:(data) => {
        console.log(data);

      },
      error:() => {

      }
    });
  }

  convertToFormData(data: any, formData?: FormData, parentKey?: string): FormData {
    formData = formData || new FormData();
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const value = data[key];
        const currentKey = parentKey ? `${parentKey}[${key}]` : key;
        if (value instanceof File || (value instanceof Blob && typeof value !== 'string')) {
          formData.append(currentKey, value, 'blob');
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

  changeDc() {
    this.checkListSelect = this.checkList.filter((val: any) => val.isSelect);
  }

  submitAllDc() {
    const selectedChecklist = this.checkList.filter((val: any) => val.isSelect);
    console.log(selectedChecklist);
    var output = selectedChecklist.map((item: any) => ({
      method: 'POST',
      url: 'https://aovsshdashboard.com/Webservices/test_image.php',
      data: this.convertToFormData(item)
    }));
    this.httpDigi.postDynamicData(output).subscribe({
      next:(data) => {

      },
      error:(err) => {
        console.log(err);
      },
      complete:() => {}
    });

    var schedule_id, schedule_obj;
    schedule_id = selectedChecklist[0].schedule_id;
    schedule_obj = selectedChecklist[0]
    this.actionUpdateChecklist(schedule_id, schedule_obj);
    console.log(output);
    // this.checkList = this.checkList.filter((val: any) => !val.isSelect);
    // this.changeDc();
    // this.common.presentToast('Checklist Saved to server Successfully', 'success');

  }

  actionUpdateChecklist(schedule_id: any, schedule_obj: any) {
    schedule_obj.schedule_status = 'attended';
    schedule_obj.offline_save = 'false';
    console.log(schedule_id);
    console.log(schedule_obj);
    const updatedData: Partial<checklist> = schedule_obj;
    this.updateCheckList(schedule_id, updatedData);
  }

  updateCheckList(scheduleUniqueId: number, updatedData: Partial<checklist>) {
    console.log(scheduleUniqueId);
    console.log(updatedData);
    return db.checklist
    .where('schedule_id')
    .equals(scheduleUniqueId)
    .first()
    .then((existingRecord) => {
      if (existingRecord) {
        this.checkList = this.checkList.filter((val: any) => val.offline_save == 'true');
        Object.assign(existingRecord, updatedData);
        return db.checklist.put(existingRecord);
      } else {
        throw new Error('Record not found');
      }
    });
  }
}
