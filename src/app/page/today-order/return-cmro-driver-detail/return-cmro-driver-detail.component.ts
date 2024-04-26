import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { CommonService } from 'src/app/provider/common/common.service';
import { TodayOrderService } from 'src/app/provider/today-order/today-order.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-return-cmro-driver-detail',
  templateUrl: './return-cmro-driver-detail.component.html',
  styleUrls: ['./return-cmro-driver-detail.component.scss'],
})
export class ReturnCmroDriverDetailComponent  implements OnInit {
  id: any;
  cambroList: any  = [];
  loading: any;
  constructor(
    private activeRoute: ActivatedRoute,
    private httpTo: TodayOrderService,
    private common: CommonService,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
    this.id = this.activeRoute.snapshot.paramMap.get('id');
    console.log(this.id);
    this.getCambroReturnDetails();
  }

  getCambroReturnDetails() {
    this.presentLoading().then(preLoad => {
      this.httpTo.getReturnCambroDetails(this.id).subscribe({
        next:(data) => {
          if (data.status) {
            this.cambroList = data.data;
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

  dispathCambro(){
    this.presentLoading().then(preLoad => {
      this.httpTo.dispatchCambro(this.id).subscribe({
        next:(data) => {
          console.log(data);
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


}
