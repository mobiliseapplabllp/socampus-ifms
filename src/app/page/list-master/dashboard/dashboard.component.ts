import { Component, Input, OnInit } from '@angular/core';
import { CommonService } from 'src/app/provider/common/common.service';
import { ListMasterService } from 'src/app/provider/list-master/list-master.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent  implements OnInit {
  @Input() eventChange: any
  breakdown : any = {};
  pms: any = {};
  indent: any = {};
  meter: any = {};
  digital: any = {};
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
    private httpList: ListMasterService,
    private common: CommonService
  ) { }

  ngOnInit() {
    // this.getDashboard();
  }

  ngOnChanges() {
    if (this.eventChange) {
      this.common.checkInternet().then(res => {
        if (res) {
          this.getDashboard();
        } else {
          let temp: any = JSON.parse(localStorage.getItem('dashboard')!);
          this.breakdown = temp.breakdown;
          this.pms = temp.pms
          this.indent = temp.indent,
          this.meter = temp.meter,
          this.digital = temp.digital
        }
      });
    }
  }

  getDashboard() {
    this.httpList.getDashboard().subscribe(data => {
      if (data.status) {
        this.breakdown =  data.data?.breakdown || {};
        this.pms = data.data.pms || {};
        // this.indent = data.data.indent.assign.toString();
        this.meter = data.data?.meter || {}
        this.digital = data?.data?.dc || {}
        const obj = {
          breakdown: this.breakdown,
          pms: this.pms,
          indent: this.indent,
          meter: this.meter,
          digital: this.digital
        };
        localStorage.setItem('dashboard', JSON.stringify(obj));
      }
    });
  }

}
