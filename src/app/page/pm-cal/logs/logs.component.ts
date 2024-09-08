import { Component, OnInit } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { PmCalService } from 'src/app/provider/pm-cal/pm-cal.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.scss'],
})
export class LogsComponent  implements OnInit {
  data: any;
  loading: any;
  List: any = [];
  constructor(
    private modalCtrl: ModalController,
    private httpPm: PmCalService,
    private loadingController: LoadingController,
    private common: CommonService
  ) { }

  ngOnInit() {
    this.getPpmPending();
  }

  getPpmPending() {
    this.presentLoading().then(preLoad => {
      this.httpPm.PpmPtwApproval(this.data.id).subscribe({
        next:(data) => {
          if (data.status) {
            this.List = data.data
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

  openDoc(url: string) {
    this.common.openDoc(url);
  }

  close(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...'
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

}
