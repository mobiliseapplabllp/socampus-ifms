import { Component, OnInit, ViewChild } from '@angular/core';
import { IonDatetime, LoadingController } from '@ionic/angular';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import Chart from 'chart.js/auto';
import * as moment from 'moment';
import { CommonService } from 'src/app/provider/common/common.service';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-chart-dashboard',
  templateUrl: './chart-dashboard.component.html',
  styleUrls: ['./chart-dashboard.component.scss'],
})
export class ChartDashboardComponent  implements OnInit {
  @ViewChild('popoverDatetime')  popoverDatetime!: IonDatetime;
  scheduleDashboard: any = [];
  cat_id = 'digital';
  sub_cat_id = 'hard';
  stackedChart: any;
  lineChart: any;
  category = [{
    label: 'Digital',
    id: 1,
    value: 'digital'
  },{
    label: 'PMS',
    id: 2,
    value: 'pms'
  },{
    label: 'Meter',
    id: 3,
    value: 'meter'
  }];
  digitalCat = [{
    label: 'Hard',
    id:1,
    value: 'hard'
  },{
    label: 'Soft',
    id:2,
    value: 'soft'
  }];
  meterCat = [{
    label: 'Consumption',
    id: 1,
    value: 'consumption',
  },{
    label: 'Generation',
    id: 2,
    value: 'generation',
  }];
  subCat = this.digitalCat;
  helpDeskDateLabe!: string;
  scheduleDateLabel!: string;

  loading: any ;
  todayDate = moment().format('YYYY-MM-DD');
  scheduleDate = moment().format('YYYY-MM-DD');
  constructor(
    private httpCompalint: ComplaintService,
    private loadingController: LoadingController,
    private common: CommonService
  ) { }

  ngOnInit() {
    this.getTicketDashboard(this.todayDate);
    this.getScheduleDashboard(this.scheduleDate,this.cat_id, this.sub_cat_id);
  }

  changeDateComponent(ev: any) {
    this.popoverDatetime.confirm(true);
    let date = moment(ev.detail.value).format('YYYY-MM-DD');
    this.todayDate = date;
    this.getTicketDashboard(date);
  }

  changeDate(type: number) {
    if (type === 0) {
      this.todayDate = moment(this.todayDate).subtract(1, 'day').format('YYYY-MM-DD');
      this.getTicketDashboard(this.todayDate);
    } else {
      this.todayDate = moment(this.todayDate).add(1, 'day').format('YYYY-MM-DD');
      this.getTicketDashboard(this.todayDate);
    }
  }

  changeCat() {
    if (this.cat_id === 'pms') {
      this.getScheduleDashboard(this.scheduleDate,this.cat_id, this.sub_cat_id);
    } else if (this.cat_id === 'digital') {
      this.subCat = this.digitalCat;
    } else if (this.cat_id === 'meter') {
      this.subCat = this.meterCat;
    }
  }

  changeSubCat() {
    this.getScheduleDashboard(this.scheduleDate,this.cat_id, this.sub_cat_id);
  }

  getTicketDashboard(date: string) {
    this.presentLoading().then(preLoad => {
      this.httpCompalint.getTicketDashboard(date).subscribe({
        next:(data) => {
          if (data.status) {
            this.lineBarChart(data.data);
            this.helpDeskDateLabe =  moment(date).subtract(7 , 'days').format('DD MMM') + '-' + moment(date).format('DD MMM') ;
          }
        },
        error:() => {
          this.dismissloading();
          this.common.presentToast(environment.errMsg + ' In helpdesk-graph', 'danger');
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
      message: 'Please wait...',
    });
    await this.loading.present();
  }

  async dismissloading() {
    if (this.loading) {
      this.loading.dismiss();
    }
  }

  getScheduleDashboard(date: string,cat_id: string, sub_cat_id: string) {
    this.httpCompalint.getScheduleDashboard(date,cat_id, sub_cat_id).subscribe({
      next:(data) => {
        if (data.status) {
          this.scheduleDashboard = data.data;
          this.scheduleDateLabel =  moment(date).subtract(7 , 'days').format('DD MMM') + '-' + moment(date).format('DD MMM') ;
          this.stackedBarChart(data.data);
        }
      },
      error:() => {
        this.common.presentToast(environment.errMsg + ' Schedule Dashboard Error.', 'danger');
      }
    })
  }

  lineBarChart(data: any) {
    if (this.lineChart) {
      this.lineChart.destroy();
    }
    this.lineChart = new Chart('canvas1', {
      type: 'line',
      data : {
        labels: data.date,
        datasets: [{
          label: 'Assign',
          data: data.assigned,
          fill: false,
          borderColor: 'blue',
          backgroundColor: 'blue',
          tension: 0.4,
          borderJoinStyle: 'round',
        },{
          label: 'Resolve',
          data: data.resolved,
          fill: false,
          borderColor: 'orange',
          backgroundColor: 'orange',
          tension: 0.4,
          borderJoinStyle: 'round',
        }]
      },
      options: {
        indexAxis: 'x',
        elements: {
          bar: {
            borderWidth: 0.1,
          }
        },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Helpdesk',
          }
        }
      },
    })
  }


  stackedBarChart(data: any) {
    if (this.stackedChart) {
      this.stackedChart.destroy();
    }
    this.stackedChart = new Chart('canvas', {
      type: 'bar',
      data : {
        labels: data.date,
        datasets: [{
          label: 'Assign',
          data: data.assigned,
          backgroundColor: 'blue',
        },{
          label: 'Attend',
          data: data.attended,
          backgroundColor: 'orange',
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Reporting'
          },
        },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true
          }
        }
      }
    });
  }
}
