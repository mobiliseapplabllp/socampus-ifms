import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { PmCalService } from 'src/app/provider/pm-cal/pm-cal.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-close-pm',
  templateUrl: './close-pm.component.html',
  styleUrls: ['./close-pm.component.scss'],
})
export class ClosePmComponent  implements OnInit {
  requestedData: any = [];
  myCategory: any = [];
  allRes: any = [];
  loading: any;
  constructor(
    private activeroute: ActivatedRoute,
    private loadingController: LoadingController,
    private common: CommonService,
    private httpPms: PmCalService,
    private router: Router
  ) { }

  ngOnInit() {
    this.activeroute.queryParams.subscribe((res) => {
      this.requestedData = JSON.parse(res['data']);
      console.log(this.requestedData);
    });
  }

  ionViewDidEnter() {
    this.getScheduleUser();
  }

  getScheduleUser() {
    this.presentLoading().then(preLoad => {
      this.httpPms.getScheduleUser(this.requestedData.wo_id).subscribe({
        next:(data) => {
          if (data.status) {
            this.arrangeArr(data.data.categories);
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
    });
  }

  async presentLoading(msg?: string) {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: msg ? msg: 'Please Wait...',
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  arrangeArr(data: any) {
    let outputArr = data.map((item: any) => {
      // Calculate total_length and pending based on the qus array
      let total_length = item.qus.length;
      let action_done = item.qus.filter((q: any) => !(q.status === 0 && q.isDtlShow)).length;

      // Return the new object with total_length and pending
      return {
        ...item,
        total_length: total_length,
        action_done: action_done
      };
    });
    this.allRes = outputArr;
    console.log(outputArr);
  }

  viewQuestion(data: any) {
    data.wo_no = this.requestedData.wo_no
    this.router.navigate(['/pm-calibration/view-report'], {
      queryParams: {
        data: JSON.stringify(data),
      }
    });
  }
}
