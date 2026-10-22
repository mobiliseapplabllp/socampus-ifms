import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { PmCalService } from 'src/app/provider/pm-cal/pm-cal.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-downtime',
  templateUrl: './downtime.component.html',
  styleUrls: ['./downtime.component.scss'],
})
export class DowntimeComponent {
  wo_id: any;
  days: any = '';
  hours: any = '';
  minutes: any = '';
  constructor(
    private modalCtrl: ModalController,
    private common: CommonService,
    private httpPms: PmCalService,
  ) { }

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  save() {
    const values = [this.days, this.hours, this.minutes];
    const isEmpty = (val: any) => val === '' || val === null || val === undefined;
    // web jaisa hi - teeno khaali ho to rokte hain; downtime na ho to 0 daalna hota hai (0/0/0 chalega)
    if (values.every(isEmpty)) {
      this.common.presentToast('Please enter downtime (enter 0 for no downtime)', 'warning');
      return;
    }
    if (values.some((val: any) => !isEmpty(val) && !/^\d+$/.test(String(val)))) {
      this.common.presentToast('Downtime must be a whole number', 'warning');
      return;
    }
    const obj = {
      // server sirf minutes leta hai: 1 day = 1440, 1 hour = 60
      downtime_minutes: (Number(this.days) || 0) * 1440 + (Number(this.hours) || 0) * 60 + (Number(this.minutes) || 0),
      wo_id: this.wo_id,
    };
    this.common.presentLoading().then(preLoad => {
      this.httpPms.saveDowntime(obj).subscribe({
        next: (data: any) => {
          if (data.status) {
            // 'true' par hi pm-report final submit chalata hai - fail par modal khula rehta hai
            this.closeModal(obj, 'true');
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error: () => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          this.common.dismissloading();
        }
      });
    });
  }
}
