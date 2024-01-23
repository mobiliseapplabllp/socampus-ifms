import { Component, OnInit, ViewChild } from '@angular/core';
import { IonDatetime } from '@ionic/angular';
import { ComplaintService } from 'src/app/provider/complaint/complaint.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-chart-dashboard',
  templateUrl: './chart-dashboard.component.html',
  styleUrls: ['./chart-dashboard.component.scss'],
})
export class ChartDashboardComponent  implements OnInit {
  @ViewChild('popoverDatetime')  popoverDatetime!: IonDatetime;
  scheduleDashboard: any = [];
  cat_id = 1;
  stackedChart: any;
  category = [{
    label: 'Digital',
    id: 1
  },{
    label: 'PMS',
    id: 2
  },{
    label: 'Meter',
    id: 3
  }];
  digitalCat = [{
    label: 'Hard',
    id:1
  },{
    label: 'Soft',
    id:2
  }];
  meterCat = [{
    label: 'Consumption',
    id: 1,
  },{
    label: 'Generation',
    id: 2,
  }];
  subCat = this.digitalCat;
  sub_cat_id = 1;
  constructor(
    private httpCompalint: ComplaintService
  ) { }

  ngOnInit() {
    this.getTicketDashboard();
    this.getScheduleDashboard();
  }

  changeDateComponent(ev: any) {
    this.popoverDatetime.confirm(true);
  }

  changeCat(ev: any) {
    this.sub_cat_id = 0;
    this.subCat = [];
    if (ev.target.value === 1) {
      this.subCat = this.digitalCat;
    } else if (ev.target.value === 3) {
      this.subCat = this.meterCat;
    } else {
      this.updateStackedChart(this.scheduleDashboard.pms);
    }
  }

  changeSubCat(ev: any) {
    if (this.cat_id === 1) {
      if (ev.target.value === 1) {
        this.updateStackedChart(this.scheduleDashboard.digital.hard);
      } else if (ev.target.value === 2) {
        this.updateStackedChart(this.scheduleDashboard.digital.soft);
      }
    } else if (this.cat_id === 3) {
      if (ev.target.value === 1) {
        this.updateStackedChart(this.scheduleDashboard.meter.consumption);
      } else if (ev.target.value === 2) {
        this.updateStackedChart(this.scheduleDashboard.meter.generation);
      }
    }
  }

  getTicketDashboard() {
    this.httpCompalint.getTicketDashboard().subscribe({
      next:(data) => {
        this.lineBarChart(data);
      },
      error:() => {

      }
    })
  }

  getScheduleDashboard() {
    this.httpCompalint.getScheduleDashboard().subscribe({
      next:(data) => {
        this.scheduleDashboard = data;
        this.stackedBarChart(this.scheduleDashboard.label, this.scheduleDashboard.digital.hard);
      },
      error:() => {

      }
    })
  }

  lineBarChart(data: any) {
    new Chart('canvas1', {
      type: 'line',
      data : {
        labels: data.label,
        datasets: [{
          label: 'Assign',
          data: data.assign_ticket,
          fill: false,
          borderColor: 'blue',
          backgroundColor: 'blue',
          tension: 0.4,
          borderJoinStyle: 'round',
        },{
          label: 'Resolve',
          data: data.resolve_ticket,
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

  stackedBarChart(label: any, data: any) {
    this.stackedChart = new Chart('canvas', {
      type: 'bar',
      data : {
        labels: label,
        datasets: [{
          label: 'Assign',
          data: data.assign,
          backgroundColor: 'blue',
        },{
          label: 'Attend',
          data: data.attend,
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

  updateStackedChart(data: any) {
    this.stackedChart.data.datasets[0].data = data.assign;
    this.stackedChart.data.datasets[1].data = data.attend;
    this.stackedChart.update();
  }
}
