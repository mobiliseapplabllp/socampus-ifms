import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ConciergeService } from 'src/app/provider/concierge/concierge.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-conc-history',
  templateUrl: './conc-history.component.html',
  styleUrls: ['./conc-history.component.scss'],
})
export class ConcHistoryComponent  implements OnInit {
  id: any;
  tab: any;
  txnData: any = [];
  constructor(
    private modalCtrl: ModalController,
    private httpConcierge: ConciergeService,
    private common: CommonService
  ) { }

  ngOnInit() {
    this.getSpecificTicket();
  }

  close(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  getSpecificTicket() {
    const obj = {
      tab: this.tab,
      tckt: this.id,
    }
    this.common.presentLoading().then(preLoad => {
      this.httpConcierge.getSpecificTicket(obj).subscribe({
        next:(data: any) => {
          if (data.status) {
            this.txnData = data.data.txnData;
          } else {
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error:() => {
          this.common.presentToast(environment.errMsg, 'danger');
          this.common.dismissloading();
        },
        complete:() => {
          this.common.dismissloading();
        }
      });
    })
  }

  attachment(url: any, type: string) {
    this.common.openImg(url, type);
  }

}
