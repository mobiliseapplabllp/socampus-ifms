import { Component, OnInit } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { CkmsSiteComponent } from '../ckms-site/ckms-site.component';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { environment } from 'src/environments/environment';
import { error } from 'console';

@Component({
  selector: 'app-return-cmro',
  templateUrl: './return-cmro.component.html',
  styleUrls: ['./return-cmro.component.scss'],
})
export class ReturnCmroComponent  implements OnInit {
  site_desc!: string;
  site_id!: number;
  loading: any;
  returnCambroArr: any = [];
  constructor(
    private modalCtrl: ModalController,
    private httpToday: TodayOrderService,
    private loadingController: LoadingController,
    private common: CommonService
  ) { }

  ngOnInit() {}

  async openSiteModal() {
    const modal = await this.modalCtrl.create({
      component: CkmsSiteComponent,
      cssClass: 'my-modal',
      backdropDismiss:false,
      componentProps: { }
    });
    modal.onWillDismiss().then(disModal => {
      console.log(disModal);
      if (disModal.role) {
        this.site_desc = disModal.data.label;
        this.site_id = disModal.data.value;
      }
    });
    modal.present();
  }

  search() {
    if(!this.site_id) {
      this.common.presentToast('Please Select Site', 'warning');
      return;
    }
    this.presentLoading().then(preLoad => {
      this.returnCambroArr = [];
      this.httpToday.getReturnCmbroData(this.site_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.returnCambroArr = data.data
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
      })
    })
  }

  return(data: any) {
    this.presentLoading().then(preLoad => {
      this.httpToday.returnAction(data).subscribe({
        next:(data: any) => {
          console.log(data);
          if (data.status) {
            this.returnCambroArr = this.returnCambroArr.filter((val: any) => val.cambro_id !== data.cambro_id);
            this.common.presentToast(data.msg, 'success');
          } else {
            this.common.presentToast(data.msg, 'danger');
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete:() => {
          this.dismissloading();
        }
      })
    })

  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please Wait...',
      duration: 8000
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

}
