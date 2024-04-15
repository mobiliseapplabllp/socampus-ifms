import { Component, Input, OnInit } from '@angular/core';
import { ListMasterService } from 'src/app/provider/list-master/list-master.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent  implements OnInit {
  @Input() eventChange: any
  breakdown = '';
  pms = '';
  indent = '';
  meter = '';
  option = {
    slidesPerView:1.5,
    centeredSlides:true,
    loop: true,
    spaceBetween: 5,
    breakpoints: {
      320: {
        slidesPerView: 1.5,
      },
      480: {
        slidesPerView: 1.6,
      },
      530: {
        slidesPerView: 1.7,
      },
      640: {
        slidesPerView: 1.8,
      },
      700: {
        slidesPerView: 1.9,
      },
    }
   }
  constructor(
    private httpList: ListMasterService
  ) { }

  ngOnInit() {
    this.getDashboard();
  }

  ngOnChanges() {
    if (this.eventChange) {
      this.getDashboard();
    }
  }

  getDashboard() {
    this.httpList.getDashboard().subscribe(data => {
      if (data.status) {
        this.breakdown =  data.data.breakdown.assign.toString();
        this.pms = data.data.pms.assign.toString();
        this.indent = data.data.indent.assign.toString();
        this.meter = data.data?.meter?.assign.toString();
      }
    });
  }

}
