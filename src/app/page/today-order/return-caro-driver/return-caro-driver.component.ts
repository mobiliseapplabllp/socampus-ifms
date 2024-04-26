import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-return-caro-driver',
  templateUrl: './return-caro-driver.component.html',
  styleUrls: ['./return-caro-driver.component.scss'],
})
export class ReturnCaroDriverComponent  implements OnInit {
  loading: any;
  returnDetails: any = [];
  constructor(
    private httpTo: TodayOrderService,
    private loadingController: LoadingController,
    private common: CommonService,
    private router: Router
  ) { }

  ngOnInit() {
    this.getReturnCambro();
  }

  getReturnCambro() {
    this.presentLoading().then(preLoad => {
      this.httpTo.getReturnCambro().subscribe({
        next:(data) => {
          console.log(data);
          if (data.status) {
            this.returnDetails = data.data;
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

  openDetails(dat: any) {
    this.router.navigateByUrl('today-order/return-cmro-driver-detail/' + dat.return_id)
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
