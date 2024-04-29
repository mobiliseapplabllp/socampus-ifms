import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  id: any;
  type!: string
  constructor(
    private httpTo: TodayOrderService,
    private loadingController: LoadingController,
    private common: CommonService,
    private router: Router,
    private activeRoute: ActivatedRoute,
  ) { }

  ngOnInit() {
    this.id = this.activeRoute.snapshot.paramMap.get('id'); // id == 1 for driver dispatch and 2 for CPU
    let type: string;
    if (this.id === '1') {
      this.type = 'driver'
    } else if (this.id === '2') {
      this.type = 'cpu'
    } else {
      this.common.presentToast('InValid ID', 'warning');
      return;
    }
  }

  ionViewDidEnter() {
    if (this.type) {
      this.getReturnCambro(this.type);
    }
  }

  getReturnCambro(type: string) {
    this.presentLoading().then(preLoad => {
      this.httpTo.getReturnCambro(type).subscribe({
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
    this.router.navigateByUrl('today-order/return-cmro-driver-detail/' + dat.return_id + '/' + this.id)
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
