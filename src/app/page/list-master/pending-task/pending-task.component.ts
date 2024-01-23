import { Component, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pending-task',
  templateUrl: './pending-task.component.html',
  styleUrls: ['./pending-task.component.scss'],
})
export class PendingTaskComponent  implements OnInit {
  loading: any;
  pendingTask = true;
  stackedChart: any;
  segments = 'helpdesk';
  page = 1;
  pendingTicket: any = [];
  constructor(
    private loadingController: LoadingController,
    private common: CommonService,
    private httpCompalint: ComplaintService
  ) { }

  ngOnInit() {
    this.getPendingTicket();
  }

  changePendingTask() {
    this.presentLoading().then(preLoad => {
      this.pendingTask = !this.pendingTask;
      if (this.pendingTask) {
        this.stackedChart = null;
      } else {
        setTimeout(() => {
          // this.stackedBarChart();
          // this.lineBarChart();
        }, 10);
      }
      this.dismissloading();
    })
  }

  clickCustomSegment(val: string) {
    this.segments = val;
    if (val === 'helpesk' && this.pendingTicket.length === 0) {
      this.getPendingTicket();
    }
    // else if (val === 'digital' && this.assignCheckList.length === 0) {
    //   this.getSchedule(moment().format('YYYY-MM-DD'));
    // } else if (val === 'pms' && this.pmsList.length === 0) {
    //   this.getPendingPms();
    // } else if (val === 'meter' && this.meterInfo.length === 0) {
    //   this.getPendingMeter();
    // }
  }

  myCustom(ev: any) {
    this.page = 1;
    this.pendingTicket = [];
    this.getPendingTicket();
  }


  getPendingTicket() {
    this.httpCompalint.getTicketMaster(null, this.page).subscribe({
      next:(data) => {
        if (data.status) {
          this.page = this.page + 1;
          this.pendingTicket = [...this.pendingTicket, ...data.data.data];
        } else {
          this.common.presentToast(data.msg, 'warning');
        }
      },
      error:() => {
        this.dismissloading();
        this.common.presentToast(environment.errMsg, 'warning');
      },
      complete:() => {
        this.dismissloading();
      }
    });
  }

  loadData(event: any) {
    setTimeout(() => {
      event.target.complete();
    }, 3000);
    this.getPendingTicket();
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...',
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

}
