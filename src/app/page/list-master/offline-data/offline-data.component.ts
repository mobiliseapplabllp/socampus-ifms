import { Component, OnInit } from '@angular/core';
import { liveQuery } from 'dexie';
import { CommonService } from 'src/app/provider/common/common.service';
import { DigitalChecklistService } from 'src/app/provider/digital-checklist/digital-checklist.service';
import { checklist, db } from '../../../provider/local-db/local-db.service';
import { environment } from 'src/environments/environment';
import { AlertController, NavController } from '@ionic/angular';
import { Router } from '@angular/router';
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
    private httpDigital: DigitalChecklistService,
    private navCtrl: NavController,
    private alertController: AlertController,
    private router: Router
  ) { }

  ngOnInit() {
    this.getOffLineCheckList();
  }

  changeSegment(ev: any) {
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
    const payload = this.buildPayloadForFinalSubmit(dat);
    const formData = this.convertToFormData(payload);
    this.common.presentLoading().then(preLoad => {
      this.httpDigital.finalSubmitCheckList(formData).subscribe({
        next:(data) => {
          if (data.status) {
            this.common.presentToast(data.msg, 'success');
            dat.schedule_status = 'attended'
            dat.offline_save = "false"
            this.actionUpdateChecklist(dat);
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    });
  }

  private buildPayloadForFinalSubmit(root: any): any {
    return {
      schedule_id: root.schedule_id,
      schedule_unique_id: root.schedule_unique_id,
      pc_id: root.pc_id,
      loc_id: root.loc_id,
      chk_cat_id: root.chk_cat_id,
      chk_cat_name: root.chk_cat_name,
      schedule_date: root.schedule_date,
      schedule_status: root.schedule_status,
      offline_save: root.offline_save,
      final_remark: root.final_remark,
      base64_sign: root.base64_sign,
      fill_date_time: root.fill_date_time,
      submitted_date: root.submitted_date,
      user: root.user,
      barcode: root.barcode,
      scheduler_id: root.scheduler_id,
      ticket_id: root.ticket_id,
      qus: (root.qus || []).map((q: any) => this.mapQuestionForSubmitPayload({ ...q })),
    };
  }

  private mapQuestionForSubmitPayload(q: any): any {
    const kind = this.inferQuestionKind(q);
    if (kind === 'date' || kind === 'datetime' || kind === 'number' || kind === 'temperature' || kind === 'shorttext') {
      if (q.q_value != null && q.q_value !== '') {
        q.rspns = q.q_value;
      }
    } else if (kind === 'attachment' || kind === 'video') {
      // Attachment/Video questions: the file itself is the answer, so send it under `rspns`
      // and do NOT carry `imagename` (which is reserved for the optional extra IMG row on other types).
      q.rspns = q.imagename;
    }
    const trimmed: any = {
      q_desc: q.q_desc,
      q_id: q.q_id,
      q_type: q.q_type,
      question_type: q.question_type,
      cat_id: q.cat_id,
      q_max_score: q.q_max_score,
      remark: q.remark,
      rspns: q.rspns,
    };
    // Non file-type questions may still carry an optional extra attachment in `imagename`.
    if (kind !== 'attachment' && kind !== 'video') {
      trimmed.imagename = q.imagename;
    }
    if (q.attach_ext != null) {
      trimmed.attach_ext = q.attach_ext;
    }
    return trimmed;
  }

  private inferQuestionKind(val: any): string {
    const t = (val?.question_type || '').toString().trim().toLowerCase();
    if (t.includes('date time') || t.includes('datetime')) { return 'datetime'; }
    if (t.includes('date')) { return 'date'; }
    if (t.includes('video')) { return 'video'; }
    if (t.includes('attachment')) { return 'attachment'; }
    if (t.includes('temperature')) { return 'temperature'; }
    if (t.includes('short text')) { return 'shorttext'; }
    if (t.includes('decimal') || (t.includes('number') && !t.includes('phone'))) { return 'number'; }
    if (t.includes('option')) { return 'option'; }
    const map: Record<string, string> = {
      '315': 'video', '225': 'attachment', '229': 'date', '313': 'datetime',
      '316': 'number', '314': 'temperature', '308': 'shorttext', '226': 'option',
    };
    return map[String(val?.q_type ?? '')] ?? 'option';
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

  openPageUrl(data: any) {
    this.router.navigate(['/digital-checklist/fill-report/'], {
      queryParams: {
        schedule_id: data.schedule_id
      }
    });
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
      data: this.convertToFormData(this.buildPayloadForFinalSubmit(item))
    }));
    this.common.presentLoading().then(preLoad => {
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
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading();
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
        if (key === 'attach_ext') {
          continue;
        }
        const value = data[key];
        const currentKey = parentKey ? `${parentKey}[${key}]` : key;
        const randomBase = Date.now() + Math.floor(Math.random() * 90000) + 10000;
        if (value instanceof File || (value instanceof Blob && typeof value !== 'string')) {
          const isQuestionFileField = key === 'rspns' || key === 'imagename';
          const ext = isQuestionFileField && (data as any).attach_ext ? (data as any).attach_ext : '.jpg';
          formData.append(currentKey, value, randomBase + ext);
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
}
