import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import * as moment from 'moment';
import { CommonService } from 'src/app/provider/common/common.service';
import { KeysService } from 'src/app/provider/keys/keys.service';
import { CostCenterComponent } from 'src/app/shared/cost-center/cost-center.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-recover-lost',
  templateUrl: './recover-lost.component.html',
  styleUrls: ['./recover-lost.component.scss'],
})
export class RecoverLostComponent  implements OnInit {
  req_data: any;
  lost_date= moment().format('YYYY-MM-DDTHH:mm'); 
  remark!: string;
  currentDate = moment().format('YYYY-MM-DDTHH:mm');
  
  constructor(
    private modalCtrl: ModalController,
    private httpKey: KeysService,
    private common: CommonService
  ) { }

  ngOnInit() {        
  }

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  submit() {
    if (!this.lost_date) {
      this.common.presentToast('Please Select Date & Time', 'warning');
      return;
    }
    if (!this.remark) {
      this.common.presentToast('Please Enter Remark', 'warning');
      return;
    }
    
    const obj = {
      recovered_at: moment(this.lost_date).toISOString(),
      notes: this.remark
    }
     
    this.common.presentLoading().then(preLoad => {      
      this.httpKey.recoverLostKey(this.httpKey.asgnId(this.req_data), obj).subscribe({
        next:(data: any) => {          
          if (data.status) {
            this.common.presentToast(data.msg || 'Key Recover Successfully', 'success');
            this.closeModal(null,  'true');
          } else {
            this.common.presentToast(data.msg || environment.errMsg, 'warning');
          }
        },
        error:() => {
          this.common.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.common.dismissloading();
        }
      })
    });
  }
}
