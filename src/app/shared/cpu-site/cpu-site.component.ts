import { Component, OnInit } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-cpu-site',
  templateUrl: './cpu-site.component.html',
  styleUrls: ['./cpu-site.component.scss'],
})
export class CpuSiteComponent  implements OnInit {
  loading: any;
  allCpuSite: any = [];
  allCpuSiteCopy: any = [];
  constructor(
    private httpComplaint: ComplaintService,
    private loadingController: LoadingController,
    private common: CommonService,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.getCpuSite();
  }

  getCpuSite() {
    this.presentLoading().then(preLoad => {
      this.httpComplaint.getCpuSite().subscribe({
        next:(data) => {
          if (data.status) {
            this.allCpuSite = data.data;
            this.allCpuSiteCopy = data.data;
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

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  search(ev: any) {
    this.allCpuSite = this.allCpuSiteCopy;
    if (ev.target.value && ev.target.value.trim() !== '') {
      this.allCpuSite = this.allCpuSite.filter((dat: any) => {
        if ((dat.label.toString().toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1)) {
          return (dat.label.toString().toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1);
        }
        return
      });
    }
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
