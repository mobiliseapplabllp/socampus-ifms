import { Component, OnInit } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { stat } from 'fs';
import { Observable } from 'rxjs';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-ckms-site',
  templateUrl: './ckms-site.component.html',
  styleUrls: ['./ckms-site.component.scss'],
})
export class CkmsSiteComponent  implements OnInit {
  loading: any;
  CkmsSiteArr: any = [];
  CkmsSiteArrCopy: any = [];
  constructor(
    private httpTodayOrder: TodayOrderService,
    private loadingController: LoadingController,
    private common: CommonService,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.getCksmSite();
  }

  getCksmSite() {
    this.presentLoading().then(preLoad => {
      this.httpTodayOrder.getCkmsSite().subscribe({
        next:(data) => {
          console.log(data);
          if (data.status) {
            this.CkmsSiteArr = data.data;
            this.CkmsSiteArrCopy = data.data;
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

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status)
  }

  search(ev: any) {
    let val: any;
    console.log(ev.target.value);
    val = ev.target.value;
    this.CkmsSiteArr = this.CkmsSiteArrCopy;
    if (val && val.trim() !== '') {
      this.CkmsSiteArr = this.CkmsSiteArr.filter((dat: any) => {
        if ((dat.label.toLowerCase().indexOf(val.toLowerCase()) > -1)) {
          return (dat.label.toLowerCase().indexOf(val.toLowerCase()) > -1);
        }
        return
      });
    }
  }

  async presentLoading(msg?: any) {
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
